import { fhirdefs, sushiImport, utils } from 'fsh-sushi';
import { getLatestVersionNumber, loadAsFHIRDefs, loadDependenciesInStorage, unzipDependencies } from './Load';
import { flatten } from 'lodash';

const logger = utils.logger;
const FHIRDefinitions = fhirdefs.FHIRDefinitions;
const FSHTank = sushiImport.FSHTank;
const importText = sushiImport.importText;

export function fillTank(rawFSHes, config) {
  logger.info('Importing FSH text...');
  const docs = importText(rawFSHes);
  return new FSHTank(docs, config);
}

export async function loadAndCleanDatabase(defs, dependencies) {
  dependencies = await resolveDependencies(dependencies);

  let helperUpdate = await checkForDatabaseUpgrade(dependencies);
  let loadExternalDependenciesReturn = { defs, emptyDependencies: [] };

  if (helperUpdate.shouldUpdate) {
    loadExternalDependenciesReturn = await loadExternalDependencies(defs, helperUpdate.version + 1, dependencies);
    defs = loadExternalDependenciesReturn.defs;
  } else {
    loadExternalDependenciesReturn = await loadExternalDependencies(defs, helperUpdate.version, dependencies);
    defs = loadExternalDependenciesReturn.defs;
  }

  // Cleans out database of any empty objectStores
  await cleanDatabase(loadExternalDependenciesReturn.emptyDependencies, helperUpdate.version + 2);
  return defs;
}

export function cleanDatabase(emptyDependencies, version, databaseName = 'FSH Playground Dependencies') {
  const mergedEmpties = flatten(emptyDependencies);
  return new Promise((resolve, reject) => {
    let database = null;
    const OpenIDBRequest = indexedDB.open(databaseName, version);
    OpenIDBRequest.onsuccess = function (event) {
      database = event.target.result;
      database.close();
      resolve();
    };
    OpenIDBRequest.onupgradeneeded = async function (event) {
      database = event.target.result;
      let existingObjectStores = database.objectStoreNames;

      // Checks existing objectStores to see if any are empty - failsafe for users who previously had blank objectStores created
      for (let objectStore of existingObjectStores) {
        await new Promise((resolve) => {
          let transaction = event.target.transaction;
          const objStore = transaction.objectStore(`${objectStore}`).getAll();
          objStore.onsuccess = (event) => {
            let items = event.target.result;
            if (items.length === 0 && !mergedEmpties.includes(objectStore)) {
              mergedEmpties.push(objectStore);
            }
            resolve();
          };
        });
      }
      // Deletes objectStores that are empty
      for (let i = 0; i < mergedEmpties.length; i++) {
        if (existingObjectStores.contains(mergedEmpties[i])) {
          database.deleteObjectStore(mergedEmpties[i]);
        }
      }
    };
    OpenIDBRequest.onerror = function (event) {
      reject(event);
    };
  });
}

export function checkForDatabaseUpgrade(dependencyArr, databaseName = 'FSH Playground Dependencies') {
  let helperReturn = { shouldUpdate: false, version: 1 };
  return new Promise((resolve, reject) => {
    let database = null;
    const OpenIDBRequest = indexedDB.open(databaseName);
    OpenIDBRequest.onsuccess = function (event) {
      database = event.target.result;
      let existingObjectStores = database.objectStoreNames;
      helperReturn.version = database.version;
      if (
        existingObjectStores.length === 0 ||
        dependencyArr.length === 0 ||
        existingObjectStores.contains('resources')
      ) {
        helperReturn.shouldUpdate = true;
        database.close();
        resolve(helperReturn);
      } else {
        for (let i = 0; i < dependencyArr.length; i++) {
          let dependency = dependencyArr[i][0];
          let id = dependencyArr[i][1];
          if (!existingObjectStores.contains(`${dependency}${id}`)) {
            helperReturn.shouldUpdate = true;
          }
        }
        database.close();
        resolve(helperReturn);
      }
    };
    OpenIDBRequest.onupgradeneeded = function (event) {
      database = event.target.result;
    };
    OpenIDBRequest.onerror = function (event) {
      reject(event);
    };
  });
}

export async function loadExternalDependencies(
  FHIRdefs,
  version,
  dependencyArr,
  databaseName = 'FSH Playground Dependencies',
  shouldUnzip = false
) {
  return new Promise((resolve, reject) => {
    let database = null;
    let newDependencies = [];
    let returnPackage = { defs: FHIRDefinitions, emptyDependencies: [] };
    const OpenIDBRequest = indexedDB.open(databaseName, version);

    // If successful the database exists
    OpenIDBRequest.onsuccess = async function (event) {
      database = event.target.result;
      for (let i = 0; i < dependencyArr.length; i++) {
        let resources = [];
        shouldUnzip = false;
        const dependency = dependencyArr[i][0];
        const id = dependencyArr[i][1];
        if (newDependencies.includes(`${dependency}${id}`)) {
          shouldUnzip = true;
        }
        if (shouldUnzip) {
          let unzipReturn = await unzipDependencies(resources, dependency, id);
          if (unzipReturn.emptyDependencies.length !== 0) {
            returnPackage.emptyDependencies.push(unzipReturn.emptyDependencies);
          }
          await loadDependenciesInStorage(database, unzipReturn.resourceArr, dependency, id);
        }
        returnPackage.defs = await loadAsFHIRDefs(FHIRdefs, database, dependency, id);
      }
      database.close();
      resolve(returnPackage);
    };

    // If upgrade is needed to the version, the database does not yet exist
    OpenIDBRequest.onupgradeneeded = function (event) {
      database = event.target.result;
      let existingObjectStores = database.objectStoreNames;
      if (existingObjectStores.contains('resources')) {
        database.deleteObjectStore('resources');
      }
      for (let i = 0; i < dependencyArr.length; i++) {
        const dependency = dependencyArr[i][0];
        const id = dependencyArr[i][1];
        if (!existingObjectStores.contains(`${dependency}${id}`)) {
          database.createObjectStore(`${dependency}${id}`, {
            keyPath: ['id', 'resourceType']
          });
          newDependencies.push(`${dependency}${id}`);
        }
      }
    };

    // Checks if there is an error
    OpenIDBRequest.onerror = function (event) {
      reject(event);
    };
  });
}

export async function resolveDependencies(dependencies) {
  // Replace any 'latest' versions with the latest version number
  const resolvedDependencies = await Promise.all(dependencies.map(async (dep) => replaceLatestVersion(dep[0], dep[1])));

  // Remove any dependencies that can't identify a latest version
  const filteredResolvedDependencies = resolvedDependencies.filter((d) => d[1] !== null);

  return filteredResolvedDependencies;
}

async function replaceLatestVersion(dependency, version) {
  let updatedVersion = version;
  if (version === 'latest') {
    await getLatestVersionNumber(dependency)
      .then((latestId) => {
        updatedVersion = latestId;
      })
      .catch(() => {
        // No 'latest' version could be found, so mark
        // this to be filtered out of the list to be loaded
        updatedVersion = null;
      });
  }
  return [dependency, updatedVersion];
}

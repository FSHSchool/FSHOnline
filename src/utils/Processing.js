import { logger } from 'fsh-sushi/dist/utils';
import { loadAsFHIRDefs, loadDependenciesInStorage, unzipDependencies } from './Load';
import { FHIRDefinitions } from 'fsh-sushi/dist/fhirdefs';
import { FSHTank, importText } from 'fsh-sushi/dist/import';

export function fillTank(rawFSHes, config) {
  logger.info('Importing FSH text...');
  const docs = importText(rawFSHes);
  return new FSHTank(docs, config);
}

export async function loadExternalDependencies(FHIRdefs, version) {
  return new Promise((resolve, reject) => {
    let database = null;
    let shouldUnzip = false;
    let finalDefs = FHIRDefinitions;
    const OpenIDBRequest = indexedDB.open('FSH Playground Dependencies', version);
    // If successful the database exists
    OpenIDBRequest.onsuccess = async function (event) {
      database = event.target.result;
      const resources = [];
      if (shouldUnzip) {
        await unzipDependencies(resources);
        await loadDependenciesInStorage(database, resources);
      }
      finalDefs = await loadAsFHIRDefs(FHIRdefs, database);
      resolve(finalDefs);
    };
    // If upgrade is needed to the version, the database does not yet exist
    OpenIDBRequest.onupgradeneeded = function (event) {
      shouldUnzip = true;
      database = event.target.result;
      database.createObjectStore('resources', {
        keyPath: ['id', 'resourceType']
      });
    };
    // Checks if there is an error
    OpenIDBRequest.onerror = function (event) {
      reject(event);
    };
  });
}

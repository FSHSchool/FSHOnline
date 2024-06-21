import { unzipDependencies, loadDependenciesInStorage, loadAsFHIRDefs, getLatestVersionNumber } from '../../utils/Load';
import { fhirdefs } from 'fsh-sushi';
import path from 'path';
import nock from 'nock';
import 'fake-indexeddb/auto';

const FHIRDefinitions = fhirdefs.FHIRDefinitions;

describe('#unzipDependencies', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('should make an http request and extract data from the resulting zip file', async () => {
    const scope = nock('http://packages.fhir.org')
      .get('/hl7.fhir.r4.core/4.0.1')
      .replyWithFile(200, path.join(__dirname, 'fixtures', 'hl7.fhir.r4.fake-4.0.1.tgz'), {
        'Content-Type': 'application/tar+gzip'
      });
    const resources = [];
    const results = await unzipDependencies(resources, 'hl7.fhir.r4.core', '4.0.1');
    expect(results).toBeDefined();
    expect(results.resourceArr).toHaveLength(2);
    expect(results.emptyDependencies).toHaveLength(0);
    expect(resources).toHaveLength(2);
    scope.done(); // will throw if the nocked URL was never requested
  });

  it('should add failed http requests (HTTP 404) to a list of emptyDependencies', async () => {
    const scope = nock('http://packages.fhir.org').get('/hello/123').reply(404, 'Not Found');
    const resources = [];
    const results = await unzipDependencies(resources, 'hello', '123');
    expect(results).toBeDefined();
    expect(results.resourceArr).toHaveLength(0);
    expect(results.emptyDependencies).toEqual(['hello123']);
    expect(resources).toHaveLength(0);
    scope.done(); // will throw if the nocked URL was never requested
  });

  it('should add failed http requests (error) to a list of emptyDependencies', async () => {
    const scope = nock('http://packages.fhir.org').get('/badcert/1').replyWithError('Certificate Error');
    const resources = [];
    const results = await unzipDependencies(resources, 'badcert', '1');
    expect(results).toBeDefined();
    expect(results.resourceArr).toHaveLength(0);
    expect(results.emptyDependencies).toEqual(['badcert1']);
    expect(resources).toHaveLength(0);
    scope.done(); // will throw if the nocked URL was never requested
  });
});

describe('#loadDependenciesInStorage', () => {
  it('should move the JSON resources into our created indexddb', async () => {
    const databaseReturn = await new Promise((resolve, reject) => {
      const resourcesTest = [
        { id: 1, resourceType: 'number' },
        { id: 2, resourceType: 'string' }
      ];
      let database = null;
      const OpenDB = indexedDB.open('Test Database');
      OpenDB.onupgradeneeded = (event) => {
        database = event.target.result;
        database.createObjectStore('testDependency1.0.0', { keyPath: ['id', 'resourceType'] });
      };
      OpenDB.onsuccess = async (event) => {
        database = event.target.result;
        await loadDependenciesInStorage(database, resourcesTest, 'testDependency', '1.0.0');
        const databaseValue = await database
          .transaction(['testDependency1.0.0'], 'readonly')
          .objectStore('testDependency1.0.0', { keyPath: ['id', 'resourceType'] })
          .getAll();
        databaseValue.onsuccess = () => {
          resolve(databaseValue.result);
        };
      };
      OpenDB.onerror = () => {
        reject();
      };
    });
    expect(databaseReturn).toHaveLength(2);
    expect(databaseReturn[0]).toEqual({ id: 1, resourceType: 'number' });
  });
});

describe('#loadAsFHIRDefs', () => {
  it('should take data from the database and translate them to FHIRDefs', async () => {
    const databaseReturn = await new Promise((resolve, reject) => {
      const resourcesTest = [
        { resourceType: 'ValueSet', id: 'contract-assettype' },
        { resourceType: 'CodeSystem', id: 'v2-0527' }
      ];
      const FHIRdefs = new FHIRDefinitions();
      let finalDefs = FHIRDefinitions;
      let database = null;
      const OpenDB = indexedDB.open('Test Database');
      OpenDB.onupgradeneeded = (event) => {
        database = event.target.result;
        database.createObjectStore('testDependency1.0.0', { keyPath: ['id', 'resourceType'] });
      };
      OpenDB.onsuccess = async (event) => {
        database = event.target.result;
        await loadDependenciesInStorage(database, resourcesTest, 'testDependency', '1.0.0');
        finalDefs = await loadAsFHIRDefs(FHIRdefs, database, 'testDependency', '1.0.0');
        resolve(finalDefs);
      };
      OpenDB.onerror = () => {
        reject();
      };
    });
    expect(databaseReturn.allValueSets()).toHaveLength(1);
    expect(databaseReturn.allCodeSystems()).toHaveLength(1);
    expect(databaseReturn.allExtensions()).toHaveLength(0);
  });
});

describe('#getLatestVersionNumber', () => {
  it('should resolve with an id when latest tag is available', async () => {
    nock('http://packages.fhir.org')
      .get('/example.mock.package')
      .reply(200, {
        name: 'example.mock.package',
        'dist-tags': {
          latest: '1.0.0'
        }
      });
    const latestVersion = await getLatestVersionNumber({ packageId: 'example.mock.package', version: 'latest' });
    expect(latestVersion).toEqual('1.0.0');
  });

  it('should reject when no latest tag is available', async () => {
    nock('http://packages.fhir.org')
      .get('/example.mock.without.version')
      .reply(200, {
        name: 'example.mock.without.version',
        'dist-tags': {
          // no latest
          beta: '1.0.0-rc'
        }
      });
    const latestVersion = getLatestVersionNumber({ packageId: 'example.mock.without.version', version: 'latest' });
    await expect(latestVersion).rejects.toEqual('no latest version found');
  });
});

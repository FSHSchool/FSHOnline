import { pad, padStart, padEnd } from 'lodash';
import { fhirdefs, sushiExport, sushiImport, utils } from 'fsh-sushi';
import { gofshExport, processor, utils as gofshUtils } from 'gofsh';
import { BrowserBasedPackageCache, FHIRRegistryClient, SQLJSPackageDB } from 'fhir-package-loader';
import initSqlJs from 'sql.js';
import workletURL from 'sql.js/dist/sql-wasm.wasm?url';
import { fshOnlineLogger as logger, setCurrentLogger } from './logger';

const { FSHTank, RawFSH } = sushiImport;
const { exportFHIR } = sushiExport;
const { createFHIRDefinitions, FHIRDefinitions } = fhirdefs;
const {
  AUTOMATIC_DEPENDENCIES,
  fillTank,
  getFHIRVersionInfo,
  getRandomPun,
  loadExternalDependencies: loadExternalDependenciesSUSHI,
  stats: sushiStats,
  Type
} = utils;
const { loadExternalDependencies: loadExternalDependenciesGoFSH, stats: gofshStats } = gofshUtils;

/**
 * Run GoFSH
 * Note: This function is very similar to FhirToFsh in GoFSH.
 * The only difference is that FSH Online must load dependencies into IndexedDB.
 * If FhirToFsh ever supports a way to load dependencies in the browser,
 * we can update this to simply use that function.
 * @param {array} input array of JSON definitions to be processed
 * @param {object} options config options for GoFSH based on user input and defaults
 * dependencies: user set, defaults to []
 * indent: user set, defaults to false
 * @returns {string} the FSH
 */
export async function runGoFSH(input, options, loggerLevel) {
  gofshStats.reset();
  setCurrentLogger('gofsh', loggerLevel);

  // Read in the resources as strings
  const docs = [];
  input.forEach((resource, i) => {
    const location = `Input_${i}`;
    try {
      resource = JSON.parse(resource);
      if (!resource.resourceType) {
        logger.error(`FHIR JSON ${resource.id ?? location} is missing the required "resourceType" property`);
      }
    } catch {
      logger.error(`Could not parse ${location} to JSON`);
      return;
    }
    if (gofshUtils.isProcessableContent(resource, location)) {
      docs.push(new processor.WildFHIR({ content: resource }, location));
    }
  });

  // Initialize sql.js for the browser
  await initSqlJs({ locateFile: () => workletURL });
  const lake = new processor.LakeOfFHIR(docs);
  await lake.prepareDefs();
  const configuration = await getGoFSHConfiguration(lake, options.dependencies);
  const defs = await getFSHOnlineFHIRDefs(configuration.config.dependencies, configuration, false);
  const fisher = new gofshUtils.MasterFisher(lake, defs);
  const fhirProcessor = new processor.FHIRProcessor(lake, fisher);

  // Process the FHIR to rules, and then export to FSH
  const pkg = await gofshUtils.getResources(fhirProcessor, configuration, { indent: options.indent });

  // Return the string of FSH definitions
  const fsh = new gofshExport.FSHExporter(pkg).apiExport('string');
  logger.info('Done converting definitions');
  printGoFSHresults(pkg);
  return { fsh, config: configuration?.config ?? {} };
}

/**
 * Load dependencies (FHIR R4) and run SUSHI on provided text
 *
 * @param {string} input - string containing FSH text
 * @param {object} config - Configuration for SUSHI based on user input and defaults
 * config.canonical: user set, defaults to http://example.org
 * config.version: user set, defaults to 1.0.0
 * config.FSHOnly: true
 * config.fhirVersion: [4.0.1] - NOTE fhirVersion array will only have one item in it
 *
 * @returns Package with FHIR resources
 */
export async function runSUSHI(input, config, dependencies = [], loggerLevel) {
  sushiStats.reset();
  setCurrentLogger('sushi', loggerLevel);

  // Initialize sql.js for the browser
  await initSqlJs({ locateFile: () => workletURL });
  const defs = await getFSHOnlineFHIRDefs(dependencies, config, true);

  // Load and fill FSH Tank
  let tank = FSHTank;
  try {
    const rawFSH = [new RawFSH(input)];
    tank = fillTank(rawFSH, config);
  } catch {
    logger.error('Something went wrong when importing the FSH definitions');
    return;
  }

  // Check for StructureDefinition
  const structDef = defs.fishForFHIR('StructureDefinition', Type.Resource);
  if (structDef?.version !== config.fhirVersion[0]) {
    logger.error(
      'StructureDefinition resource not found. The FHIR package in the browser cache' +
        ' may be corrupt. Clear cookies and site data on this webpage to reload the FHIR package.'
    );
    return;
  }

  logger.info('Converting FSH to FHIR resources...');
  const outPackage = exportFHIR(tank, defs);

  const count =
    outPackage.profiles.length +
    outPackage.extensions.length +
    outPackage.logicals.length +
    outPackage.resources.length +
    // Don't count the inline instances that won't have their own JSON output
    // but do include them in the SUSHI Results box (so don't filter out of outPackage here)
    outPackage.instances.filter((i) => i._instanceMeta.usage !== 'Inline').length +
    outPackage.valueSets.length +
    outPackage.codeSystems.length;

  logger.info(`Exported ${count} FHIR resources as JSON.`);

  console.log(' ');
  printSUSHIResults(outPackage);

  // Remove snapshots
  outPackage.profiles = outPackage.profiles.map((p) => p.toJSON(false));
  outPackage.extensions = outPackage.extensions.map((e) => e.toJSON(false));
  outPackage.logicals = outPackage.logicals.map((l) => l.toJSON(false));
  outPackage.resources = outPackage.resources.map((r) => r.toJSON(false));

  // Filter out inline instances
  outPackage.instances = outPackage.instances.filter((i) => i._instanceMeta.usage !== 'Inline');

  return outPackage;
}

function printSUSHIResults(pkg) {
  const numError = sushiStats.numError;
  const numWarn = sushiStats.numWarn;
  // NOTE: These variables are creatively names to align well in the strings below while keeping prettier happy
  const profileNum = pad(pkg.profiles.length.toString(), 13);
  const extentNum = pad(pkg.extensions.length.toString(), 12);
  const logiclNum = pad(pkg.logicals.length.toString(), 12);
  const resourcNum = pad(pkg.resources.length.toString(), 13);
  const valueSetsNumber = pad(pkg.valueSets.length.toString(), 18);
  const codeSystemsNum = pad(pkg.codeSystems.length.toString(), 17);
  const instancesNumber = pad(pkg.instances.length.toString(), 18);
  const errorNumMsg = pad(`${numError} Error${numError !== 1 ? 's' : ''}`, 13);
  const wrNumMsg = padStart(`${numWarn} Warning${numWarn !== 1 ? 's' : ''}`, 12);

  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(numError, numWarn), 36);
  const color = numError > 0 ? 'red' : numWarn > 0 ? '#b36200' : 'green'; // eslint-disable-line no-unused-vars

  // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
  const results = [
    '╔' + '════════════════════════ SUSHI RESULTS ══════════════════════════' + '╗',
    '║' + ' ╭───────────────┬──────────────┬──────────────┬───────────────╮ ' + '║',
    '║' + ' │    Profiles   │  Extensions  │   Logicals   │   Resources   │ ' + '║',
    '║' + ' ├───────────────┼──────────────┼──────────────┼───────────────┤ ' + '║',
    '║' + ` │ ${profileNum} │ ${extentNum} │ ${logiclNum} │ ${resourcNum} │ ` + '║',
    '║' + ' ╰───────────────┴──────────────┴──────────────┴───────────────╯ ' + '║',
    '║' + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + '║',
    '║' + ' │      ValueSets     │    CodeSystems    │     Instances      │ ' + '║',
    '║' + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + '║',
    '║' + ` │ ${valueSetsNumber} │ ${codeSystemsNum} │ ${instancesNumber} │ ` + '║',
    '║' + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + '║',
    '║' + '                                                                 ' + '║',
    '╠' + '═════════════════════════════════════════════════════════════════' + '╣',
    '║' + ` ${aWittyMessageInvolvingABadFishPun} ${errorNumMsg} ${wrNumMsg} ` + '║',
    '╚' + '═════════════════════════════════════════════════════════════════' + '╝'
  ];
  results.forEach((r) => console.log(r));
  // results.forEach((r) => console.log(`%c${r}`, `color:${clr}`)); // Color formatting for browser console
}

function printGoFSHresults(pkg) {
  const proNum = pad(pkg.profiles.length.toString(), 18);
  const extNum = pad(pkg.extensions.length.toString(), 17);
  const logNum = pad(pkg.logicals.length.toString(), 18);
  const resNum = pad(pkg.resources.length.toString(), 18);
  const vsNum = pad(pkg.valueSets.length.toString(), 17);
  const csNum = pad(pkg.codeSystems.length.toString(), 18);
  const instNum = pad(pkg.instances.length.toString(), 18);
  const invNum = pad(pkg.invariants.length.toString(), 17);
  const mapNum = pad(pkg.mappings.length.toString(), 18);
  const errNumMsg = pad(`${gofshStats.numError} Error${gofshStats.numError !== 1 ? 's' : ''}`, 12);
  const wrnNumMsg = padStart(`${gofshStats.numWarn} Warning${gofshStats.numWarn !== 1 ? 's' : ''}`, 12);
  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(gofshStats.numError, gofshStats.numWarn), 37);

  // prettier-ignore
  const results = [
    '╔' + '═════════════════════════ GoFSH RESULTS ═════════════════════════' + '╗',
    '║' + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + '║',
    '║' + ' │      Profiles      │    Extensions     │      Logicals      │ ' + '║',
    '║' + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + '║',
    '║' + ` │ ${    proNum     } │ ${    extNum    } │ ${    logNum     } │ ` + '║',
    '║' + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + '║',
    '║' + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + '║',
    '║' + ' │     Resources      │     ValueSets     │     CodeSystems    │ ' + '║',
    '║' + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + '║',
    '║' + ` │ ${    resNum     } │ ${    vsNum     } │ ${     csNum     } │ ` + '║',
    '║' + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + '║',
    '║' + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + '║',
    '║' + ' │     Instances      │    Invariants     │      Mappings      │ ' + '║',
    '║' + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + '║',
    '║' + ` │ ${    instNum    } │ ${    invNum    } │ ${    mapNum     } │ ` + '║',
    '║' + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + '║',
    '║' + '                                                                 ' + '║',
    '╠' + '═════════════════════════════════════════════════════════════════' + '╣',
    '║' + ` ${aWittyMessageInvolvingABadFishPun } ${errNumMsg} ${wrnNumMsg} ` + '║',
    '╚' + '═════════════════════════════════════════════════════════════════' + '╝'
  ];

  console.log(' ');
  results.forEach((r) => console.log(r));
}

async function getFSHOnlineFHIRDefs(dependencies, config, isSUSHI) {
  const log = (level, message) => {
    logger.log(level, message);
  };
  const registryClient = new FHIRRegistryClient('https://packages.fhir.org', { log, isBrowserEnvironment: true });
  const allDependencies = await getAllDependencies(
    isSUSHI ? dependencies : (config.config.dependencies ?? []),
    isSUSHI ? config.fhirVersion[0] : config.config.fhirVersion[0],
    registryClient
  );
  const formattedDependencies = allDependencies.map((d) => ({
    name: d.packageId,
    version: d.version
  }));
  const packageDB = new SQLJSPackageDB();
  await packageDB.initialize();
  const packageCache = new BrowserBasedPackageCache('FSHOnline Dependencies', { log });
  await packageCache.initialize(formattedDependencies);
  const defs = await createFHIRDefinitions(false, null, { packageCache, packageDB, registryClient, options: { log } });
  if (isSUSHI) {
    config.dependencies = dependencies.filter(hasVersion);
    await loadExternalDependenciesSUSHI(defs, config);
  } else {
    if (config.config.dependencies != null) {
      config.config.dependencies = config.config.dependencies.filter(hasVersion);
    }
    await loadExternalDependenciesGoFSH(defs, config);
  }
  defs.optimize();
  return defs;
}

async function getGoFSHConfiguration(lake, dependencies) {
  // Set up a temporary FHIRProcessor to get any dependencies from an IG resource
  const defs = new FHIRDefinitions();
  await defs.initialize();
  const fisher = new gofshUtils.MasterFisher(lake, defs);
  const fhirProcessor = new processor.FHIRProcessor(lake, fisher);

  // Process the configuration
  const goFSHDependencies = dependencies.map((d) => d.replace('#', '@')); // GoFSH expects a different format
  const configuration = fhirProcessor.processConfig(goFSHDependencies ?? []); // The created IG files includes the user specified FHIR Version

  return configuration;
}

async function getAllDependencies(configuredDependencies, coreFHIRVersion, registryClient) {
  const allDependencies = [];
  for (const dep of configuredDependencies) {
    const { packageId } = dep;
    const version = await registryClient.resolveVersion(packageId, dep.version);
    allDependencies.push({ packageId, version });
  }
  const fhirVersionInfo = getFHIRVersionInfo(coreFHIRVersion);
  const coreFHIRPackage = { packageId: fhirVersionInfo.packageId, version: coreFHIRVersion };
  if (!hasDependency(allDependencies, coreFHIRPackage)) {
    allDependencies.push(coreFHIRPackage);
  }
  // FSH Online doesn't support current packages yet
  const filteredAutomaticDependencies = AUTOMATIC_DEPENDENCIES.filter((dep) => dep.version !== 'current');
  for (const dep of filteredAutomaticDependencies) {
    if (dep.fhirVersions && !dep.fhirVersions.includes(fhirVersionInfo.name)) {
      continue;
    }
    const { packageId } = dep;
    const version = await registryClient.resolveVersion(packageId, dep.version);
    if (!hasDependency(allDependencies, dep)) {
      allDependencies.push({ packageId, version });
    }
  }
  return allDependencies;
}

function hasVersion(dependency) {
  if (dependency.version == null) {
    logger.warn(
      `Skipping ${dependency.packageId} because it does not include a version. Use format packageId#version.`
    );
  }
  return dependency.version != null;
}

function hasDependency(dependenciesList, currentDependency, ignoreVersion = false) {
  return dependenciesList.some(
    (dep) =>
      dep.packageId === currentDependency.packageId && (ignoreVersion || dep.version === currentDependency.version)
  );
}

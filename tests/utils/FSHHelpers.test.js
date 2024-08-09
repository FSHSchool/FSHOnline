import { runSUSHI, runGoFSH, getCoreFHIRPackageIdentifier } from '../../src/utils/FSHHelpers';
import * as processing from '../../src/utils/Processing';
import Patient from './fixtures/StructureDefinition-Patient.json';
import StructureDefinition from './fixtures/StructureDefinition-StructureDefinition.json';
import Quantity from './fixtures/StructureDefinition-Quantity.json';
import 'fake-indexeddb/auto';
import { EOL } from 'os';

const defaultConfig = {
  canonical: 'http://example.org',
  version: '1.0.0',
  FSHOnly: true,
  fhirVersion: ['4.0.1']
};

describe('#runSUSHI', () => {
  it('should return an undefined package when we get invalid FHIRDefinitions', async () => {
    const dependencies = [];
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Don't add any FHIR definitions to defs
        return Promise.resolve(defs);
      });
    const text =
      'Profile: FishPatient Parent: Patient Id: fish-patient Title: "Fish Patient" Description: "A patient that is a type of fish."';
    const outPackage = await runSUSHI(text, defaultConfig, dependencies);
    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outPackage).toBeUndefined();
  });

  it('should return the correct output package when proper FSH code is entered', async () => {
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        return Promise.resolve(defs);
      });
    const text =
      'Profile: FishPatient\nParent: Patient\nId: fish-patient\nTitle: "Fish Patient"\n Description: "A patient that is a type of fish."';
    const outPackage = await runSUSHI(text, defaultConfig);
    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outPackage.profiles).toHaveLength(1);
  });

  it('should not return inline instances in the output package', async () => {
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        defs.add(Quantity);
        return Promise.resolve(defs);
      });
    const text =
      'Instance: ZeroScore\nInstanceOf: Quantity\nUsage: #inline\n* value = 0\n* code = #{score}\n* system = "http://unitsofmeasure.org"\n* unit = "Punktwert"' +
      '\n\nInstance: JohnDoe\nInstanceOf: Patient\n* name.given = "John"\n* name.family = "Doe"';
    const outPackage = await runSUSHI(text, defaultConfig);
    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outPackage.instances).toHaveLength(1);
  });

  it('should return an empty package when fillTank does not execute properly', async () => {
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        return Promise.resolve(defs);
      });
    const fillTankSpy = vi
      .spyOn(processing, 'fillTank')
      .mockReset()
      .mockImplementation(() => {
        throw new Error('Failed to fill tank');
      });
    const input = 'Improper FSH code!';
    const outPackage = await runSUSHI(input, defaultConfig);
    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(fillTankSpy).toHaveBeenCalled();
    expect(outPackage).toBeUndefined();
  });
});

describe('#runGoFSH', () => {
  const patientDef = {
    resourceType: 'Patient',
    id: 'MyPatient',
    name: [
      {
        family: 'Smith',
        given: ['Jane']
      }
    ],
    gender: 'female'
  };
  const goFSHDefs = [JSON.stringify(patientDef)];

  it('should return a FSH definition without rules when we load invalid FHIRDefinitions', async () => {
    const dependencies = [];
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Don't add any FHIR definitions to defs
        return Promise.resolve(defs);
      });
    const expectedFSH = ['Instance: MyPatient', 'InstanceOf: Patient', 'Usage: #example'].join(EOL);
    const expectedConfig = {
      FSHOnly: true,
      applyExtensionMetadataToRoot: false,
      canonical: 'http://example.org',
      fhirVersion: ['4.0.1'],
      id: 'example',
      name: 'Example'
    };
    const outputFSH = await runGoFSH(goFSHDefs, { dependencies });
    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outputFSH).toEqual({ fsh: expectedFSH, config: expectedConfig });
  });

  it('should return a string of FSH when proper JSON is entered and there are valid FHIRDefinitions', async () => {
    const dependencies = [];
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        return Promise.resolve(defs);
      });

    const expectedFSH = [
      'Instance: MyPatient',
      'InstanceOf: Patient',
      'Usage: #example',
      '* name.family = "Smith"',
      '* name.given = "Jane"',
      '* gender = #female'
    ].join(EOL);
    const expectedConfig = {
      FSHOnly: true,
      applyExtensionMetadataToRoot: false,
      canonical: 'http://example.org',
      fhirVersion: ['4.0.1'],
      id: 'example',
      name: 'Example'
    };

    const outputFSH = await runGoFSH(goFSHDefs, { dependencies });

    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outputFSH).toEqual({ fsh: expectedFSH, config: expectedConfig });
  });

  it('should return indented FSH when the indent option is true', async () => {
    const patientWithExtensionDef = {
      resourceType: 'Patient',
      id: 'MyPatient',
      name: [
        {
          given: ['Jane'],
          family: 'Smith',
          _family: {
            extension: [
              {
                url: 'http://example.org/StructureDefinition/family-extension',
                valueString: 'Extension value'
              }
            ]
          }
        }
      ]
    };
    const dependencies = [];
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        return Promise.resolve(defs);
      });

    const expectedFSH = [
      'Instance: MyPatient',
      'InstanceOf: Patient',
      'Usage: #example',
      '* name',
      '  * given = "Jane"',
      '  * family = "Smith"',
      '    * extension',
      '      * url = "http://example.org/StructureDefinition/family-extension"',
      '      * valueString = "Extension value"'
    ].join(EOL);
    const expectedConfig = {
      FSHOnly: true,
      applyExtensionMetadataToRoot: false,
      canonical: 'http://example.org',
      fhirVersion: ['4.0.1'],
      id: 'example',
      name: 'Example'
    };

    const outputFSH = await runGoFSH([JSON.stringify(patientWithExtensionDef)], { dependencies, indent: true });

    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outputFSH).toEqual({ fsh: expectedFSH, config: expectedConfig });
  });

  it('should return unindented FSH when the indent option is false', async () => {
    const patientWithExtensionDef = {
      resourceType: 'Patient',
      id: 'MyPatient',
      name: [
        {
          given: ['Jane'],
          family: 'Smith',
          _family: {
            extension: [
              {
                url: 'http://example.org/StructureDefinition/family-extension',
                valueString: 'Extension value'
              }
            ]
          }
        }
      ]
    };
    const dependencies = [];
    const loadAndCleanDBSpy = vi
      .spyOn(processing, 'loadAndCleanDatabase')
      .mockReset()
      .mockImplementation((defs) => {
        // Add necessary FHIR definitions to defs
        defs.add(Patient);
        defs.add(StructureDefinition);
        return Promise.resolve(defs);
      });

    const expectedFSH = [
      'Instance: MyPatient',
      'InstanceOf: Patient',
      'Usage: #example',
      '* name.given = "Jane"',
      '* name.family = "Smith"',
      '* name.family.extension.url = "http://example.org/StructureDefinition/family-extension"',
      '* name.family.extension.valueString = "Extension value"'
    ].join(EOL);
    const expectedConfig = {
      FSHOnly: true,
      applyExtensionMetadataToRoot: false,
      canonical: 'http://example.org',
      fhirVersion: ['4.0.1'],
      id: 'example',
      name: 'Example'
    };

    const outputFSH = await runGoFSH([JSON.stringify(patientWithExtensionDef)], { dependencies, indent: false });

    expect(loadAndCleanDBSpy).toHaveBeenCalled();
    expect(outputFSH).toEqual({ fsh: expectedFSH, config: expectedConfig });
  });
});

describe('getCoreFHIRPackageIdentifier', () => {
  it('should recognize FHIR R4 version', () => {
    const packageId = getCoreFHIRPackageIdentifier('4.0.1');
    expect(packageId).toBe('hl7.fhir.r4.core');
  });

  it('should recognize FHIR R4B version', () => {
    const packageId = getCoreFHIRPackageIdentifier('4.3.0');
    expect(packageId).toBe('hl7.fhir.r4b.core');
  });

  it('should recognize FHIR R5 version', () => {
    const packageId = getCoreFHIRPackageIdentifier('5.0.0');
    expect(packageId).toBe('hl7.fhir.r5.core');
  });
});

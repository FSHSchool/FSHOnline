import React from 'react';
import 'fake-indexeddb/auto';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { render, waitFor, fireEvent } from '@testing-library/react';
import FSHControls from '../../src/components/FSHControls';
import * as fshHelpers from '../../src/utils/FSHHelpers';

const badSUSHIPackage = { a: '1', b: '2' };
const emptySUSHIPackage = {
  config: {},
  profiles: [],
  extensions: [],
  logicals: [],
  resources: [],
  instances: [],
  valueSets: [],
  codeSystems: []
};
const goodSUSHIPackage = {
  profiles: [{ resourceType: 'StructureDefinition', id: 'fish-patient' }],
  extensions: [],
  logicals: [],
  resources: [],
  instances: [],
  valueSets: [],
  codeSystems: []
};

let container = null;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.spyOn(window, 'fetch');
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it('calls runSUSHI and changes the doRunSUSHI variable onClick, exhibits a bad package', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(badSUSHIPackage);

  act(() => {
    render(<FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />, container);
  });
  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runSUSHISpy).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(true, [''], true); // Loading
    expect(onClick).toHaveBeenCalledWith(true, [''], false);
  });
});

it('calls runSUSHI and changes the doRunSUSHI variable onClick, exhibits an empty package', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(emptySUSHIPackage);

  act(() => {
    render(<FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />, container);
  });
  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runSUSHISpy).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(true, [''], true); // Loading
    expect(onClick).toHaveBeenCalledWith(true, [''], false);
  });
});

it('calls runSUSHI and changes the doRunSUSHI variable onClick, exhibits a good package', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(goodSUSHIPackage);

  act(() => {
    render(<FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />, container);
  });
  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runSUSHISpy).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(true, [''], true); // Loading
    expect(onClick).toHaveBeenCalledWith(true, JSON.stringify(goodSUSHIPackage, null, 2), false);
  });
});

it('calls GoFSH function and returns FSH', async () => {
  const examplePatient = {
    resourceType: 'Patient',
    id: 'MyPatient',
    gender: 'female'
  };
  const simpleFsh = ['Instance: MyPatient', 'InstanceOf: Patient', 'Usage: #example', '* gender = #female'].join('\n');
  const onGoFSHClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runGoFSHSpy = vi.spyOn(fshHelpers, 'runGoFSH').mockReset().mockResolvedValue({ fsh: simpleFsh, config: {} });

  act(() => {
    render(
      <FSHControls
        onGoFSHClick={onGoFSHClick}
        gofshText={[{ def: JSON.stringify(examplePatient, null, 2) }]}
        resetLogMessages={resetLogMessages}
        exampleConfig={[]}
      />,
      container
    );
  });
  const button = document.querySelector('[testid=GoFSH-button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runGoFSHSpy).toHaveBeenCalledWith([JSON.stringify(examplePatient, null, 2)], {
      dependencies: [],
      indent: false
    }); // No IG resource added because canonical and version set to defaults
    expect(onGoFSHClick).toHaveBeenCalledTimes(2);
    expect(onGoFSHClick).toHaveBeenCalledWith('', true); // Loading
    expect(onGoFSHClick).toHaveBeenCalledWith(simpleFsh, false);
  });
});

it('calls GoFSH with user provided canonical and version in mini ImplementationGuide resource if either are set', async () => {
  const examplePatient = {
    resourceType: 'Patient',
    id: 'MyPatient',
    gender: 'female'
  };
  const simpleFsh = ['Instance: MyPatient', 'InstanceOf: Patient', 'Usage: #example', '* gender = #female'].join('\n');
  const onGoFSHClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runGoFSHSpy = vi.spyOn(fshHelpers, 'runGoFSH').mockReset().mockResolvedValue({ fsh: simpleFsh, config: {} });
  const { getByRole, getByLabelText } = render(
    <FSHControls
      onGoFSHClick={onGoFSHClick}
      gofshText={[{ def: JSON.stringify(examplePatient, null, 2) }]}
      resetLogMessages={resetLogMessages}
      exampleConfig={[]}
    />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const canonicalInput = getByLabelText('Canonical URL');
  expect(canonicalInput.value).toEqual(''); // Default
  fireEvent.change(canonicalInput, { target: { value: 'http://other.org' } });
  const versionInput = getByLabelText('Version');
  expect(versionInput.value).toEqual(''); // Default
  fireEvent.change(versionInput, { target: { value: '2.0.0' } });

  const button = document.querySelector('[testid=GoFSH-button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const expectedIgResource = {
    resourceType: 'ImplementationGuide',
    fhirVersion: ['4.0.1'],
    id: '1',
    url: 'http://other.org/ImplementationGuide/1',
    version: '2.0.0'
  };

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runGoFSHSpy).toHaveBeenCalledWith(
      [JSON.stringify(examplePatient, null, 2), JSON.stringify(expectedIgResource, null, 2)], // Adds IG resource with canonical and version
      { dependencies: [], indent: false }
    );
    expect(onGoFSHClick).toHaveBeenCalledTimes(2);
    expect(onGoFSHClick).toHaveBeenCalledWith('', true); // Loading
    expect(onGoFSHClick).toHaveBeenCalledWith(simpleFsh, false);
  });
});

it('calls GoFSH with the indent option if the configuration checkbox is checked', async () => {
  const examplePatient = {
    resourceType: 'Patient',
    id: 'MyPatient',
    gender: 'female'
  };
  const simpleFsh = ['Instance: MyPatient', 'InstanceOf: Patient', 'Usage: #example', '* gender = #female'].join('\n');
  const onGoFSHClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runGoFSHSpy = vi.spyOn(fshHelpers, 'runGoFSH').mockReset().mockResolvedValue({ fsh: simpleFsh, config: {} });
  const { getByRole, getByLabelText } = render(
    <FSHControls
      onGoFSHClick={onGoFSHClick}
      gofshText={[{ def: JSON.stringify(examplePatient, null, 2) }]}
      resetLogMessages={resetLogMessages}
      exampleConfig={[]}
    />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const indentCheckbox = getByLabelText('Indent output of Convert to FSH');
  expect(indentCheckbox).not.toBeChecked();
  fireEvent.click(indentCheckbox);
  const button = document.querySelector('[testid=GoFSH-button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(resetLogMessages).toHaveBeenCalledTimes(1);
    expect(runGoFSHSpy).toHaveBeenCalledWith([JSON.stringify(examplePatient, null, 2)], {
      dependencies: [],
      indent: true
    }); // No IG resource added because canonical and version set to defaults
    expect(onGoFSHClick).toHaveBeenCalledTimes(2);
    expect(onGoFSHClick).toHaveBeenCalledWith('', true); // Loading
    expect(onGoFSHClick).toHaveBeenCalledWith(simpleFsh, false);
  });
});

it('displays code with line wrapping in the code editors if the configuration checkbox is checked', async () => {
  const examplePatient = {
    resourceType: 'Patient',
    id: 'MyPatient',
    gender: 'female'
  };
  const onGoFSHClick = vi.fn();
  const resetLogMessages = vi.fn();
  let wrapped = false;
  const setIsLineWrapped = vi.fn(() => {
    wrapped = !wrapped;
  });
  const { getByRole, getByLabelText, rerender } = render(
    <FSHControls
      onGoFSHClick={onGoFSHClick}
      gofshText={[{ def: JSON.stringify(examplePatient, null, 2) }]}
      resetLogMessages={resetLogMessages}
      exampleConfig={[]}
      setIsLineWrapped={setIsLineWrapped}
      isLineWrapped={wrapped}
    />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const isLineWrappedCheckbox = getByLabelText('Line wrap within code editors');
  expect(isLineWrappedCheckbox).not.toBeChecked();
  fireEvent.click(isLineWrappedCheckbox);
  rerender(
    <FSHControls
      onGoFSHClick={onGoFSHClick}
      gofshText={[{ def: JSON.stringify(examplePatient, null, 2) }]}
      resetLogMessages={resetLogMessages}
      exampleConfig={[]}
      setIsLineWrapped={setIsLineWrapped}
      isLineWrapped={wrapped}
    />,
    container
  );
  expect(isLineWrappedCheckbox).toBeChecked();
});

it('uses user provided canonical when calling runSUSHI', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(goodSUSHIPackage);

  const { getByRole, getByLabelText } = render(
    <FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const canonicalInput = getByLabelText('Canonical URL');
  expect(canonicalInput.value).toEqual(''); // Default

  fireEvent.change(canonicalInput, { target: { value: 'http://other.org' } });

  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const expectedConfig = {
    canonical: 'http://other.org',
    version: '1.0.0',
    FSHOnly: true,
    fhirVersion: ['4.0.1']
  };
  await waitFor(() => {
    expect(runSUSHISpy).toHaveBeenCalledWith(undefined, expectedConfig, []); // Includes new config
  });
});

it('uses user provided version when calling runSUSHI', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(goodSUSHIPackage);

  const { getByRole, getByLabelText } = render(
    <FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const versionInput = getByLabelText('Version');
  expect(versionInput.value).toEqual(''); // Default

  fireEvent.change(versionInput, { target: { value: '2.0.0' } });

  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const expectedConfig = {
    canonical: 'http://example.org',
    version: '2.0.0',
    FSHOnly: true,
    fhirVersion: ['4.0.1']
  };

  await waitFor(() => {
    expect(runSUSHISpy).toHaveBeenCalledWith(undefined, expectedConfig, []); // Includes new version
  });
});

it('uses user provided dependencies when calling runSUSHI', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(goodSUSHIPackage);

  const { getByRole, getByLabelText } = render(
    <FSHControls onSUSHIClick={onClick} resetLogMessages={resetLogMessages} exampleConfig={[]} />,
    container
  );

  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const dependencyInput = getByLabelText('Dependencies');
  expect(dependencyInput.value).toEqual(''); // Default

  fireEvent.change(dependencyInput, { target: { value: 'hl7.fhir.us.core#3.1.1, hello#123' } });

  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const defaultConfig = { FSHOnly: true, canonical: 'http://example.org', fhirVersion: ['4.0.1'], version: '1.0.0' };

  const expectedDependencies = [
    { packageId: 'hl7.fhir.us.core', version: '3.1.1' },
    { packageId: 'hello', version: '123' }
  ];

  await waitFor(() => {
    expect(runSUSHISpy).toHaveBeenCalledWith(undefined, defaultConfig, expectedDependencies); // Called with new dependencies
  });
});

it('should call saveAll when clicking Save All', () => {
  const mockSaveAll = vi.fn();
  const { getByRole } = render(<FSHControls saveAll={mockSaveAll} exampleConfig={[]} />, container);

  const saveAllButton = getByRole('button', { name: /Save All/i });
  fireEvent.click(saveAllButton);
  expect(mockSaveAll).toHaveBeenCalledTimes(1);
});

it('should not call runSUSHI while waiting for SUSHI or GoFSH', async () => {
  const onClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runSUSHISpy = vi.spyOn(fshHelpers, 'runSUSHI').mockReset().mockResolvedValue(badSUSHIPackage);
  const manifestArr = [
    { id: 'manifestObj-1', name: 'manifestObj-1' },
    { id: 'manifestObj-2', name: 'manifestObj-2' }
  ];
  const metadataObj = {
    'manifestObj-1': { name: 'manifestObj-1', description: 'First manifest object' },
    'manifestObj-2': { name: 'manifestObj-2', description: 'Second manifest object' }
  };

  act(() => {
    render(
      <FSHControls
        onSUSHIClick={onClick}
        resetLogMessages={resetLogMessages}
        isWaiting={true}
        exampleConfig={manifestArr}
        exampleMetadata={metadataObj}
      />,
      container
    );
  });
  const button = document.querySelector('[testid=Button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(runSUSHISpy).toHaveBeenCalledTimes(0);
  });
});

it('should not call runGoFSH while waiting for SUSHI or GoFSH', async () => {
  const onGoFSHClick = vi.fn();
  const resetLogMessages = vi.fn();
  const runGoFSHSpy = vi.spyOn(fshHelpers, 'runGoFSH').mockReset().mockResolvedValue({ fsh: '', config: {} });
  const manifestArr = [
    { id: 'manifestObj-1', name: 'manifestObj-1' },
    { id: 'manifestObj-2', name: 'manifestObj-2' }
  ];
  const metadataObj = {
    'manifestObj-1': { name: 'manifestObj-1', description: 'First manifest object' },
    'manifestObj-2': { name: 'manifestObj-2', description: 'Second manifest object' }
  };

  act(() => {
    render(
      <FSHControls
        onGoFSHClick={onGoFSHClick}
        resetLogMessages={resetLogMessages}
        isWaiting={true}
        exampleConfig={manifestArr}
        exampleMetadata={metadataObj}
      />,
      container
    );
  });

  const button = document.querySelector('[testid=GoFSH-button]');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await waitFor(() => {
    expect(runGoFSHSpy).toHaveBeenCalledTimes(0);
  });
});

it('should properly render the examples in the file tree', async () => {
  const manifestArr = [
    {
      id: 'manifestParent',
      name: 'manifestParent',
      children: [{ id: 'manifestchild-1', name: 'manifestchild-1' }]
    },
    {
      id: 'manifestchild2',
      name: 'manifestchild-2'
    }
  ];
  const metadataObj = {
    'manifestchild-1': { name: 'manifestchild-1', description: 'First manifest object' },
    'manifestchild-2': { name: 'manifestchild-2', description: 'Second manifest object' }
  };

  const { getByRole } = render(<FSHControls exampleConfig={manifestArr} exampleMetadata={metadataObj} />, container);

  const examplesButton = getByRole('button', { name: /Examples/i });
  expect(examplesButton).toBeInTheDocument();
  fireEvent.click(examplesButton);
  const manifestParent = getByRole('treeitem', { name: /manifestParent/i });
  expect(manifestParent).toBeInTheDocument();
  const manifestChild2 = getByRole('treeitem', { name: /manifestchild-2/i });
  expect(manifestChild2).toBeInTheDocument();
});

it('should include a link to the examples repo', () => {
  const { getByRole, getByText } = render(<FSHControls exampleConfig={[]} />, container);

  const examplesButton = getByRole('button', { name: /Examples/i });
  expect(examplesButton).toBeInTheDocument();
  fireEvent.click(examplesButton);

  const exampleRepoText = getByText(/Have an example that might be bene-fish-al?/);
  expect(exampleRepoText).toBeInTheDocument();
  const exampleRepoUrl = getByRole('link');
  expect(exampleRepoUrl).toBeInTheDocument();
  expect(exampleRepoUrl).toHaveAttribute('href', 'https://github.com/FSHSchool/FSHOnline-Examples#readme');
});

it.skip('should populate editor when examples are collected', async () => {
  const updateTextValueSpy = vi.fn();

  const manifestArr = [
    {
      id: 'manifestchild-1',
      name: 'manifestchild-1'
    },
    {
      id: 'manifestchild2',
      name: 'manifestchild-2'
    }
  ];
  const metadataObj = {
    'manifestchild-1': {
      name: 'manifestchild-1',
      description: 'First manifest object',
      path: 'https://raw.githubusercontent.com/FSHSchool/FSHOnline-Examples/main/Aliases/FHIR-aliases.fsh'
    },
    'manifestchild-2': {
      name: 'manifestchild-2',
      description: 'Second manifest object',
      path: 'https://raw.githubusercontent.com/FSHSchool/FSHOnline-Examples/main/Aliases/External-aliases.fsh'
    }
  };

  const { getByRole } = render(
    <FSHControls exampleConfig={manifestArr} exampleMetadata={metadataObj} updateTextValue={updateTextValueSpy} />,
    container
  );

  const examplesButton = getByRole('button', { name: /Examples/i });
  expect(examplesButton).toBeInTheDocument();
  fireEvent.click(examplesButton);
  const manifestChild1 = getByRole('treeitem', { name: /manifestchild-1/i });
  expect(manifestChild1).toBeInTheDocument();
  manifestChild1.click();
  const manifestChild2 = getByRole('treeitem', { name: /manifestchild-2/i });
  expect(manifestChild2).toBeInTheDocument();
  manifestChild2.click();
  expect(window.fetch).toHaveBeenCalledTimes(1);
});

import React from 'react';
import { waitFor, render, fireEvent } from '@testing-library/react';
import App, { decodeFSH } from '../src/App';
import * as bitlyWorker from '../src/utils/BitlyWorker';

it('basic app renders', () => {
  const { getByText } = render(<App match={{}} />);
  const linkElement = getByText(/FSH Online/i);
  expect(linkElement).toBeInTheDocument();
});

it('decodeFSH will return a properly decoded string from base64', async () => {
  const expandLinkSpy = vi.spyOn(bitlyWorker, 'expandLink').mockReset().mockResolvedValue({
    long_url: 'https://fshschool.org/FSHOnline/#/share/eJzzyNRRKMnILFYAokSFktTiEoW0/CKFlNTk/JTMvHQ9ALALCwU='
  });
  const base64 = {
    text: '2Lpe5ZL'
  };
  const decoded = await decodeFSH(base64);
  const expectedDecoded = 'Hi, this is a test for decoding.';
  await waitFor(() => {
    expect(decoded).toEqual(expectedDecoded);
    expect(expandLinkSpy).toHaveBeenCalled();
  });
});

it('line wrapping selection is reflected in parent on selection of checkbox', async () => {
  const { container, getByRole, getByLabelText } = render(<App match={{}} />);
  // wrapping not set by default
  expect(container.querySelector('.CodeMirror')).toBeInTheDocument();
  expect(container.querySelector('.CodeMirror-wrap')).not.toBeInTheDocument();

  // click check box for line wrapping
  const configButton = getByRole('button', { name: /Configuration/i });
  fireEvent.click(configButton);
  const isLineWrappedCheckbox = getByLabelText('Line wrap within code editors');
  expect(isLineWrappedCheckbox).not.toBeChecked();
  fireEvent.click(isLineWrappedCheckbox);

  // line wrapping set after clicked
  expect(container.querySelector('.CodeMirror')).toBeInTheDocument();
  expect(container.querySelector('.CodeMirror-wrap')).toBeInTheDocument();
});

import React from 'react';
import { render, wait, fireEvent } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import ShareLink from '../../components/ShareLink';
import * as bitlyWorker from '../../utils/BitlyWorker';
import Zlib from 'browserify-zlib';

// Mock copy to clipboard since we don't need to test the component itself
jest.mock('copy-to-clipboard', () => {
  return jest.fn();
});

let container = null;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it('copies link to clipboard on button click', async () => {
  const generateLinkSpy = jest
    .spyOn(bitlyWorker, 'generateLink')
    .mockReset()
    .mockResolvedValue({ link: 'success', errorNeeded: false });

  const { getByRole, getByText } = render(<ShareLink shareText={'Profile: A'} />, container);

  await wait(() => {
    const shareButton = getByRole('button', { name: /Share FSH/i });
    fireEvent.click(shareButton);
    expect(generateLinkSpy).toHaveBeenCalled();
  });

  const copyBtn = getByText('Copy to Clipboard');
  fireEvent.click(copyBtn);
  const linkCopiedBtn = getByText('Link Copied');
  expect(linkCopiedBtn).toBeDefined();
});

it('generates link when share button is clicked', async () => {
  const generateLinkSpy = jest
    .spyOn(bitlyWorker, 'generateLink')
    .mockReset()
    .mockResolvedValue({ link: 'success', errorNeeded: false });

  const { getByRole } = render(<ShareLink shareText={'Profile: A'} />, container);

  act(() => {
    const shareButton = getByRole('button', { name: /Share FSH/i });
    fireEvent.click(shareButton);
  });
  await wait(() => {
    expect(generateLinkSpy).toHaveBeenCalled();
  });
});

it('generates link with configuration when share button is clicked', async () => {
  const generateLinkSpy = jest
    .spyOn(bitlyWorker, 'generateLink')
    .mockReset()
    .mockResolvedValue({ link: 'success', errorNeeded: false });

  const deflateSpy = jest.spyOn(Zlib, 'deflateSync').mockReset().mockReturnValue('foo');

  const { getByRole } = render(
    <ShareLink shareText={'Profile: A'} config={{ canonical: 'http://example.org' }} />,
    container
  );

  act(() => {
    const shareButton = getByRole('button', { name: /Share FSH/i });
    fireEvent.click(shareButton);
  });
  await wait(() => {
    expect(deflateSpy).toHaveBeenCalledWith('{"canonical":"http://example.org"}\nProfile: A');
    expect(generateLinkSpy).toHaveBeenCalledWith('https://fshschool.org/FSHOnline/#/share/foo');
  });
});

it('shows an error when the FSH file is too long to share', async () => {
  const generateLinkSpy = jest
    .spyOn(bitlyWorker, 'generateLink')
    .mockReset()
    .mockResolvedValue({ link: undefined, errorNeeded: true });

  const { getByRole, getByText } = render(<ShareLink shareText={'Profile: AVeryLongProfile'} />, container);
  act(() => {
    const shareButton = getByRole('button', { name: /Share FSH/i });
    fireEvent.click(shareButton);
  });
  await wait(() => {
    const swimBtn = getByText(/Keep Swimming!/i);
    expect(swimBtn).toBeInTheDocument();
    expect(generateLinkSpy).toHaveBeenCalled();
  });
});

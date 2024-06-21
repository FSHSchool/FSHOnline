import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import CodeMirrorComponent from '../../components/CodeMirrorComponent';

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

it('Renders initial text in the editor', () => {
  const { getByText } = render(<CodeMirrorComponent initialText="Edit FSH here!" />, container);
  const textElement = getByText(/Edit FSH here!/i);

  expect(textElement).toBeInTheDocument();
});

it('Renders a drawer when one is provided in props', () => {
  const renderDrawer = () => <div>Simple drawer contents</div>;
  const { getByText, getByRole } = render(
    <CodeMirrorComponent initialText="Some text" renderDrawer={renderDrawer} />,
    container
  );
  const drawerText = getByText(/simple drawer contents/i);
  const collapseButton = getByRole('button', { name: /collapse/i });
  expect(collapseButton).toBeInTheDocument();
  expect(drawerText).toBeInTheDocument();
});

it('Drawer can be collapsed and expanded', async () => {
  const renderDrawer = () => <div>Simple drawer contents</div>;
  const { getByRole, queryByRole, getByTestId } = render(
    <CodeMirrorComponent initialText="Some text" renderDrawer={renderDrawer} />,
    container
  );
  let drawer = getByTestId('editor-drawer');
  let expandButton = queryByRole('button', { name: /expand/i });
  expect(drawer.firstChild).toBeVisible(); // Drawer visible
  expect(expandButton).not.toBeInTheDocument();

  // Click collapse and drawer is collapsed (visibility: hidden)
  const collapseButton = getByRole('button', { name: /collapse/i });
  fireEvent.click(collapseButton);
  expandButton = getByRole('button', { name: /expand/i });
  await waitFor(() => {
    expect(drawer.firstChild).not.toBeVisible(); // Drawer is not visible, but still in DOM so can't check that it's not in document
    expect(expandButton).toBeInTheDocument(); // Expand button is rendered when drawer hidden
  });

  // Click expand and drawer is opened again
  fireEvent.click(expandButton);
  expandButton = queryByRole('button', { name: /expand/i });
  await waitFor(() => {
    expect(drawer.firstChild).toBeVisible(); // Drawer is visible again
    expect(expandButton).not.toBeInTheDocument(); // Expand button removed
  });
});

it('Editor wraps when text wrapping is true', async () => {
  const { container: renderContainer } = render(
    <CodeMirrorComponent initialText="Some text" isLineWrapped={true} />,
    container
  );
  expect(renderContainer.querySelector('.CodeMirror-wrap')).toBeInTheDocument();
});

it('Editor does not wrap when text wrapping is false', async () => {
  const { container: renderContainer } = render(
    <CodeMirrorComponent initialText="Some text" isLineWrapped={false} />,
    container
  );
  expect(renderContainer.querySelector('.CodeMirror-wrap')).not.toBeInTheDocument();
});

it('Does not renders a drawer or expand button when one is not provided in props', () => {
  // No renderDrawer prop passed in
  const { queryByRole } = render(<CodeMirrorComponent initialText="Some text" />, container);
  const expandButton = queryByRole('button', { name: /expand/i });
  const collapseButton = queryByRole('button', { name: /collapse/i });
  expect(expandButton).not.toBeInTheDocument();
  expect(collapseButton).not.toBeInTheDocument();
});

it('Renders action buttons for specified actions', () => {
  const copyMock = vi.fn();
  const saveMock = vi.fn();
  const deleteMock = vi.fn();
  const { getByRole } = render(
    <CodeMirrorComponent initialText="Edit FSH here!" copy={copyMock} save={saveMock} delete={deleteMock} />,
    container
  );

  const copyButton = getByRole('button', { name: /copy/i });
  const saveButton = getByRole('button', { name: /save/i });
  const deleteButton = getByRole('button', { name: /delete/i });

  expect(copyButton).toBeInTheDocument();
  expect(saveButton).toBeInTheDocument();
  expect(deleteButton).toBeInTheDocument();
});

it('Does not render action buttons for unspecified actions', () => {
  const deleteMock = vi.fn();
  const { queryByRole } = render(<CodeMirrorComponent initialText="Edit FSH here!" delete={deleteMock} />, container);

  const copyButton = queryByRole('button', { name: /copy/i });
  const saveButton = queryByRole('button', { name: /save/i });
  const deleteButton = queryByRole('button', { name: /delete/i });

  // Copy and save not defined, but delete is
  expect(copyButton).not.toBeInTheDocument();
  expect(saveButton).not.toBeInTheDocument();
  expect(deleteButton).toBeInTheDocument();
});

it('Renders Share option for fsh mode', () => {
  // set mode to fsh
  const { getByRole } = render(<CodeMirrorComponent initialText="Edit FSH here!" mode={'fsh'} />, container);

  const shareButton = getByRole('button', { name: /share fsh/i });
  expect(shareButton).toBeInTheDocument();
});

it('Does not render Share option for non-fsh mode', () => {
  // mode is anything but fsh
  const { queryByRole } = render(
    <CodeMirrorComponent initialText="Edit FSH here!" mode={'application/json'} />,
    container
  );

  const shareButton = queryByRole('button', { name: /share fsh/i });
  expect(shareButton).not.toBeInTheDocument();
});

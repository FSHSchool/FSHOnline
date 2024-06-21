import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import FileSaver from 'file-saver';
import FSHOutput from '../../components/FSHOutput';

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

it('should render a delete button in editor header that opens a confirmation and then delete the FSH', () => {
  const setInitialText = vi.fn();
  const fshText = 'Profile: MyImportantProfile';

  const { getByRole, queryByText } = render(
    <FSHOutput
      text={fshText}
      initialText={fshText}
      updateTextValue={vi.fn()}
      isWaiting={false}
      setInitialText={setInitialText}
    />,
    container
  );

  const deleteActionButton = getByRole('button', { name: /delete/i });
  expect(deleteActionButton).toBeInTheDocument();
  let deleteButton = queryByText('Delete');
  expect(deleteButton).not.toBeInTheDocument();

  // Clicking the delete button the editor header opens the modal for that definition
  fireEvent.click(deleteActionButton);
  deleteButton = queryByText('Delete');
  expect(deleteButton).toBeInTheDocument();
  const dialogBox = deleteButton.parentNode.parentNode.parentNode; // Not sure why this can't be selected with a label
  expect(dialogBox.textContent).toContain('Are you sure you want to delete all FSH?');

  // Clicking delete confirmation deletes the definition
  setInitialText.mockReset();
  fireEvent.click(deleteButton);
  expect(setInitialText).toHaveBeenCalledTimes(1);
  expect(setInitialText).toHaveBeenCalledWith('');
});

it('should render a save button in the editor header that saves the FSH', () => {
  const saveAsSpy = vi.spyOn(FileSaver, 'saveAs').mockImplementationOnce(() => {});
  const setInitialText = vi.fn();
  const fshText = 'Profile: MyImportantProfile';

  const { getByRole } = render(
    <FSHOutput
      text={fshText}
      initialText={fshText}
      updateTextValue={vi.fn()}
      isWaiting={false}
      setInitialText={setInitialText}
    />,
    container
  );

  const saveActionButton = getByRole('button', { name: /save/i });
  expect(saveActionButton).toBeInTheDocument();

  // Clicking the save button in the editor header saves a file with the FSH
  fireEvent.click(saveActionButton);
  expect(saveAsSpy).toHaveBeenCalledTimes(1);
  expect(saveAsSpy).toHaveBeenCalledWith(new Blob([fshText]), 'FSH.fsh');
});

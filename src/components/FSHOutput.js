import React, { useState } from 'react';
import CodeMirrorComponent from './CodeMirrorComponent';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function FSHOutput(props) {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const handleOpenDeleteModal = () => {
    setOpenDeleteModal(!openDeleteModal);
  };

  const handleCloseAndDelete = () => {
    setOpenDeleteModal(false);
    props.setInitialText('');
  };

  return (
    <>
      <CodeMirrorComponent
        name={'FSH'}
        isExamples={false}
        value={props.text}
        initialText={props.initialText}
        updateTextValue={props.updateTextValue}
        mode={'fsh'}
        placeholder={props.isWaiting ? 'Loading...' : 'Paste or edit FSH here...'}
        delete={handleOpenDeleteModal}
        config={props.config}
      />
      {openDeleteModal && (
        <DeleteConfirmationModal
          title={'FHIR Shorthand'}
          item={'all FSH'}
          isOpen={openDeleteModal}
          handleCloseModal={handleOpenDeleteModal}
          handleDelete={handleCloseAndDelete}
        />
      )}
    </>
  );
}

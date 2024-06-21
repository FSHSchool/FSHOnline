import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';

export default function DeleteConfirmationModal(props) {
  return (
    <Dialog open={props.isOpen} onClose={props.handleCloseModal} aria-labelledby="delete-confirmation-dialog">
      <DialogTitle id="delete-confirmation-dialog-title">Delete {props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete {props.item}? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.handleCloseModal} color="primary">
          Cancel
        </Button>
        <Button onClick={props.handleDelete} color="secondary">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

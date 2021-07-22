import React, { useState } from 'react';
import { deflateSync } from 'browserify-zlib';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { makeStyles } from '@material-ui/core/styles';
import { Link } from '@material-ui/icons';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextareaAutosize,
  Tooltip
} from '@material-ui/core';
import { generateLink } from '../utils/BitlyWorker';

const useStyles = makeStyles((theme) => ({
  iconButton: {
    color: theme.palette.common.white,
    padding: '3px'
  },
  textArea: {
    width: '100%',
    color: theme.palette.text.primary,
    fontWeight: 'bold'
  }
}));

export default function ShareLink(props) {
  const classes = useStyles();
  const [openShare, setOpenShare] = useState(false);
  const [openShareError, setOpenShareError] = useState(false);
  const [{ copied, copyButton }, setCopied] = useState({ copied: false, copyButton: 'Copy to Clipboard' });
  const [link, setLink] = useState();

  const updateLink = (event) => {
    const newLink = event.target.value;
    setLink(newLink);
  };

  const handleOpenShare = async () => {
    const encoded = deflateSync(JSON.stringify(props.config) + '\n' + props.shareText).toString('base64');
    const longLink = `https://fshschool.org/FSHOnline/#/share/${encoded}`;
    const bitlyLink = await generateLink(longLink);
    if (bitlyLink.errorNeeded === true) {
      handleOpenShareError();
    } else {
      // Removes the encoded data from the end of the url, starting at index 15
      const bitlySlice = bitlyLink.link.slice(15);
      const displayLink = `https://fshschool.org/FSHOnline/#/share/${bitlySlice}`;
      setLink(displayLink);
      setOpenShare(true);
      setCopied({ copied: false, copyButton: 'Copy to Clipboard' });
    }
  };

  const handleCloseShare = () => {
    setOpenShare(false);
  };

  const handleOpenShareError = () => {
    setOpenShareError(true);
  };

  const handleCloseShareError = () => {
    setOpenShareError(false);
  };

  return (
    <>
      <Tooltip title="Share FSH" placement="top" arrow>
        <IconButton name="Share FSH" className={classes.iconButton} onClick={handleOpenShare}>
          <Link fontSize="small" style={{ transform: 'rotate(-45deg)' }} />
        </IconButton>
      </Tooltip>
      <Dialog open={openShare} onClose={handleCloseShare} aria-labelledby="form-dialog-title" maxWidth="sm" fullWidth>
        <DialogTitle id="form-dialog-title">Share</DialogTitle>
        <DialogContent>
          <DialogContentText>Use this link to share your FSH with others!</DialogContentText>
          <TextareaAutosize
            id="link"
            disabled
            label="Your Link"
            defaultValue={link}
            onChange={updateLink}
            className={classes.textArea}
          ></TextareaAutosize>
        </DialogContent>
        <DialogActions>
          <CopyToClipboard text={link} onCopy={() => setCopied({ copied: true, copyButton: 'Link Copied' })}>
            <Button color={copied ? 'secondary' : 'primary'}>{copyButton}</Button>
          </CopyToClipboard>
          <Button onClick={handleCloseShare} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openShareError} onClose={handleCloseShareError} aria-labelledby="alert-dialog-title" maxWidth="lg">
        <DialogTitle id="alert-dialog-title">Share Error</DialogTitle>
        <DialogContent>
          <DialogContentText>There was a problem sharing your FSH. Your FSH file may be too long.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareError} color="primary" autoFocus>
            Keep Swimming!
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

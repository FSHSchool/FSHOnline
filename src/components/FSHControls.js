import React, { useState } from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { PlayArrow, Settings } from '@material-ui/icons';
import { Box, Button, CircularProgress, Grid, Tooltip } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import AssignmentOutlinedIcon from '@material-ui/icons/AssignmentOutlined';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { runSUSHI, runGoFSH } from '../utils/FSHHelpers';
import { sliceDependency } from '../utils/helpers';
import { TreeView, TreeItem } from '@material-ui/lab';
import CodeMirrorComponent from './CodeMirrorComponent';

const useStyles = makeStyles((theme) => ({
  box: {
    padding: theme.spacing(1),
    color: theme.palette.text.primary,
    background: theme.palette.background.paper,
    display: 'flex;',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rightControls: {
    position: 'absolute',
    right: '24px'
  },
  leftControls: {
    position: 'absolute',
    left: '28px'
  },
  secondaryButton: {
    color: theme.palette.success.main,
    '&:hover': {
      background: theme.palette.common.lighterBlue
    }
  },
  progressContainer: {
    width: '24px',
    height: '24px'
  },
  progress: {
    height: '1em !important',
    width: '1em !important',
    verticalAlign: 'middle',
    color: theme.palette.common.white
  },
  button: {
    color: theme.palette.common.white,
    background: theme.palette.success.main,
    borderRadius: '0',
    paddingRight: '15px',
    paddingLeft: '15px',
    '&:hover': {
      background: theme.palette.success.dark
    }
  },
  buttonLeft: {
    float: 'right',
    left: '-3.33px'
  },
  buttonRight: {
    float: 'left',
    right: '-0.67px'
  },
  runIcon: {
    padding: '0px'
  },
  dialogPaper: {
    maxHeight: '80vh',
    minHeight: '80vh'
  }
}));

function replacer(key, value) {
  if (key === 'config') {
    return undefined;
  }
  return value;
}

export default function FSHControls(props) {
  const classes = useStyles();
  const [openExamples, setOpenExamples] = useState(false);
  const [openConfig, setOpenConfig] = useState(false);
  const [canonical, setCanonical] = useState('');
  const [version, setVersion] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [isSUSHIRunning, setIsSUSHIRunning] = useState(false);
  const [isGoFSHRunning, setIsGoFSHRunning] = useState(false);
  const [isFetchingExample, setIsFetchingExample] = useState(false);
  const [currentExample, setCurrentExample] = useState('');
  const [currentExampleName, setCurrentExampleName] = useState('');

  const handleOpenExamples = () => {
    setOpenExamples(true);
  };

  const handleCloseExamples = () => {
    setOpenExamples(false);
    setCurrentExample('');
  };

  const handleOpenConfig = () => {
    setOpenConfig(true);
  };

  const handleCloseConfig = () => {
    setOpenConfig(false);
  };

  const updateCanonical = (event) => {
    const newCanonical = event.target.value;
    setCanonical(newCanonical);
  };

  const updateVersion = (event) => {
    const newVersion = event.target.value;
    setVersion(newVersion);
  };

  const updateDependencyString = (event) => {
    const dependencyString = event.target.value;
    setDependencies(dependencyString);
  };

  async function handleSUSHIClick() {
    if (props.isWaiting) {
      // If SUSHI or GoFSH is in the middle of processes, don't do anything
      return;
    }

    props.resetLogMessages();
    props.onSUSHIClick(true, [''], true);
    setIsSUSHIRunning(true);
    const dependencyArr = sliceDependency(dependencies);
    const config = {
      canonical: canonical ? canonical : 'http://example.org',
      version: version ? version : '1.0.0',
      FSHOnly: true,
      fhirVersion: ['4.0.1']
    };
    const outPackage = await runSUSHI(props.fshText, config, dependencyArr);
    let jsonOutput = JSON.stringify(outPackage, replacer, 2);
    if (outPackage && outPackage.codeSystems) {
      if (
        !outPackage.codeSystems.length &&
        !outPackage.extensions.length &&
        !outPackage.instances.length &&
        !outPackage.profiles.length &&
        !outPackage.logicals.length &&
        !outPackage.resources.length &&
        !outPackage.valueSets.length
      ) {
        jsonOutput = [''];
      }
    } else {
      jsonOutput = [''];
    }

    props.onSUSHIClick(true, jsonOutput, false);
    setIsSUSHIRunning(false);
  }

  async function handleGoFSHClick() {
    if (props.isWaiting) {
      // If SUSHI or GoFSH is in the middle of processes, don't do anything
      return;
    }

    props.resetLogMessages();
    props.onGoFSHClick('', true);
    setIsGoFSHRunning(true);
    const gofshInputStrings = props.gofshText.map((def) => def.def).filter((d) => d);
    const parsedDependencies = dependencies === '' ? [] : dependencies.split(',');

    // Create small ImplementationGuide resource to send canonical and version information
    if (canonical || version) {
      const igResource = {
        resourceType: 'ImplementationGuide',
        fhirVersion: ['4.0.1'],
        id: '1',
        ...(canonical && { url: `${canonical}/ImplementationGuide/1` }),
        ...(version && { version: version })
      };
      gofshInputStrings.push(JSON.stringify(igResource, null, 2));
    }

    const options = { dependencies: parsedDependencies };
    const { fsh, config } = await runGoFSH(gofshInputStrings, options);
    props.onGoFSHClick(fsh, false);
    setIsGoFSHRunning(false);
    if (canonical === '' && config.canonical) setCanonical(config.canonical);
    if (version === '' && config.version) setVersion(config.version);
  }

  async function fetchExampleFSH(event, value) {
    if (!value.endsWith('.fsh')) return;
    const exampleMetadata = props.exampleMetadata[value];
    setIsFetchingExample(true);
    setCurrentExampleName(exampleMetadata.name);
    const utf8Decoder = new TextDecoder('utf-8');
    let responseReader = await fetch(exampleMetadata.path).then((response) => response.body.getReader());
    let fshString = '';
    const { value: chunk } = await responseReader.read();
    fshString += utf8Decoder.decode(chunk);
    setIsFetchingExample(false);
    setCurrentExample(fshString);
  }

  function updateExampleValue(text) {
    setCurrentExample(text);
  }

  function handleCopyToClipboard() {
    navigator.clipboard.writeText(currentExample);
  }

  const renderItem = (node) => (
    <Tooltip
      key={node.id}
      title={
        props.exampleMetadata[node.id] && props.exampleMetadata[node.id].description
          ? props.exampleMetadata[node.id].description
          : node.name
      }
      placement="bottom"
      arrow
    >
      <TreeItem key={node.id} nodeId={node.id} label={node.name} className={classes.treeItem}></TreeItem>
    </Tooltip>
  );

  const renderTree = (nodes) => (
    <TreeItem key={nodes.id} nodeId={nodes.id} label={nodes.name}>
      {nodes.children ? nodes.children.map((node) => (node.children ? renderTree(node) : renderItem(node))) : null}
    </TreeItem>
  );

  return (
    <Box className={classes.box}>
      <Grid container>
        <Grid item xs={5}>
          <Button className={clsx(classes.button, classes.buttonLeft)} onClick={handleSUSHIClick} testid="Button">
            Convert to JSON
            {isSUSHIRunning ? (
              <div className={classes.progressContainer}>
                <CircularProgress className={classes.progress} />
              </div>
            ) : (
              <PlayArrow className={classes.runIcon} />
            )}
          </Button>
        </Grid>
        <Grid item xs={7}>
          <Button
            className={clsx(classes.button, classes.buttonRight)}
            onClick={handleGoFSHClick}
            testid="GoFSH-button"
          >
            {isGoFSHRunning ? (
              <div className={classes.progressContainer}>
                <CircularProgress className={classes.progress} />
              </div>
            ) : (
              <PlayArrow className={classes.runIcon} style={{ transform: 'scaleX(-1)' }} />
            )}
            Convert to FSH
          </Button>
        </Grid>
      </Grid>

      <div className={classes.leftControls}>
        <Button name="Examples" className={classes.button} onClick={handleOpenExamples}>
          <LibraryBooksIcon /> &nbsp; FSH Examples
        </Button>
      </div>

      <div className={classes.rightControls}>
        <Button name="Configuration" className={classes.secondaryButton} onClick={handleOpenConfig}>
          <Settings /> Configuration
        </Button>
      </div>

      <Dialog open={openConfig} onClose={handleCloseConfig} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Configuration Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Change the Implementation Guide configuration to use when processing FSH and FHIR JSON
          </DialogContentText>
          <TextField
            id="canonical"
            margin="dense"
            fullWidth
            label="Canonical URL"
            helperText="Default: http://example.org"
            defaultValue={canonical}
            onChange={updateCanonical}
          />
          <TextField
            id="version"
            margin="dense"
            fullWidth
            label="Version"
            helperText="Default: 1.0.0"
            defaultValue={version}
            onChange={updateVersion}
          />
          <TextField
            id="dependencies"
            margin="dense"
            fullWidth
            label="Dependencies"
            helperText="Format: packageId#version, packageId#version (e.g., hl7.fhir.us.core#3.1.1)"
            defaultValue={dependencies}
            onChange={updateDependencyString}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openExamples}
        onClose={handleCloseExamples}
        aria-labelledby="form-dialog-title"
        maxWidth="lg"
        fullWidth
        scroll="paper"
        classes={{ paper: classes.dialogPaper }}
      >
        <DialogTitle id="form-dialog-title">FSH Examples</DialogTitle>
        <DialogContent>
          <Grid container style={{ overflow: 'scroll', minHeight: '64vh' }}>
            <Grid item xs={4}>
              <TreeView
                className={classes.treeView}
                defaultCollapseIcon={<ExpandMoreIcon />}
                defaultExpandIcon={<ChevronRightIcon />}
                onNodeSelect={fetchExampleFSH}
              >
                {props.exampleConfig.map((category) => renderTree(category))}
              </TreeView>
            </Grid>
            <Grid item xs={8}>
              <CodeMirrorComponent
                name={currentExample ? currentExampleName : ''}
                isExamples={true}
                value={currentExample}
                initialText={currentExample}
                updateTextValue={updateExampleValue}
                mode={'fsh'}
                placeholder={isFetchingExample ? 'Fetching example...' : 'Select an example'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyToClipboard} color="primary">
            <AssignmentOutlinedIcon></AssignmentOutlinedIcon> Copy to clipboard
          </Button>
          <Button onClick={handleCloseExamples} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import React, { createContext, useState, useEffect } from 'react';
import { inflateSync } from 'browserify-zlib';
import { debounce } from 'lodash';
import clsx from 'clsx';
import { createMuiTheme, makeStyles } from '@material-ui/core/styles';
import { Grid, ThemeProvider } from '@material-ui/core';
import { expandLink } from './utils/BitlyWorker';
import TopBar from './components/TopBar';
import JSONOutput from './components/JSONOutput';
import FSHOutput from './components/FSHOutput';
import ConsoleComponent from './components/ConsoleComponent';
import FSHControls from './components/FSHControls';

const useStyles = makeStyles((theme) => ({
  container: {
    height: '100%',
    flexGrow: 1
  },
  fullHeightGrid: {
    height: '100%'
  },
  editorPane: {
    // From MaterialUI Grid:
    flexGrow: '0'
    // maxWidth and flexBasis set inline based on state
  },
  resize: {
    height: '100%',
    width: '4px',
    cursor: 'col-resize',
    '&:hover': {
      background: colors.lightBlue
    }
  },
  resizeBlue: {
    background: '#487AA2'
  },
  resizeCursor: {
    cursor: 'col-resize'
  },
  collapsedMain: {
    width: '100%',
    height: 'calc(100vh - 116px - 300px)'
  },
  expandedMain: {
    width: '100%',
    height: 'calc(100vh - 116px - 34px)'
  },
  collapsedConsole: {
    height: '25px',
    width: '100%'
  },
  expandedConsole: {
    height: '300px',
    width: '100%'
  },
  top: {
    height: '116px'
  }
}));

const colors = {
  lighterBlue: '#D8E2EA',
  lightBlue: '#487AA2',
  blue: '#30638e',
  darkerBlue: '#143E61',
  editorGrey: '#263238',
  lightestGrey: '#E7ECEE',
  lightGrey: '#D0D9DD',
  grey: '#575B5C',
  darkerGrey: '#3D4345',
  darkestGrey: '#121D21',
  red: '#FD6668'
};

const theme = createMuiTheme({
  palette: {
    success: {
      main: colors.blue,
      dark: colors.darkerBlue,
      light: colors.lightBlue
    },
    common: colors
  },
  typography: {
    fontFamily: 'Open Sans'
  },
  overrides: {
    MuiTooltip: {
      tooltip: {
        backgroundColor: colors.darkestGrey,
        fontSize: '13px'
      },
      arrow: {
        color: colors.darkestGrey
      }
    },
    MuiButton: {
      text: {
        textTransform: 'none',
        fontWeight: 600
      }
    },
    MuiIconButton: {
      root: {
        '&:hover': {
          backgroundColor: colors.grey
        }
      }
    }
  }
});

const githubURL = 'https://raw.githubusercontent.com/FSHSchool/FSHOnline-Examples/main/';
const log = console.log; //eslint-disable-line no-unused-vars
let consoleMessages = [];
let exampleMetadata = {};
let errorString = '';
let warningString = '';
let errorCount = 0;
let warningCount = 0;
console.log = function getMessages(message) {
  consoleMessages.push(message);
  if (message && (message.startsWith('error') || message.startsWith('warn'))) {
    if (message.startsWith('error')) errorCount++;
    else warningCount++;
  }
  if (errorCount > 0) {
    errorString = `${errorCount} Error`;
    if (errorCount !== 1) errorString += 's';
  }
  if (warningCount > 0) {
    warningString = `${warningCount} Warning`;
    if (warningCount !== 1) warningString += 's';
  }
};

/* 
Parses metadata into a seperate object and converts the manifest into a form that can
be consumed by the TreeView component
*/
function convertManifest(childrenArr) {
  childrenArr.forEach((element) => {
    if (element.type === 'category') {
      convertManifest(element.children);
    }
    element.id = element.path.replaceAll('%20', '-'); // Spaces in file names are replaced with '%20' in Github urls
    if (element.type === 'file') {
      exampleMetadata[element.id] = {
        path: `${githubURL}/Examples/${element.path}`,
        description: element.description,
        name: element.name
      };
    }
    delete element.type;
    delete element.path;
  });
}

async function getManifestFromGit() {
  let manifestJSON = await fetch(`${githubURL}/index.json`).then((response) => response.json());
  convertManifest(manifestJSON.children);
  return [...manifestJSON.children];
}

export async function decodeFSH(encodedFSH) {
  if (encodedFSH.text === undefined) {
    return '';
  } else {
    const promisedURL = await expandLink(encodedFSH);

    // Removes the encoded data from the end of the url, starting at index 38
    const sliced64 = promisedURL.long_url.slice(40);
    if (!promisedURL.long_url.includes('https://fshschool.org/FSHOnline/#/share/') || sliced64.length === 0) {
      return '';
    } else {
      const displayText = inflateSync(Buffer.from(sliced64, 'base64')).toString('utf-8');
      return displayText;
    }
  }
}

export const ExpandedConsoleContext = createContext(false);

export default function App(props) {
  const classes = useStyles();
  const urlParam = props.match;
  const [showNewFHIRText, setShowNewFHIRText] = useState(false);
  const [inputFSHText, setInputFSHText] = useState('');
  const [inputFHIRText, setInputFHIRText] = useState(['']);
  const [initialText, setInitialText] = useState('');
  const [isWaitingForFHIROutput, setIsWaitingForFHIROutput] = useState(false);
  const [isWaitingForFSHOutput, setIsWaitingForFSHOutput] = useState(false);
  const [expandConsole, setExpandConsole] = useState(false);
  const [exampleConfig, setExampleConfig] = useState([]);
  const [exampleFilePaths, setExampleFilePaths] = useState({});
  const [leftWidth, setLeftWidth] = useState(41.666667); // Initial width based off grid item xs={5} size to align with FSHControls
  const [isDragging, setIsDragging] = useState(false);
  const [configToShare, setConfigToShare] = useState({ canonical: '', version: '', dependencies: '' });
  const [sharedConfig, setSharedConfig] = useState({});

  useEffect(() => {
    async function waitForFSH() {
      const text = await decodeFSH(urlParam.params);
      const splitIndex = text.indexOf('\n');
      const config = text.slice(0, splitIndex);
      let parsedConfig;
      let fshContent = text;
      try {
        parsedConfig = JSON.parse(config);
        if (parsedConfig.canonical != null && parsedConfig.version != null && parsedConfig.dependencies != null) {
          // If the config is successfully parsed and has the expected properties,
          // we can assume the true FSH content begins on the next line
          fshContent = text.slice(splitIndex + 1);
        }
      } catch (e) {
        // If parse fails, it is likely decoding a legacy link in which all content is FSH, so just don't
        // set the parsedConfig, and set fshContent to all of the text
      }
      setSharedConfig(parsedConfig || {});
      setInitialText(fshContent);
    }
    async function fetchExamples() {
      setExampleConfig(await getManifestFromGit());
      setExampleFilePaths(exampleMetadata);
    }
    waitForFSH();
    fetchExamples();
  }, [urlParam]);

  function resetLogMessages() {
    consoleMessages = [];
    errorString = '';
    warningString = '';
    errorCount = 0;
    warningCount = 0;
  }

  function handleSUSHIControls(showNewText, sushiOutput, isWaiting) {
    setShowNewFHIRText(showNewText);
    setInputFHIRText(sushiOutput); // JSONOutput component handles resetting initial text, so don't reset here
    setIsWaitingForFHIROutput(isWaiting);
  }

  function handleGoFSHControls(fshOutput, isWaiting) {
    setIsWaitingForFSHOutput(isWaiting);
    setInitialText(fshOutput === '' ? null : fshOutput); // Reset initial text to null if empty in order to display placeholder text
  }

  function updateInputFSHTextValue(text) {
    // This is a bit of a hack to make sure the editor can be reset by a setInitialText(null)
    if (initialText === '' || initialText === null) {
      setInitialText(text);
    }
    setInputFSHText(text);
  }

  function updateInputFHIRTextValue(text) {
    setInputFHIRText(text);
  }

  function handleConfigChange(config) {
    setConfigToShare(config);
  }

  function handleResetWidth() {
    setLeftWidth(41.666667);
  }

  function onMouseDown(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onMouseUp(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onTouchStart() {
    setIsDragging(true);
  }

  function onTouchEnd() {
    setIsDragging(false);
  }

  function debouncedMove(clientX) {
    if (isDragging) {
      const newPercentage = (clientX / window.innerWidth) * 100;
      if (newPercentage > 10 && newPercentage < 76) {
        setLeftWidth(newPercentage);
      }
    }
  }

  function onMouseMove(e) {
    const clientX = e.clientX;
    if (isDragging) {
      debounce(() => debouncedMove(clientX), 10)();
    }
  }

  function onTouchMove(e) {
    const clientX = e.touches[0].clientX;
    if (isDragging) {
      debounce(() => debouncedMove(clientX), 10)();
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="root" style={{ height: '100vh' }}>
        <div className={classes.top}>
          <TopBar />
          <FSHControls
            onSUSHIClick={handleSUSHIControls}
            onGoFSHClick={handleGoFSHControls}
            onConfigChange={handleConfigChange}
            config={sharedConfig}
            fshText={inputFSHText}
            gofshText={inputFHIRText}
            resetLogMessages={resetLogMessages}
            exampleConfig={exampleConfig}
            exampleMetadata={exampleFilePaths}
            isWaiting={isWaitingForFSHOutput || isWaitingForFHIROutput}
          />
        </div>
        <div className={expandConsole ? classes.collapsedMain : classes.expandedMain}>
          <ExpandedConsoleContext.Provider value={expandConsole}>
            <Grid
              className={clsx(classes.container, isDragging && classes.resizeCursor)}
              container
              onTouchMove={onTouchMove}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <Grid
                item
                className={clsx(classes.fullHeightGrid, classes.editorPane)}
                style={{ maxWidth: `calc(${leftWidth}% - 2px)`, flexBasis: `calc(${leftWidth}% - 2px)` }}
              >
                <FSHOutput
                  text={inputFSHText}
                  initialText={initialText}
                  updateTextValue={updateInputFSHTextValue}
                  isWaiting={isWaitingForFSHOutput}
                  setInitialText={setInitialText}
                  config={configToShare}
                />
              </Grid>
              <Grid
                item
                className={clsx(classes.resize, isDragging && classes.resizeBlue)}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onDoubleClick={handleResetWidth}
              />
              <Grid
                item
                className={clsx(classes.fullHeightGrid, classes.editorPane)}
                style={{
                  maxWidth: `calc(${100 - leftWidth}% - 2px)`,
                  flexBasis: `calc(${100 - leftWidth}% - 2px)`
                }}
              >
                <JSONOutput
                  text={inputFHIRText}
                  showNewText={showNewFHIRText}
                  setShowNewText={setShowNewFHIRText}
                  isWaiting={isWaitingForFHIROutput}
                  updateTextValue={updateInputFHIRTextValue}
                />
              </Grid>
            </Grid>
          </ExpandedConsoleContext.Provider>
        </div>
        <div className={expandConsole ? classes.expandedConsole : classes.collapsedConsole}>
          <ConsoleComponent
            consoleMessages={consoleMessages}
            warningCount={warningString}
            errorCount={errorString}
            expandConsole={expandConsole}
            setExpandConsole={setExpandConsole}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

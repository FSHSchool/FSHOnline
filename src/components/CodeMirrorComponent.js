import React, { useState, useContext } from 'react';
import clsx from 'clsx';
import { upperFirst } from 'lodash';
import { Button, Box, Drawer, IconButton, Tooltip } from '@material-ui/core';
import { ChevronLeft, ChevronRight, Delete, FileCopy, SaveAlt } from '@material-ui/icons';
import { UnControlled as ReactCodeMirror } from 'react-codemirror2';
import { makeStyles } from '@material-ui/core/styles';
import CodeMirror from 'codemirror';
import { ExpandedConsoleContext } from '../App';
import ShareLink from './ShareLink';
import '../style/CodeMirrorComponent.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
require('codemirror/addon/mode/simple');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/display/placeholder');
require('codemirror/addon/comment/comment');
require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/brace-fold');
require('codemirror/mode/xml/xml');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/scroll/simplescrollbars');

// Define FSH syntax highlighting
// Regular expressions from https://github.com/standardhealth/vscode-language-fsh/blob/master/syntaxes/fsh.tmLanguage.json
CodeMirror.defineSimpleMode('fsh', {
  meta: {
    lineComment: '//'
  },
  start: [
    // The regex matches the token, the token property contains the type
    {
      regex: /"(?:[^\\]|\\.)*?(?:"|$)/,
      token: 'atom'
    },
    {
      regex: /\b(Alias|CodeSystem|Expression|Extension|Description|Id|Instance|InstanceOf|Invariant|Logical|Mapping|Mixins|Parent|Profile|Resource|RuleSet|Severity|Source|Target|Title|Usage|ValueSet|XPath)(?=\s*:)\b/,
      token: 'keyword'
    },
    {
      // NOTE: Original regex has (?<=\s|^) at start and (?=\s) at the end, and (?<=\\bfrom\\s*) before 'system'.
      // However, there are known shortcomings with look ahead/look behind with the simple mode approach
      regex: /\b(and|codes|contains|descendent-of|exclude|exists|from|generalizes|include|in|insert|is-a|is-not-a|named|not-in|obeys|only|or|regex|system|units|valueset|where|D|MS|N|SU|TU|\\?!)\b/,
      token: 'def'
    },
    {
      regex: /(\(\s*)(exactly|example|extensible|preferred|required)(\s*\))/,
      token: 'def'
    },
    {
      // NOTE: VS Code highlighting properly highlights the open and close parentheses, but this does not
      regex: /\b(Reference|Canonical)\s*/,
      token: 'atom'
    },
    {
      regex: /\*|->|=|\+|:/,
      token: 'def'
    },
    {
      regex: /\b(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*))\b/,
      token: 'atom'
    },
    {
      // NOTE: Original regex has (?<=\s|^) at start and (?=\s) at end
      regex: /\b(true|false)\b/,
      token: 'string'
    },
    {
      // NOTE: Original regex has (?<=\s|^) and (?=\s) at end
      regex: /\b(-?\d+(\.\d+)?)\b/, // numbers
      token: 'string'
    },
    {
      regex: /#"(?:\\.|[^\\"])*"/, // #"quoted code"
      token: 'string'
    },
    {
      regex: /#[^\s]*/, // #code
      token: 'string'
    },
    {
      regex: /'.*'/, // 'ucum'
      token: 'string'
    },
    { regex: /\/\/.*/, token: 'comment' },
    { regex: /\/\*/, token: 'comment', next: 'comment' }
  ],
  comment: [
    { regex: /.*?\*\//, token: 'comment', next: 'start' },
    { regex: /.*/, token: 'comment' }
  ]
});

const drawerWidth = 200;

const useStyles = makeStyles((theme) => ({
  box: {
    height: '100%'
  },
  header: {
    fontFamily: 'Open Sans',
    color: theme.palette.common.white,
    background: theme.palette.common.darkerGrey,
    padding: '0px',
    paddingLeft: '29px', // width of code mirror gutter
    height: '34px', // 24px + 10px of padding is total height
    display: 'flex',
    justifyContent: 'space-between',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  headerShift: {
    width: `calc(100% - ${drawerWidth}px - 29px)`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    }),
    marginRight: drawerWidth
  },
  headerLabel: {
    lineHeight: '34px',
    float: 'left',

    // Ellipse for long resource ids
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  headerActionGroup: {
    paddingRight: '10px'
  },
  headerActions: {
    alignItems: 'center',
    display: 'flex'
  },
  iconButton: {
    color: theme.palette.common.white,
    padding: '3px'
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0
  },
  drawerPaper: {
    width: drawerWidth,
    border: 'none',
    // necessary for content to be TopBar and in line with editor
    height: 'calc(100vh - 116px - 34px)',
    top: '116px'
  },
  drawerPaperExpandedConsole: {
    height: 'calc(100vh - 116px - 300px)'
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Color to match header
    color: theme.palette.common.white,
    background: theme.palette.common.darkerGrey,
    height: '34px', // Same height as headers on CodeMirror editors
    minHeight: '34px'
  },
  drawerHeaderIcon: {
    padding: '0px',
    color: theme.palette.common.white,
    background: theme.palette.success.main,
    '&:hover': {
      background: theme.palette.success.light
    },
    borderRadius: 0,
    height: '100%',
    width: '34px',
    minWidth: '34px' // width and minWidth match the height so button is a square
  },
  content: {
    flexGrow: 1,
    width: '100%',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  contentShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    }),
    marginRight: 0
  }
}));

export default function CodeMirrorComponent(props) {
  const classes = useStyles();
  const expandedConsoleContext = useContext(ExpandedConsoleContext);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  //Updates both the text state with the codemirror value
  function updateText(text) {
    props.updateTextValue(text);
  }

  const renderActionIcon = (Icon, label, onClick, style = {}) => {
    return (
      <Tooltip title={upperFirst(label)} placement="top" arrow>
        <IconButton name={label} className={classes.iconButton} aria-label={label} onClick={onClick}>
          <Icon fontSize="small" style={style} />
        </IconButton>
      </Tooltip>
    );
  };

  const renderActionIcons = () => {
    // Render only specified actions
    return (
      <div className={classes.headerActions}>
        <div className={classes.headerActionGroup}>
          {props.mode === 'fsh' && !props.isExamples && <ShareLink shareText={props.value} config={props.config} />}
          {props.copy && renderActionIcon(FileCopy, 'copy', () => {})}
          {props.save && renderActionIcon(SaveAlt, 'save', () => {})}
          {props.delete && renderActionIcon(Delete, 'delete', props.delete)}
        </div>
        {props.renderDrawer && !drawerOpen && (
          <IconButton name="expand" className={classes.drawerHeaderIcon} aria-label="expand" onClick={handleDrawerOpen}>
            <ChevronLeft />
          </IconButton>
        )}
      </div>
    );
  };

  const renderDrawer = () => {
    return (
      <Drawer
        className={classes.drawer}
        data-testid={'editor-drawer'}
        variant="persistent"
        anchor="right"
        open={drawerOpen}
        classes={{
          paper: clsx(classes.drawerPaper, expandedConsoleContext && classes.drawerPaperExpandedConsole)
        }}
      >
        <div className={classes.drawerHeader}>
          <Button
            name="collapse"
            aria-label="collapse"
            className={classes.drawerHeaderIcon}
            onClick={handleDrawerClose}
          >
            <ChevronRight />
          </Button>
        </div>
        {props.renderDrawer()}
      </Drawer>
    );
  };

  return (
    <Box className={classes.box}>
      <div
        className={clsx(classes.header, {
          [classes.headerShift]: props.renderDrawer && drawerOpen
        })}
      >
        <div title={props.name} className={classes.headerLabel}>
          {props.name}
        </div>
        {renderActionIcons()}
      </div>
      <ReactCodeMirror
        className={clsx('react-codemirror2', props.renderDrawer && classes.content, {
          [classes.contentShift]: props.renderDrawer && drawerOpen
        })}
        value={props.initialText}
        options={{
          mode: props.mode,
          theme: 'material',
          placeholder: props.placeholder,
          scrollbarStyle: 'overlay',
          autoCloseBrackets: true,
          lineNumbers: true,
          foldGutter: true,
          readOnly: props.isExamples,
          gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
          extraKeys: {
            'Ctrl-/': 'toggleComment',
            'Cmd-/': 'toggleComment',
            'Ctrl-Q': (cm) => {
              cm.foldCode(cm.getCursor());
            }
          }
        }}
        onChange={(editor, data, value) => {
          updateText(value);
        }}
      />
      {props.renderDrawer && renderDrawer()}
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Button, IconButton } from '@material-ui/core';
import { ExpandLess, ExpandMore } from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  consoleControls: {
    background: theme.palette.common.darkestGrey,
    height: '34px',
    boxSizing: 'border-box',
    display: 'flex;',
    alignItems: 'center',
    justifyContent: 'left'
  },
  box: {
    paddingLeft: '29px', // Same padding as header of code mirror
    color: theme.palette.common.white,
    background: theme.palette.common.darkestGrey,
    height: 'calc(100% - 34px)',
    overflow: 'scroll',
    boxSizing: 'border-box'
  },
  button: {
    marginRight: '10px',
    color: theme.palette.common.white,
    textTransform: 'none',
    padding: 0
  },
  problemsButton: {
    padding: 0,
    color: theme.palette.common.white,
    textTransform: 'none'
  },
  expandIcon: {
    width: '29px', // Lines up with padding,
    color: theme.palette.common.white,
    padding: 0
  },
  pre: {
    margin: '0px'
  },
  circle: {
    'border-radius': '50%',
    'border-style': 'solid',
    'border-width': '2px',
    'min-width': '20px',
    height: '20px',
    paddingLeft: 1,
    paddingRight: 1,
    background: '#263238',
    'align-items': 'center',
    display: 'flex',
    marginLeft: 4,
    'justify-content': 'center',
    padding: 0
  }
}));

export default function Console(props) {
  const classes = useStyles();
  const [problemsView, setProblemsView] = useState(false);
  const { problemCount, setExpandConsole } = props;

  useEffect(() => {
    // When props.problemCount changes and if there is a problem, make sure to open the console.
    // If the problemCount is 0, we don't need to open it.
    // The console should be able to be closed, so don't track whether the props.expandConsole value has changed.
    if (problemCount) {
      setExpandConsole(true);
    }
  }, [problemCount, setExpandConsole]);

  const toggleExpandConsole = () => {
    props.setExpandConsole(!props.expandConsole);
  };

  const setMessagesConsole = () => {
    setProblemsView(false);
    props.setExpandConsole(true);
  };

  const setProblemsConsole = () => {
    setProblemsView(true);
    props.setExpandConsole(true);
  };

  return (
    <>
      <Box className={classes.consoleControls}>
        <IconButton
          onClick={toggleExpandConsole}
          aria-label={props.expandConsole ? 'collapse console' : 'expand console'}
          className={classes.expandIcon}
        >
          {props.expandConsole ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
        <Button onClick={setMessagesConsole} className={classes.button}>
          <p
            style={{
              borderBottom: props.expandConsole && !problemsView ? '1px solid white' : 'none',
              margin: '0'
            }}
          >
            Console
          </p>
        </Button>
        <Button onClick={setProblemsConsole} className={classes.problemsButton}>
          <p
            style={{
              borderBottom:
                props.expandConsole && problemsView
                  ? `1px solid ${!props.problemCount ? 'white' : props.problemColor}`
                  : 'none',
              margin: '0'
            }}
          >
            Problems
          </p>
          <div
            className={classes.circle}
            style={{ borderColor: `${!props.problemCount ? 'white' : props.problemColor}` }}
          >
            {props.problemCount}
          </div>
        </Button>
      </Box>
      <Box style={{ display: props.expandConsole ? 'block' : 'none' }} className={classes.box}>
        {problemsView
          ? props.problemMessages.map((message, i) => {
              return (
                <pre key={i} className={classes.pre}>
                  {message}
                </pre>
              );
            })
          : props.consoleMessages.map((message, i) => {
              return (
                <pre key={i} className={classes.pre}>
                  {message}
                </pre>
              );
            })}
      </Box>
    </>
  );
}

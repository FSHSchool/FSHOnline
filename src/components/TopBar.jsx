import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Toolbar, Button, Typography, Box } from '@material-ui/core';
import { StylesProvider } from '@material-ui/core/styles';
import { ExitToApp } from '@material-ui/icons';
import logo from '../style/FSH-online-logo.png';

const useStyles = makeStyles((theme) => ({
  root: {
    background: theme.palette.common.blue,
    position: 'static',
    boxShadow: '0'
  },
  title: {
    fontSize: 20,
    fontWeight: 700
  },
  logo: {
    height: '55px',
    width: '63px'
  },
  toolbarBox: {
    alignItems: 'center'
  },
  exitIcon: {
    paddingLeft: '3px',
    transform: 'scaleX(-1)'
  },
  docButton: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.common.blue,
    fontSize: '0.875rem',
    fontWeight: 700,
    '&:hover': {
      background: theme.palette.common.lightBlue
    }
  },
  versionText: {
    color: theme.palette.common.white,
    fontSize: '0.8rem',
    fontStyle: 'italic',
    marginTop: '-5px'
  }
}));

export default function TopBar() {
  const classes = useStyles();
  return (
    <AppBar className={classes.root}>
      <Toolbar>
        <Box className={classes.toolbarBox} display="flex" flexGrow={1} flexDirection="row">
          <Box order={1} display="flex" flexGrow={1} flexDirection="row">
            <Box order={1} alignSelf="center" display="flex">
              <img src={logo} alt="logo" className={classes.logo} />
            </Box>
            <Box order={2} alignSelf="center" m={1}>
              <StylesProvider injectFirst>
                <Typography order={1} className={classes.title}>
                  FSH ONLINE
                </Typography>
                <Typography order={2} className={classes.versionText}>
                  Powered by SUSHI v3.11.0 and GoFSH v2.3.1
                </Typography>
              </StylesProvider>
            </Box>
          </Box>
          <Box order={1}>
            <StylesProvider injectFirst>
              <Button className={classes.docButton} href="https://fshschool.org/" target="_blank">
                <ExitToApp className={classes.exitIcon} fontSize="small" />
                Back to School
              </Button>
            </StylesProvider>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

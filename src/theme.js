import { createTheme } from '@material-ui/core/styles';

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

const theme = createTheme({
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

export default theme;

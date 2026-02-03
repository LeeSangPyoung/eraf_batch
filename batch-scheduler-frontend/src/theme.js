import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      contrastText: '#d6d6d6',
    },
    secondary: {
      main: '#1C1C1C0D',
    },
    text: {
      primary: '#000000',
      secondary: '#ffffff',
    },
    background: {
      paper: 'white',
    },
    action: {
      disabledBackground: '#d6d6d6',
      disabled: '#a6a6a6',
    },
  },
  typography: {
    fontFamily: '"Pretendard", "Roboto", "Arial", sans-serif',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#F5F5F5',
          borderRadius: '10px',
          fontSize: '16px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F5F5F5',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F5F5F5',
            borderWidth: '1px',
          },
        },
        input: {
          color: '#000000',
          '&::placeholder': {
            color: '#999999',
            opacity: 1,
          },
          ':disabled': {
            WebkitTextFillColor: '#B0B0B0',
            color: '#B0B0B0',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#A4A7AE',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            color: '#B0B0B0',
            fontSize: '16px',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          ':disabled': {
            WebkitTextFillColor: '#B0B0B0',
            color: '#B0B0B0',
          },
          borderRadius: '10px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          '& .MuiDialog-paper': {
            boxShadow: 'none',
          },
        },
      },
    },
  },
});

export default theme;

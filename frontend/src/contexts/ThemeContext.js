import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from './AuthContext';
import { userApi } from '../utils/api';

// Create context
const ThemeContext = createContext();

// Theme configurations
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920,
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#f48fb1',
      light: '#f8bbd0',
      dark: '#c2185b',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  // Keep the same typography and other settings as light theme
  typography: lightTheme.typography,
  components: {
    ...lightTheme.components,
    // Add dark mode specific component overrides if needed
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
  breakpoints: lightTheme.breakpoints,
});

// Custom hook to use the theme context
export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  
  // Load theme preference from user settings or localStorage on mount
  useEffect(() => {
    const loadThemePreference = () => {
      if (currentUser?.settings?.darkMode !== undefined) {
        // If user is logged in, use their saved preference
        setDarkMode(currentUser.settings.darkMode);
      } else {
        // Otherwise, check localStorage
        const savedPreference = localStorage.getItem('darkMode');
        if (savedPreference !== null) {
          setDarkMode(savedPreference === 'true');
        }
      }
    };
    
    loadThemePreference();
  }, [currentUser]);
  
  // Toggle dark mode and save preference
  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Save to localStorage for persistence
    localStorage.setItem('darkMode', String(newDarkMode));
    
    // If user is logged in, save to user settings
    if (currentUser) {
      try {
        // Get current settings or create an empty object
        const currentSettings = currentUser?.settings || {};
        
        // Update with new dark mode setting
        const updatedSettings = {
          ...currentSettings,
          darkMode: newDarkMode
        };
        
        // Save to database
        await userApi.updateSettings(updatedSettings);
      } catch (error) {
        console.error('Failed to save theme preference to user settings:', error);
      }
    }
  };
  
  // Select the appropriate theme
  const theme = darkMode ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 
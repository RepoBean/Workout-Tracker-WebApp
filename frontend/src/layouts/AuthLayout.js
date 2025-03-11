import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: (theme) => theme.palette.primary.main,
      }}
    >
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <FitnessCenterIcon sx={{ fontSize: 60, color: 'white' }} />
          <Typography component="h1" variant="h3" color="white" gutterBottom>
            Workout Tracker
          </Typography>
          <Typography variant="h6" color="white" align="center">
            Track your fitness journey and achieve your goals
          </Typography>
        </Box>
        
        <Paper
          elevation={6}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
          }}
        >
          <Outlet />
        </Paper>
      </Container>
      
      <Box
        component="footer"
        sx={{
          py: 3,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.primary.dark,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="white" align="center">
            © {new Date().getFullYear()} Workout Tracker
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthLayout; 
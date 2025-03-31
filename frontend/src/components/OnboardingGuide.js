import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Link
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import { userApi } from '../utils/api';
import SettingsIcon from '@mui/icons-material/Settings';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import Brightness4Icon from '@mui/icons-material/Brightness4'; // For dark mode icon

const OnboardingGuide = ({ user, open, onClose }) => {
  const { updateCurrentUserLocally } = useAuth();
  const { unitSystem, setUnitPreference, weightUnit } = useUnitSystem();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState(unitSystem === 'imperial' ? 'lbs' : 'kg');
  const [isSaving, setIsSaving] = useState(false);

  const isFirstUser = user?.is_first_user || false;

  const steps = isFirstUser 
    ? ['Welcome & Units', 'Theme Setting', 'Workout Plans'] 
    : ['Welcome & Units'];

  useEffect(() => {
    // Reset step if the dialog re-opens or user changes
    setActiveStep(0);
    setSelectedUnit(unitSystem === 'imperial' ? 'lbs' : 'kg');
  }, [open, user, unitSystem]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleUnitChange = (event) => {
    setSelectedUnit(event.target.value);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    let preferencesUpdated = false;

    try {
      // 1. Update weight unit preference if changed
      const desiredSystem = selectedUnit === 'kg' ? 'metric' : 'imperial';
      if (desiredSystem !== unitSystem) {
        console.log(`Onboarding: Setting unit system to ${desiredSystem}`);
        await setUnitPreference(desiredSystem);
        preferencesUpdated = true;
      }

      // 2. Mark onboarding complete on backend
      console.log('Onboarding: Marking complete on backend.');
      const updatedUser = await userApi.markOnboardingComplete();

      // 3. Update local AuthContext state immediately if not updated by preference change
      if (updatedUser.data && !preferencesUpdated) {
         console.log('Onboarding: Updating local user state.');
         // Update local state with potentially updated user data (including the completed flag)
         updateCurrentUserLocally(updatedUser.data); 
      } else if (updatedUser.data && preferencesUpdated) {
          // If preferences were updated, AuthContext should have been updated already by setUnitPreference
          // But we still need to ensure the onboarding flag is set locally if it wasn't part of the updateProfile response
          // Let's ensure the update includes the flag regardless
          updateCurrentUserLocally({ ...updatedUser.data, has_completed_onboarding: true });
      }

      // 4. Close the dialog
      console.log('OnboardingGuide: Calling onClose()...');
      onClose();
    } catch (error) {
      console.error('Error finishing onboarding:', error);
      // Handle error display if needed (e.g., snackbar)
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Welcome & Units
        return (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Welcome to your Workout Tracker{isFirstUser ? ', Admin' : ''}! Let's quickly set up your preferred weight unit. You can always change this later in your Profile settings.
            </DialogContentText>
            <RadioGroup
              aria-label="weight unit"
              name="weightUnit"
              value={selectedUnit}
              onChange={handleUnitChange}
            >
              <FormControlLabel value="kg" control={<Radio />} label="Kilograms (kg)" />
              <FormControlLabel value="lbs" control={<Radio />} label="Pounds (lbs)" />
            </RadioGroup>
          </>
        );
      case 1: // Theme Setting (First User Only)
        return (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              You can personalize your viewing experience!
            </DialogContentText>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Brightness4Icon />
                <Typography>Toggle between Light and Dark Mode anytime using the theme switcher in the top navigation bar.</Typography>
            </Box>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <SettingsIcon />
                 <Typography>Find this and other options under your <Link component="button" variant="body2" onClick={() => { onClose(); /* Optional: Navigate to profile */ }}>Profile</Link>.</Typography>
            </Box>
          </>
        );
      case 2: // Workout Plans (First User Only)
        return (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Ready to plan your fitness journey?
            </DialogContentText>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenterIcon />
                <Typography>Head over to the <Link component="button" variant="body2" onClick={() => { onClose(); /* Optional: Navigate to plans */ }}>Workout Plans</Link> section in the sidebar to:</Typography>
            </Box>
             <ul style={{ marginTop: '8px', paddingLeft: '40px' }}>
                <li><Typography variant="body2">Explore pre-built plans.</Typography></li>
                <li><Typography variant="body2">Create your own custom routines.</Typography></li>
                <li><Typography variant="body2">Activate a plan to start tracking.</Typography></li>
            </ul>
          </>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="onboarding-dialog-title">
      <DialogTitle id="onboarding-dialog-title">
        {steps[activeStep]}
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleBack} disabled={activeStep === 0 || isSaving}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleFinish} variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Finish Setup'}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingGuide; 
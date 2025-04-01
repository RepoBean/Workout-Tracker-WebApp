import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Box,
  InputAdornment,
  Alert
} from '@mui/material';
import { useUnitSystem } from '../../utils/unitUtils';
import { parseWeightInput } from '../../utils/weightConversion';

const PlanActivationWeightDialog = ({ open, onClose, exercises = [], onSaveWeights, planName }) => {
  const { weightUnit, unitSystem } = useUnitSystem();
  const [weights, setWeights] = useState({});
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // Initialize weights state when exercises change or dialog opens
  useEffect(() => {
    if (open && exercises.length > 0) {
      // Debug logging to see what data we're receiving
      console.log("Exercises received in dialog:", exercises);
      
      const initialWeights = {};
      const initialErrors = {};
      exercises.forEach(ex => {
        // Initialize with empty string for the input field
        initialWeights[ex.exercise_id] = '';
        initialErrors[ex.exercise_id] = false; // No error initially
      });
      setWeights(initialWeights);
      setErrors(initialErrors);
      setGeneralError(null); // Clear any previous errors
    }
  }, [exercises, open]);

  const handleWeightChange = (exerciseId, value) => {
    const newWeights = { ...weights, [exerciseId]: value };
    setWeights(newWeights);

    // Basic validation on change
    const weightValue = parseFloat(value);
    const isValid = !isNaN(weightValue) && weightValue >= 0;
    setErrors(prevErrors => ({ ...prevErrors, [exerciseId]: !isValid && value !== '' }));
  };

  const validateAll = () => {
    let allValid = true;
    const newErrors = { ...errors };
    for (const exerciseId in weights) {
      const value = weights[exerciseId];
      const weightValue = parseFloat(value);
      const isValid = value !== '' && !isNaN(weightValue) && weightValue >= 0;
      if (!isValid) {
        newErrors[exerciseId] = true;
        allValid = false;
      } else {
        newErrors[exerciseId] = false;
      }
    }
    setErrors(newErrors);
    return allValid;
  };

  const handleSave = () => {
    if (!validateAll()) {
      setGeneralError("Please correct the highlighted weights before saving.");
      return;
    }

    try {
      const weightsToSave = {};
      for (const exerciseId in weights) {
        const weightValue = parseFloat(weights[exerciseId]);
        if (!isNaN(weightValue)) {
          // Convert the entered weight (in user's unit) to kg for saving
          weightsToSave[exerciseId] = parseWeightInput(weightValue, unitSystem);
        }
      }

      console.log("Saving initial weights (in kg):", weightsToSave);
      onSaveWeights(weightsToSave); // This function should handle API call
      onClose(); // Close dialog after triggering save
    } catch (error) {
      console.error("Error processing weights:", error);
      setGeneralError("An error occurred while processing weights. Please try again.");
    }
  };

  // Get exercise name safely
  const getExerciseName = (exercise) => {
    // Debug logging for individual exercise
    console.log("Exercise data:", exercise);
    
    // First check the direct name property
    if (exercise.name) {
      return exercise.name;
    }
    // Then check exercise_details
    if (exercise.exercise_details && exercise.exercise_details.name) {
      return exercise.exercise_details.name;
    }
    // Fall back to the original exercise object (for backward compatibility)
    if (exercise.exercise && exercise.exercise.name) {
      return exercise.exercise.name;
    }
    // Last resort
    return `Exercise ID: ${exercise.exercise_id}`;
  };

  // Don't render if closed or no exercises need weights
  if (!open || !exercises || exercises.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set Starting Weights for {planName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Please set your starting weights for each exercise in this workout plan.
          These weights will be used when you start workouts in this plan.
        </Typography>
        
        {generalError && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {generalError}
          </Alert>
        )}
        
        <List>
          {exercises.map((exercise) => (
            <ListItem key={exercise.exercise_id} divider>
              <ListItemText
                primary={getExerciseName(exercise)}
                secondary={`Target: ${exercise.reps || 'N/A'} reps`}
              />
              <Box sx={{ width: '130px' }}>
                <TextField
                  label={`Weight (${weightUnit})`}
                  type="number"
                  size="small"
                  required
                  value={weights[exercise.exercise_id] || ''}
                  onChange={(e) => handleWeightChange(exercise.exercise_id, e.target.value)}
                  InputProps={{
                    inputProps: { min: 0, step: unitSystem === 'metric' ? 1 : 2.5 },
                    endAdornment: <InputAdornment position="end">{weightUnit}</InputAdornment>,
                  }}
                  error={errors[exercise.exercise_id]}
                  helperText={errors[exercise.exercise_id] ? 'Invalid weight' : ''}
                  variant="outlined"
                />
              </Box>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Skip for Now
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Weights
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanActivationWeightDialog; 
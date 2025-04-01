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
  InputAdornment
} from '@mui/material';
import { useUnitSystem } from '../../utils/unitUtils';
import { parseWeightInput } from '../../utils/weightConversion';

const WeightSelectionDialog = ({ open, onClose, exercises = [], onSaveWeights }) => {
  const { weightUnit, unitSystem } = useUnitSystem();
  const [weights, setWeights] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize weights state when exercises change or dialog opens
  useEffect(() => {
    if (open && exercises.length > 0) {
      const initialWeights = {};
      const initialErrors = {};
      exercises.forEach(ex => {
        // Initialize with empty string for the input field
        initialWeights[ex.exercise_id] = '';
        initialErrors[ex.exercise_id] = false; // No error initially
      });
      setWeights(initialWeights);
      setErrors(initialErrors);
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
      console.warn("Validation failed. Please correct the highlighted weights.");
      // TODO: Show a snackbar or persistent message indicating validation errors
      return;
    }

    const weightsToSave = {};
    for (const exerciseId in weights) {
      const weightValue = parseFloat(weights[exerciseId]);
      // Convert the entered weight (in user's unit) to kg for saving
      weightsToSave[exerciseId] = parseWeightInput(weightValue, unitSystem);
    }

    console.log("Saving initial weights (in kg):", weightsToSave);
    onSaveWeights(weightsToSave); // This function should handle API call
    onClose(); // Close dialog after triggering save
  };

  // Don't render if closed or no exercises need weights
  if (!open || !exercises || exercises.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set Initial Weights</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          It looks like this is your first time doing some exercises in this plan.
          Please enter the starting weight you'll use (in {weightUnit}).
          Your progress will be tracked from this point.
        </Typography>
        <List>
          {exercises.map((exercise) => (
            <ListItem key={exercise.exercise_id} divider>
              <ListItemText
                primary={exercise.exercise?.name || `Exercise ID: ${exercise.exercise_id}`}
                secondary={`Target: ${exercise.current_reps || 'N/A'} reps`}
              />
              <Box sx={{ width: '130px' }}> {/* Increased width slightly */}
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
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Weights & Start
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WeightSelectionDialog;
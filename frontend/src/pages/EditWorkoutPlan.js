import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { workoutPlansApi, handleApiError } from '../utils/api';
import ExerciseSelector from '../components/workouts/ExerciseSelector';

const EditWorkoutPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [originalPlan, setOriginalPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Fetch workout plan details
  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await workoutPlansApi.getById(id);
        const plan = response.data;
        
        setOriginalPlan(plan);
        setPlanName(plan.name);
        setPlanDescription(plan.description || '');
        
        // Format exercises with the properties we need
        if (plan.exercises && plan.exercises.length > 0) {
          setExercises(plan.exercises.map(ex => ({
            id: ex.exercise_id || ex.id,
            name: ex.name,
            muscle_group: ex.muscle_group,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            rest_time: ex.rest_time || 60,
            notes: ex.notes || '',
            order: ex.order || 0,
            plan_exercise_id: ex.id // Keep track of the plan_exercise relationship ID
          })));
        }
      } catch (error) {
        console.error('Error fetching workout plan:', error);
        handleApiError(error, setError, 'Failed to load workout plan details');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchPlanDetails();
    }
  }, [id]);
  
  // Mark form as having unsaved changes when data changes
  useEffect(() => {
    if (originalPlan) {
      const hasChanges = 
        planName !== originalPlan.name || 
        planDescription !== (originalPlan.description || '') ||
        JSON.stringify(exercises) !== JSON.stringify(originalPlan.exercises?.map(ex => ({
          id: ex.exercise_id || ex.id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          rest_time: ex.rest_time || 60,
          notes: ex.notes || '',
          order: ex.order || 0,
          plan_exercise_id: ex.id
        })));
      
      setUnsavedChanges(hasChanges);
    }
  }, [planName, planDescription, exercises, originalPlan]);
  
  // Handle form field changes
  const handleNameChange = (e) => {
    setPlanName(e.target.value);
    if (formErrors.name) {
      setFormErrors(prev => ({ ...prev, name: null }));
    }
  };
  
  const handleDescriptionChange = (e) => {
    setPlanDescription(e.target.value);
  };
  
  // Open exercise selector
  const handleAddExercises = () => {
    setSelectorOpen(true);
  };
  
  // Handle selected exercises from selector
  const handleExercisesSelected = (selectedExercises) => {
    // Add default values for new exercises
    const newExercises = selectedExercises.map((exercise) => ({
      ...exercise,
      sets: 3,
      reps: 10,
      rest_time: 60,
      notes: '',
      // If the exercise already exists, don't add it again
      ...(exercises.find(e => e.id === exercise.id) || {})
    }));
    
    // Merge with existing exercises, preventing duplicates
    const mergedExercises = [
      ...exercises.filter(existing => !newExercises.some(newEx => newEx.id === existing.id)),
      ...newExercises
    ];
    
    // Ensure all exercises have an order
    const orderedExercises = mergedExercises.map((ex, index) => ({
      ...ex,
      order: ex.order || index + 1
    }));
    
    setExercises(orderedExercises);
  };
  
  // Configure an exercise (sets, reps, rest)
  const handleConfigureExercise = (exercise) => {
    setCurrentExercise(exercise);
    setExerciseConfigOpen(true);
  };
  
  // Save exercise configuration
  const handleSaveExerciseConfig = () => {
    setExercises(prevExercises => 
      prevExercises.map(ex => 
        ex.id === currentExercise.id ? currentExercise : ex
      )
    );
    setExerciseConfigOpen(false);
  };
  
  // Update current exercise configuration
  const handleExerciseConfigChange = (field, value) => {
    setCurrentExercise(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Remove an exercise from the plan
  const handleRemoveExercise = (exerciseId) => {
    setExercises(prevExercises => prevExercises.filter(ex => ex.id !== exerciseId));
  };
  
  // Handle reordering exercises via drag and drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(exercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property on exercises
    const reorderedExercises = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setExercises(reorderedExercises);
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!planName.trim()) {
      errors.name = 'Plan name is required';
    }
    
    if (exercises.length === 0) {
      errors.exercises = 'At least one exercise is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Update workout plan
  const handleUpdatePlan = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Update the plan basic details
      const planData = {
        name: planName,
        description: planDescription,
        // Keep the is_active status the same
        is_active: originalPlan.is_active
      };
      
      await workoutPlansApi.update(id, planData);
      
      // Get the original exercises to determine what's changed
      const originalExercises = originalPlan.exercises || [];
      
      // Identify exercises to add (new ones)
      const exercisesToAdd = exercises.filter(ex => !ex.plan_exercise_id);
      
      // Identify exercises to update (existing ones with changes)
      const exercisesToUpdate = exercises.filter(ex => ex.plan_exercise_id);
      
      // Identify exercises to remove (ones in original plan but not in current exercises)
      const exercisesToRemove = originalExercises.filter(
        origEx => !exercises.some(ex => ex.plan_exercise_id === origEx.id)
      );
      
      // Process all changes in sequence
      
      // 1. Remove exercises that were deleted
      for (const exToRemove of exercisesToRemove) {
        await workoutPlansApi.removeExercise(id, exToRemove.id);
      }
      
      // 2. Add new exercises
      for (const exToAdd of exercisesToAdd) {
        const exerciseData = {
          exercise_id: exToAdd.id,
          sets: exToAdd.sets,
          reps: exToAdd.reps,
          rest_time: exToAdd.rest_time,
          notes: exToAdd.notes,
          order: exToAdd.order
        };
        
        await workoutPlansApi.addExercise(id, exerciseData);
      }
      
      // 3. Update existing exercises
      for (const exToUpdate of exercisesToUpdate) {
        const exerciseData = {
          sets: exToUpdate.sets,
          reps: exToUpdate.reps,
          rest_time: exToUpdate.rest_time,
          notes: exToUpdate.notes,
          order: exToUpdate.order
        };
        
        await workoutPlansApi.updateExercise(id, exToUpdate.plan_exercise_id, exerciseData);
      }
      
      setSnackbar({
        open: true,
        message: 'Workout plan updated successfully',
        severity: 'success'
      });
      
      // Navigate back to plan details after short delay
      setTimeout(() => {
        navigate(`/workout-plans/${id}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating workout plan:', error);
      setError(handleApiError(error, null, 'Failed to update workout plan'));
      setSnackbar({
        open: true,
        message: 'Failed to update workout plan',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Navigate back to workout plan details
  const handleBack = () => {
    if (unsavedChanges) {
      setConfirmDialogOpen(true);
    } else {
      navigate(`/workout-plans/${id}`);
    }
  };
  
  // Handle confirm dialog
  const handleConfirmDiscard = () => {
    setConfirmDialogOpen(false);
    navigate(`/workout-plans/${id}`);
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !originalPlan) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/workout-plans')}
        >
          Back to Workout Plans
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Edit Workout Plan
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleUpdatePlan}
          disabled={isSaving || !unsavedChanges}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Plan details form */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Plan Details
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Plan Name"
              fullWidth
              required
              value={planName}
              onChange={handleNameChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
              disabled={isSaving}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={planDescription}
              onChange={handleDescriptionChange}
              disabled={isSaving}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Exercises section */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Exercises
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddExercises}
            disabled={isSaving}
          >
            Add Exercises
          </Button>
        </Box>
        
        {formErrors.exercises && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formErrors.exercises}
          </Alert>
        )}
        
        {exercises.length === 0 ? (
          <Alert severity="info">
            No exercises added yet. Click "Add Exercises" to select exercises for this plan.
          </Alert>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <List 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  {exercises.map((exercise, index) => (
                    <Draggable key={exercise.id} draggableId={exercise.id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          divider={index < exercises.length - 1}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleRemoveExercise(exercise.id)}
                              disabled={isSaving}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemIcon {...provided.dragHandleProps}>
                            <DragIcon />
                          </ListItemIcon>
                          
                          <ListItemIcon>
                            <FitnessCenterIcon />
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={exercise.name}
                            secondary={
                              <>
                                {exercise.muscle_group}
                                <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                                  {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_time}s rest
                                </Typography>
                              </>
                            }
                          />
                          
                          <Button
                            size="small"
                            onClick={() => handleConfigureExercise(exercise)}
                            sx={{ mr: 7 }}
                            disabled={isSaving}
                          >
                            Configure
                          </Button>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Paper>
      
      {/* Exercise selector dialog */}
      <ExerciseSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleExercisesSelected}
        selectedExerciseIds={exercises.map(e => e.id)}
      />
      
      {/* Exercise configuration dialog */}
      <Dialog
        open={exerciseConfigOpen}
        onClose={() => setExerciseConfigOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Configure Exercise
        </DialogTitle>
        
        <DialogContent dividers>
          {currentExercise && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6">
                  {currentExercise.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {currentExercise.muscle_group}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sets"
                  type="number"
                  fullWidth
                  value={currentExercise.sets}
                  onChange={(e) => handleExerciseConfigChange('sets', Math.max(1, parseInt(e.target.value) || 1))}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reps"
                  type="number"
                  fullWidth
                  value={currentExercise.reps}
                  onChange={(e) => handleExerciseConfigChange('reps', Math.max(1, parseInt(e.target.value) || 1))}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Rest Time (seconds)"
                  type="number"
                  fullWidth
                  value={currentExercise.rest_time}
                  onChange={(e) => handleExerciseConfigChange('rest_time', Math.max(0, parseInt(e.target.value) || 0))}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={2}
                  value={currentExercise.notes || ''}
                  onChange={(e) => handleExerciseConfigChange('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setExerciseConfigOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveExerciseConfig} 
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirm discard changes dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          Discard Changes?
        </DialogTitle>
        
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to leave without saving?
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDiscard} 
            color="error"
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Loading overlay */}
      {isSaving && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            bgcolor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Saving workout plan...</Typography>
          </Paper>
        </Box>
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditWorkoutPlan; 
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  FitnessCenter as FitnessCenterIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { workoutPlansApi, handleApiError } from '../utils/api';
import ExerciseSelector from '../components/workouts/ExerciseSelector';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { useUnitSystem } from '../utils/unitUtils';
import { parseWeightInput } from '../utils/weightConversion';

const EditWorkoutPlan = () => {
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred, unitSystem, displayWeight } = useUnitSystem();
  const navigate = useNavigate();
  const { id } = useParams();
  
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
  const [selectedDays, setSelectedDays] = useState([]);
  const [expandedDays, setExpandedDays] = useState([]);
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState(null);
  
  // Fetch workout plan details
  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await workoutPlansApi.getById(id);
        const plan = response.data;
        
        console.log('DEBUG - Original plan data from API:', plan);
        console.log('DEBUG - Plan exercises from API:', plan.exercises);
        
        setOriginalPlan(plan);
        setPlanName(plan.name);
        setPlanDescription(plan.description || '');
        
        // Format exercises with the properties we need
        if (plan.exercises && plan.exercises.length > 0) {
          const formattedExercises = plan.exercises.map(ex => {
            // Log the exercise and its weight details
            console.log(`Loading exercise from API: ${ex.name}`);
            
            const formattedEx = {
              id: ex.exercise_id || ex.id,
              name: ex.name,
              muscle_group: ex.muscle_group,
              sets: ex.sets || 3,
              reps: ex.reps || 10,
              rest_seconds: ex.rest_seconds || 60,
              notes: ex.notes || '',
              order: ex.order || 0,
              plan_exercise_id: ex.id,
              day_of_week: ex.day_of_week
            };
            
            return formattedEx;
          });
          
          console.log('DEBUG - All formatted exercises (without target weight):', formattedExercises);
          setExercises(formattedExercises);
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
      const originalFormatted = originalPlan.exercises?.map(ex => ({
        id: ex.exercise_id || ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        rest_seconds: ex.rest_seconds || 60,
        notes: ex.notes || '',
        order: ex.order || 0,
        plan_exercise_id: ex.id,
        day_of_week: ex.day_of_week
      }));

      const currentFormatted = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        order: ex.order,
        plan_exercise_id: ex.plan_exercise_id,
        day_of_week: ex.day_of_week
      }));

      const hasChanges =
        planName !== originalPlan.name ||
        planDescription !== (originalPlan.description || '') ||
        JSON.stringify(currentFormatted) !== JSON.stringify(originalFormatted);

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
  const handleAddExercises = (dayOfWeek = null) => {
    setCurrentDayOfWeek(dayOfWeek);
    setSelectorOpen(true);
  };
  
  // Handle selected exercises from selector
  const handleExercisesSelected = (selectedExercises) => {
    // Add default values for new exercises
    const newExercises = selectedExercises.map((exercise) => ({
      ...exercise,
      sets: 3,
      reps: 10,
      rest_seconds: 60,
      notes: '',
      day_of_week: currentDayOfWeek,
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
    console.log('DEBUG - Configuring exercise:', exercise);
    setCurrentExercise(exercise);
    setExerciseConfigOpen(true);
  };
  
  // Save exercise configuration
  const handleSaveExerciseConfig = () => {
    console.log('DEBUG - Saving exercise config:', currentExercise);
    setExercises(prevExercises => 
      prevExercises.map(ex => 
        ex.id === currentExercise.id ? currentExercise : ex
      )
    );
    setExerciseConfigOpen(false);
  };
  
  // Update current exercise configuration
  const handleExerciseConfigChange = (field, value) => {
    console.log(`DEBUG - Changing exercise config field "${field}" to:`, value);
    
    // Store weight values in the user's preferred unit system in component state
    // IMPORTANT: No conversion happens here - the raw value from the input is stored
    // in the user's current unit system (either kg or lbs).
    // The eventual conversion to kg for database storage happens only at submission time.
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
      
      console.log('DEBUG - Updating plan with data:', planData);
      await workoutPlansApi.update(id, planData);
      
      // Get the original exercises to determine what's changed
      const originalExercises = originalPlan.exercises || [];
      
      // Identify exercises to add (new ones)
      const exercisesToAdd = exercises.filter(ex => !ex.plan_exercise_id);
      console.log('DEBUG - Exercises to add:', exercisesToAdd);
      
      // Identify exercises to update (existing ones with changes)
      const exercisesToUpdate = exercises.filter(ex => ex.plan_exercise_id);
      console.log('DEBUG - Exercises to update:', exercisesToUpdate);
      
      // Identify exercises to remove (ones in original plan but not in current exercises)
      const exercisesToRemove = originalExercises.filter(
        origEx => !exercises.some(ex => ex.plan_exercise_id === origEx.id)
      );
      console.log('DEBUG - Exercises to remove:', exercisesToRemove);
      
      // Process all changes in sequence
      
      // 1. Remove exercises that were deleted
      for (const exToRemove of exercisesToRemove) {
        await workoutPlansApi.removeExercise(id, exToRemove.id);
      }
      
      // 2. Add new exercises
      for (const exToAdd of exercisesToAdd) {
        // Log weight information for debugging
        console.log(`Adding exercise: ${exToAdd.name}`);
        
        const exerciseData = {
          exercise_id: exToAdd.id,
          sets: exToAdd.sets,
          reps: exToAdd.reps,
          rest_seconds: exToAdd.rest_seconds,
          order: exToAdd.order,
          day_of_week: exToAdd.day_of_week
        };
        
        console.log('DEBUG - Adding exercise with data (no target weight):', {
          original: exToAdd,
          formatted: exerciseData,
        });
        
        await workoutPlansApi.addExercise(id, exerciseData);
      }
      
      // 3. Update existing exercises
      for (const exToUpdate of exercisesToUpdate) {
        // Log weight information for debugging
        console.log(`Updating exercise: ${exToUpdate.name || exToUpdate.id}`);
        
        const exerciseData = {
          sets: exToUpdate.sets,
          reps: exToUpdate.reps,
          rest_seconds: exToUpdate.rest_seconds,
          order: exToUpdate.order,
          day_of_week: exToUpdate.day_of_week
        };
        
        console.log('DEBUG - Updating exercise with data (no target weight):', {
          original: exToUpdate,
          formatted: exerciseData,
        });
        
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
  
  // When loading the plan data, initialize selected days
  useEffect(() => {
    if (originalPlan && originalPlan.exercises) {
      // Extract unique days from exercises
      const days = [...new Set(originalPlan.exercises
        .filter(ex => ex.day_of_week)
        .map(ex => ex.day_of_week))]
        .sort((a, b) => a - b);
      
      setSelectedDays(days);
      // Expand the first day by default if there are days
      if (days.length > 0) {
        setExpandedDays([days[0]]);
      }
    }
  }, [originalPlan]);
  
  // Get exercises for a specific day
  const getExercisesForDay = (day) => {
    return exercises.filter(ex => ex.day_of_week === day);
  };
  
  // Handle accordion expansion
  const handleAccordionChange = (day) => (event, isExpanded) => {
    if (isExpanded) {
      setExpandedDays(prev => [...prev, day]);
    } else {
      setExpandedDays(prev => prev.filter(d => d !== day));
    }
  };
  
  // Get weekday name
  const getWeekdayName = (value) => {
    const WEEKDAYS = [
      { name: 'Monday', value: 1 },
      { name: 'Tuesday', value: 2 },
      { name: 'Wednesday', value: 3 },
      { name: 'Thursday', value: 4 },
      { name: 'Friday', value: 5 },
      { name: 'Saturday', value: 6 },
      { name: 'Sunday', value: 7 }
    ];
    const day = WEEKDAYS.find(d => d.value === value);
    return day ? day.name : `Day ${value}`;
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
            Exercises by Day
          </Typography>
        </Box>
        
        {selectedDays.length === 0 ? (
          <Alert severity="info">
            This workout plan doesn't have any days assigned. Add exercises to days to get started.
          </Alert>
        ) : (
          <Box>
            {selectedDays.map(day => (
              <Accordion
                key={day}
                expanded={expandedDays.includes(day)}
                onChange={handleAccordionChange(day)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                      {getWeekdayName(day)} Exercises
                    </Typography>
                    <Badge badgeContent={getExercisesForDay(day).length} color="primary" sx={{ mr: 2 }} />
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddExercises(day);
                      }}
                      sx={{ mr: 2 }}
                    >
                      Add
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {getExercisesForDay(day).length === 0 ? (
                    <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                      No exercises for {getWeekdayName(day)}. Add exercises to this day.
                    </Typography>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId={`day-${day}`}>
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
                            {getExercisesForDay(day).map((exercise, index) => (
                              <Draggable key={String(exercise.id)} draggableId={String(exercise.id)} index={index}>
                                {(provided, snapshot) => (
                                  <ListItem
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    divider={index < getExercisesForDay(day).length - 1}
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
                                    sx={{ 
                                      bgcolor: 'inherit',
                                      '&:hover': { bgcolor: 'action.hover' },
                                      // Add better visual feedback during dragging
                                      boxShadow: snapshot.isDragging ? 3 : 0,
                                      opacity: snapshot.isDragging ? 0.8 : 1,
                                      transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                                      transition: 'box-shadow 0.2s, opacity 0.2s, transform 0.2s'
                                    }}
                                  >
                                    <Box 
                                      {...provided.dragHandleProps}
                                      sx={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'grab',
                                        '&:active': { cursor: 'grabbing' },
                                        mr: 1,
                                        color: 'primary.main',
                                        '&:hover': { color: 'secondary.main' }
                                      }}
                                    >
                                      <DragIcon />
                                    </Box>
                                    
                                    <ListItemIcon>
                                      <FitnessCenterIcon />
                                    </ListItemIcon>
                                    
                                    <ListItemText
                                      primary={exercise.name}
                                      secondary={
                                        <>
                                          {exercise.muscle_group}
                                          <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                                            {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_seconds}s rest
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
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
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

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Rest (seconds)"
                  type="number"
                  fullWidth
                  value={currentExercise?.rest_seconds || ''}
                  onChange={(e) => handleExerciseConfigChange('rest_seconds', Math.max(0, parseInt(e.target.value) || 0))}
                  InputProps={{ inputProps: { min: 0 } }}
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
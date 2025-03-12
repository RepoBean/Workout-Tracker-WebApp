import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CircularProgress,
  InputAdornment,
  Chip
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
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { useUnitSystem } from '../utils/unitUtils';

const CreateWorkoutPlan = () => {
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred } = useUnitSystem();
  const navigate = useNavigate();
  
  // Form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(0);
  const [durationWeeks, setDurationWeeks] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});
  
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
      rest_seconds: 60,
      target_weight: 0,
      notes: '',
      // If the exercise already exists, don't add it again
      ...(exercises.find(e => e.id === exercise.id) || {})
    }));
    
    // Merge with existing exercises, preventing duplicates
    const mergedExercises = [
      ...exercises.filter(existing => !newExercises.some(newEx => newEx.id === existing.id)),
      ...newExercises
    ];
    
    setExercises(mergedExercises);
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
  
  // Create workout plan
  const handleCreatePlan = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Format exercise data for API
      const exerciseData = exercises.map((exercise, index) => ({
        exercise_id: exercise.id,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.rest_seconds,
        target_weight: parseFloat(exercise.target_weight || 0) || 0,
        order: index + 1,
        day_of_week: exercise.day_of_week || null
      }));
      
      // Convert weights to metric for storage if user preference is imperial
      let daysWithConvertedWeights = [...exerciseData];
      
      if (weightUnit === 'lb') {
        // Convert weights to kg for storage
        daysWithConvertedWeights = daysWithConvertedWeights.map(exercise => ({
          ...exercise,
          target_weight: convertFromPreferred(parseFloat(exercise.target_weight || 0) || 0, 'kg')
        }));
      }
      
      const planData = {
        name: planName,
        description: planDescription,
        is_public: true,
        days_per_week: daysPerWeek,
        duration_weeks: durationWeeks,
        exercises: daysWithConvertedWeights
      };
      
      await workoutPlansApi.create(planData);
      
      setSnackbar({
        open: true,
        message: 'Workout plan created successfully',
        severity: 'success'
      });
      
      // Navigate back to plans list after short delay
      setTimeout(() => {
        navigate('/workout-plans');
      }, 1500);
    } catch (error) {
      console.error('Error creating workout plan:', error);
      setError(handleApiError(error, null, 'Failed to create workout plan'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Navigate back to workout plans
  const handleBack = () => {
    navigate('/workout-plans');
  };
  
  // Exercise configuration dialog
  const exerciseConfigDialog = (
    <Dialog open={exerciseConfigOpen} onClose={() => setExerciseConfigOpen(false)}>
      <DialogTitle>Configure Exercise</DialogTitle>
      <DialogContent>
        {currentExercise && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              {currentExercise.name}
            </Typography>
            
            <Grid container spacing={2}>
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
                  label="Rest Between Sets (seconds)"
                  type="number"
                  fullWidth
                  value={currentExercise.rest_seconds}
                  onChange={(e) => handleExerciseConfigChange('rest_seconds', Math.max(0, parseInt(e.target.value) || 0))}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Target Weight"
                  type="number"
                  fullWidth
                  value={currentExercise.target_weight}
                  onChange={(e) => handleExerciseConfigChange('target_weight', Math.max(0, parseFloat(e.target.value) || 0))}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.5 },
                    endAdornment: <InputAdornment position="end">{weightUnit}</InputAdornment>
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="day-of-week-label">Workout Day</InputLabel>
                  <Select
                    labelId="day-of-week-label"
                    value={currentExercise.day_of_week || ''}
                    onChange={(e) => handleExerciseConfigChange('day_of_week', e.target.value)}
                    label="Workout Day"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value={1}>Day 1</MenuItem>
                    <MenuItem value={2}>Day 2</MenuItem>
                    <MenuItem value={3}>Day 3</MenuItem>
                    <MenuItem value={4}>Day 4</MenuItem>
                    <MenuItem value={5}>Day 5</MenuItem>
                    <MenuItem value={6}>Day 6</MenuItem>
                    <MenuItem value={7}>Day 7</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExerciseConfigOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveExerciseConfig} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Create Workout Plan
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleCreatePlan}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Plan'}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Days Per Week"
              type="number"
              fullWidth
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Math.max(0, parseInt(e.target.value) || 0))}
              InputProps={{ inputProps: { min: 0, max: 7 } }}
              helperText="How many days per week this plan requires (0 for flexible)"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duration (Weeks)"
              type="number"
              fullWidth
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Math.max(0, parseInt(e.target.value) || 0))}
              InputProps={{ inputProps: { min: 0 } }}
              helperText="Recommended program length in weeks (0 for ongoing)"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Exercises section */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Exercises ({exercises.length})
          </Typography>
          
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={handleAddExercises}
            disabled={isLoading}
          >
            Add Exercises
          </Button>
        </Box>
        
        {formErrors.exercises && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formErrors.exercises}
          </Alert>
        )}
        
        {/* Weekly Structure View */}
        {exercises.length > 0 && daysPerWeek > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Weekly Structure
            </Typography>
            
            <Grid container spacing={2}>
              {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((day) => {
                const dayExercises = exercises.filter(ex => ex.day_of_week === day);
                return (
                  <Grid item xs={12} sm={6} md={4} key={`day-${day}`}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        backgroundColor: theme => theme.palette.grey[50]
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        Day {day}
                      </Typography>
                      
                      {dayExercises.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No exercises assigned to this day
                        </Typography>
                      ) : (
                        <List dense disablePadding>
                          {dayExercises.map((exercise) => (
                            <ListItem key={exercise.id} disablePadding sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <FitnessCenterIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={exercise.name}
                                secondary={`${exercise.sets}×${exercise.reps}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
              
              {/* Unassigned exercises */}
              {exercises.some(ex => !ex.day_of_week) && (
                <Grid item xs={12} sm={6} md={4}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      height: '100%',
                      backgroundColor: theme => theme.palette.grey[100]
                    }}
                  >
                    <Typography variant="h6" gutterBottom color="text.secondary">
                      Unassigned
                    </Typography>
                    
                    <List dense disablePadding>
                      {exercises.filter(ex => !ex.day_of_week).map((exercise) => (
                        <ListItem key={exercise.id} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FitnessCenterIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={exercise.name}
                            secondary={`${exercise.sets}×${exercise.reps}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
        
        {/* Exercise list with drag and drop */}
        {exercises.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" paragraph>
              No exercises added yet.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddExercises}
            >
              Add Exercises
            </Button>
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <List 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  component="div"
                  sx={{ 
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 3
                  }}
                >
                  {exercises.map((exercise, index) => (
                    <Draggable key={exercise.id} draggableId={exercise.id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          divider
                          secondaryAction={
                            <>
                              <IconButton 
                                edge="end" 
                                aria-label="delete"
                                onClick={() => handleRemoveExercise(exercise.id)}
                                disabled={isLoading}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          }
                        >
                          <ListItemIcon {...provided.dragHandleProps}>
                            <DragIcon />
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {exercise.name}
                                {exercise.day_of_week && (
                                  <Chip 
                                    label={`Day ${exercise.day_of_week}`} 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                    color="primary"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                {exercise.muscle_group}
                                <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                                  {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_seconds}s rest
                                  {exercise.target_weight > 0 && ` • ${exercise.target_weight} ${weightUnit}`}
                                </Typography>
                              </>
                            }
                          />
                          
                          <Button
                            size="small"
                            onClick={() => handleConfigureExercise(exercise)}
                            sx={{ mr: 7 }}
                            disabled={isLoading}
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
      {exerciseConfigDialog}
      
      {/* Loading overlay */}
      {isLoading && (
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
            <Typography>Creating workout plan...</Typography>
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

export default CreateWorkoutPlan; 
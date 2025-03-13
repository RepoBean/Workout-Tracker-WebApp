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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardHeader,
  CardContent,
  Tooltip,
  Badge,
  Switch,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  FitnessCenter as FitnessCenterIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  FilterList as FilterListIcon,
  MoveUp as MoveUpIcon,
  MoveDown as MoveDownIcon,
  SwapVert as SwapVertIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { workoutPlansApi, handleApiError } from '../utils/api';
import ExerciseSelector from '../components/workouts/ExerciseSelector';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { useUnitSystem } from '../utils/unitUtils';

// Define weekdays with their index values (1-7, where 1 is Monday as per ISO standard)
const WEEKDAYS = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 7 }
];

const CreateWorkoutPlan = () => {
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred } = useUnitSystem();
  const navigate = useNavigate();
  
  // Form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [durationWeeks, setDurationWeeks] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});
  
  // New state for accordion UI
  const [expandedDay, setExpandedDay] = useState(null);
  
  // Batch operations state
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [batchConfigOpen, setBatchConfigOpen] = useState(false);
  const [batchConfigValues, setBatchConfigValues] = useState({
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    target_weight: 0,
    day_of_week: null,
    progression_type: 'weight',
    progression_value: 2.5,
    progression_threshold: 2
  });
  const [batchConfigFields, setBatchConfigFields] = useState({
    sets: false,
    reps: false,
    rest_seconds: false,
    target_weight: false,
    day_of_week: false,
    progression_type: false,
    progression_value: false,
    progression_threshold: false
  });
  
  // Current day for adding exercises
  const [currentAddDay, setCurrentAddDay] = useState(null);
  
  // Workflow steps
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Plan Details & Days', 'Assign Exercises'];
  
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

  // Handle day selection changes
  const handleDayToggle = (dayValue) => {
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        return prev.filter(d => d !== dayValue);
      } else {
        return [...prev, dayValue].sort((a, b) => a - b);
      }
    });
  };

  // Open exercise selector
  const handleAddExercises = (dayOfWeek = null) => {
    setCurrentAddDay(dayOfWeek);
    setSelectorOpen(true);
  };
  
  // Handle accordion expansion
  const handleAccordionChange = (day) => (event, isExpanded) => {
    setExpandedDay(isExpanded ? day : null);
  };
  
  // Toggle exercise selection for batch operations
  const handleToggleExerciseSelection = (exerciseId) => {
    setSelectedExerciseIds(prev => {
      if (prev.includes(exerciseId)) {
        return prev.filter(id => id !== exerciseId);
      } else {
        return [...prev, exerciseId];
      }
    });
  };
  
  // Select all exercises for a specific day
  const handleSelectAllForDay = (day) => {
    const dayExercises = exercises.filter(ex => ex.day_of_week === day);
    const dayExerciseIds = dayExercises.map(ex => ex.id);
    
    if (dayExerciseIds.every(id => selectedExerciseIds.includes(id))) {
      // If all are selected, deselect all
      setSelectedExerciseIds(prev => prev.filter(id => !dayExerciseIds.includes(id)));
    } else {
      // Otherwise, select all
      setSelectedExerciseIds(prev => [...prev, ...dayExerciseIds.filter(id => !prev.includes(id))]);
    }
  };
  
  // Clear all exercise selections
  const handleClearExerciseSelection = () => {
    setSelectedExerciseIds([]);
  };
  
  // Open batch configuration dialog
  const handleOpenBatchConfig = () => {
    // Set default values based on first selected exercise
    if (selectedExerciseIds.length > 0) {
      const firstExercise = exercises.find(ex => ex.id === selectedExerciseIds[0]);
      if (firstExercise) {
        setBatchConfigValues({
          sets: firstExercise.sets,
          reps: firstExercise.reps,
          rest_seconds: firstExercise.rest_seconds,
          target_weight: firstExercise.target_weight,
          day_of_week: firstExercise.day_of_week
        });
      }
    }
    
    // Reset field selection
    setBatchConfigFields({
      sets: false,
      reps: false,
      rest_seconds: false,
      target_weight: false,
      day_of_week: false
    });
    
    setBatchConfigOpen(true);
  };
  
  // Update batch configuration values
  const handleBatchConfigValueChange = (field, value) => {
    setBatchConfigValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Toggle which fields to apply in batch update
  const handleBatchConfigFieldToggle = (field) => {
    setBatchConfigFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  // Apply batch configuration to selected exercises
  const handleSaveBatchConfig = () => {
    const updatedExercises = exercises.map(exercise => {
      if (!selectedExerciseIds.includes(exercise.id)) {
        return exercise;
      }
      
      // Apply only selected fields
      const updates = {};
      Object.keys(batchConfigFields).forEach(field => {
        if (batchConfigFields[field]) {
          updates[field] = batchConfigValues[field];
        }
      });
      
      return { ...exercise, ...updates };
    });
    
    setExercises(updatedExercises);
    setBatchConfigOpen(false);
  };
  
  // Move selected exercises to a different day
  const handleMoveSelectedExercises = (targetDay) => {
    const updatedExercises = exercises.map(exercise => {
      if (selectedExerciseIds.includes(exercise.id)) {
        return { ...exercise, day_of_week: targetDay };
      }
      return exercise;
    });
    
    setExercises(updatedExercises);
    setSelectedExerciseIds([]);
  };
  
  // Get exercises for a specific day
  const getExercisesForDay = (day) => {
    return exercises.filter(exercise => exercise.day_of_week === day);
  };
  
  // Get unassigned exercises
  const getUnassignedExercises = () => {
    return exercises.filter(exercise => !exercise.day_of_week);
  };
  
  // Handle selected exercises from selector
  const handleExercisesSelected = (selectedExercises) => {
    // Exercises are now fully configured with sets, reps, weights, and day assignments
    // from the ExerciseSelector component
    
    // Merge with existing exercises, preventing duplicates
    const mergedExercises = [
      ...exercises.filter(existing => !selectedExercises.some(newEx => newEx.id === existing.id)),
      ...selectedExercises
    ];
    
    setExercises(mergedExercises);
    
    // If adding to a specific day's accordion, expand that day
    if (currentAddDay !== null) {
      setExpandedDay(currentAddDay);
    }
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
    setSelectedExerciseIds(prev => prev.filter(id => id !== exerciseId));
  };
  
  // Remove selected exercises
  const handleRemoveSelectedExercises = () => {
    setExercises(prevExercises => prevExercises.filter(ex => !selectedExerciseIds.includes(ex.id)));
    setSelectedExerciseIds([]);
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
    
    if (selectedDays.length === 0) {
      errors.days = 'Please select at least one workout day';
    }
    
    // Check if all exercises are assigned to days
    if (getUnassignedExercises().length > 0) {
      errors.exercises = 'All exercises must be assigned to workout days';
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
        order: exercise.order || index + 1, // Use existing order if available
        day_of_week: exercise.day_of_week || null,
        progression_type: exercise.progression_type || 'weight',
        progression_value: parseFloat(exercise.progression_value || 2.5) || 2.5,
        progression_threshold: parseInt(exercise.progression_threshold || 2) || 2
      }));
      
      // Convert weights to metric for storage if user preference is imperial
      let exercisesWithConvertedWeights = [...exerciseData];
      
      if (weightUnit === 'lb') {
        // Convert weights to kg for storage
        exercisesWithConvertedWeights = exercisesWithConvertedWeights.map(exercise => ({
          ...exercise,
          target_weight: convertFromPreferred(parseFloat(exercise.target_weight || 0) || 0, 'kg'),
          // Also convert progression value if the progression is weight-based
          progression_value: exercise.progression_type === 'weight' 
            ? convertFromPreferred(parseFloat(exercise.progression_value || 0) || 0, 'kg')
            : exercise.progression_value
        }));
      }
      
      const planData = {
        name: planName,
        description: planDescription,
        is_public: true,
        days_per_week: selectedDays.length,
        duration_weeks: durationWeeks,
        exercises: exercisesWithConvertedWeights
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
  
  // Get weekday name from value
  const getWeekdayName = (value) => {
    const day = WEEKDAYS.find(d => d.value === value);
    return day ? day.name : `Day ${value}`;
  };
  
  // Exercise configuration dialog
  const exerciseConfigDialog = (
    <Dialog open={exerciseConfigOpen} onClose={() => setExerciseConfigOpen(false)} maxWidth="md">
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
                    required
                  >
                    <MenuItem value="">Not assigned</MenuItem>
                    {selectedDays.map((day) => (
                      <MenuItem key={day} value={day}>
                        {getWeekdayName(day)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Progression System
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="progression-type-label">Progression Type</InputLabel>
                  <Select
                    labelId="progression-type-label"
                    value={currentExercise.progression_type || 'weight'}
                    onChange={(e) => handleExerciseConfigChange('progression_type', e.target.value)}
                    label="Progression Type"
                  >
                    <MenuItem value="weight">Weight Increase</MenuItem>
                    <MenuItem value="reps">Rep Increase</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  How to progress in this exercise over time
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Progression Value"
                  type="number"
                  fullWidth
                  value={currentExercise.progression_value || ''}
                  onChange={(e) => handleExerciseConfigChange('progression_value', Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  InputProps={{ 
                    inputProps: { min: 0.5, step: 0.5 },
                    endAdornment: <InputAdornment position="end">
                      {currentExercise.progression_type === 'weight' ? weightUnit : 'reps'}
                    </InputAdornment>
                  }}
                  disabled={currentExercise.progression_type === 'none'}
                />
                <Typography variant="caption" color="text.secondary">
                  Amount to increase when progression occurs
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Progression Threshold"
                  type="number"
                  fullWidth
                  value={currentExercise.progression_threshold || ''}
                  onChange={(e) => handleExerciseConfigChange('progression_threshold', Math.max(1, parseInt(e.target.value) || 1))}
                  InputProps={{ 
                    inputProps: { min: 1 },
                    endAdornment: <InputAdornment position="end">sessions</InputAdornment>
                  }}
                  disabled={currentExercise.progression_type === 'none'}
                />
                <Typography variant="caption" color="text.secondary">
                  Number of successful sessions before progressing
                </Typography>
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
  
  // Batch configuration dialog
  const batchConfigDialog = (
    <Dialog open={batchConfigOpen} onClose={() => setBatchConfigOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        Batch Configure Exercises ({selectedExerciseIds.length} selected)
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select which properties to update and set their values. Only checked properties will be changed.
            </Alert>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Basic Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.sets} 
                onChange={() => handleBatchConfigFieldToggle('sets')}
              />
              <Typography>Sets</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.sets}
              onChange={(e) => handleBatchConfigValueChange('sets', Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{ inputProps: { min: 1 } }}
              disabled={!batchConfigFields.sets}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.reps} 
                onChange={() => handleBatchConfigFieldToggle('reps')}
              />
              <Typography>Reps</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.reps}
              onChange={(e) => handleBatchConfigValueChange('reps', Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{ inputProps: { min: 1 } }}
              disabled={!batchConfigFields.reps}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.rest_seconds} 
                onChange={() => handleBatchConfigFieldToggle('rest_seconds')}
              />
              <Typography>Rest (seconds)</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.rest_seconds}
              onChange={(e) => handleBatchConfigValueChange('rest_seconds', Math.max(0, parseInt(e.target.value) || 0))}
              InputProps={{ inputProps: { min: 0 } }}
              disabled={!batchConfigFields.rest_seconds}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.target_weight} 
                onChange={() => handleBatchConfigFieldToggle('target_weight')}
              />
              <Typography>Target Weight</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.target_weight}
              onChange={(e) => handleBatchConfigValueChange('target_weight', Math.max(0, parseFloat(e.target.value) || 0))}
              InputProps={{ 
                inputProps: { min: 0, step: 0.5 },
                endAdornment: <InputAdornment position="end">{weightUnit}</InputAdornment>
              }}
              disabled={!batchConfigFields.target_weight}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.day_of_week} 
                onChange={() => handleBatchConfigFieldToggle('day_of_week')}
              />
              <Typography>Workout Day</Typography>
            </Box>
            <FormControl fullWidth disabled={!batchConfigFields.day_of_week}>
              <InputLabel id="batch-day-of-week-label">Workout Day</InputLabel>
              <Select
                labelId="batch-day-of-week-label"
                value={batchConfigValues.day_of_week || ''}
                onChange={(e) => handleBatchConfigValueChange('day_of_week', e.target.value)}
                label="Workout Day"
              >
                <MenuItem value="">Not assigned</MenuItem>
                {selectedDays.map((day) => (
                  <MenuItem key={day} value={day}>
                    {getWeekdayName(day)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Progression System
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.progression_type} 
                onChange={() => handleBatchConfigFieldToggle('progression_type')}
              />
              <Typography>Progression Type</Typography>
            </Box>
            <FormControl fullWidth disabled={!batchConfigFields.progression_type}>
              <InputLabel id="batch-progression-type-label">Type</InputLabel>
              <Select
                labelId="batch-progression-type-label"
                value={batchConfigValues.progression_type || 'weight'}
                onChange={(e) => handleBatchConfigValueChange('progression_type', e.target.value)}
                label="Type"
              >
                <MenuItem value="weight">Weight Increase</MenuItem>
                <MenuItem value="reps">Rep Increase</MenuItem>
                <MenuItem value="none">None</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.progression_value} 
                onChange={() => handleBatchConfigFieldToggle('progression_value')}
              />
              <Typography>Progress Value</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.progression_value}
              onChange={(e) => handleBatchConfigValueChange('progression_value', Math.max(0.5, parseFloat(e.target.value) || 0.5))}
              InputProps={{ 
                inputProps: { min: 0.5, step: 0.5 },
                endAdornment: <InputAdornment position="end">
                  {batchConfigValues.progression_type === 'weight' ? weightUnit : 'reps'}
                </InputAdornment>
              }}
              disabled={!batchConfigFields.progression_value || batchConfigValues.progression_type === 'none'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox 
                checked={batchConfigFields.progression_threshold} 
                onChange={() => handleBatchConfigFieldToggle('progression_threshold')}
              />
              <Typography>Progress Threshold</Typography>
            </Box>
            <TextField
              type="number"
              fullWidth
              value={batchConfigValues.progression_threshold}
              onChange={(e) => handleBatchConfigValueChange('progression_threshold', Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{ 
                inputProps: { min: 1 },
                endAdornment: <InputAdornment position="end">sessions</InputAdornment>
              }}
              disabled={!batchConfigFields.progression_threshold || batchConfigValues.progression_type === 'none'}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBatchConfigOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleSaveBatchConfig} 
          variant="contained" 
          color="primary"
          disabled={!Object.values(batchConfigFields).some(Boolean)}
        >
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  // Handle step navigation
  const handleNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      if (!planName.trim()) {
        setFormErrors({...formErrors, name: 'Plan name is required'});
        return;
      }
      if (selectedDays.length === 0) {
        setFormErrors({...formErrors, days: 'Please select at least one workout day'});
        return;
      }
      // Clear errors and move to next step
      setFormErrors({});
      setCurrentStep(1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

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
          disabled={isLoading || currentStep === 0}
        >
          {isLoading ? 'Creating...' : 'Create Plan'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Stepper */}
      <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Step 1: Plan Details */}
      {currentStep === 0 && (
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
                label="Duration (Weeks)"
                type="number"
                fullWidth
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Math.max(0, parseInt(e.target.value) || 0))}
                InputProps={{ inputProps: { min: 0 } }}
                helperText="Recommended program length in weeks (0 for ongoing)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Workout Days
              </Typography>
              {formErrors.days && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formErrors.days}
                </Alert>
              )}
              <FormGroup row>
                {WEEKDAYS.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={selectedDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        disabled={isLoading}
                      />
                    }
                    label={day.name}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNextStep}
              disabled={selectedDays.length === 0 || !planName.trim()}
            >
              Continue to Exercise Assignment
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Step 2: Exercise Assignment */}
      {currentStep === 1 && (
        <Paper sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Exercises ({exercises.length})
            </Typography>
            
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => handleAddExercises(expandedDay)}
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
          
          {/* Batch actions section */}
          {selectedExerciseIds.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'action.hover', 
              p: 2, 
              borderRadius: 1,
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>
                {selectedExerciseIds.length} exercises selected
              </Typography>
              
              <Button 
                size="small" 
                onClick={handleOpenBatchConfig}
                startIcon={<TuneIcon />}
                sx={{ mr: 1 }}
              >
                Configure
              </Button>
              
              <FormControl size="small" sx={{ minWidth: 120, mx: 1 }}>
                <InputLabel id="move-to-day-label">Move to</InputLabel>
                <Select
                  labelId="move-to-day-label"
                  value=""
                  label="Move to"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMoveSelectedExercises(e.target.value);
                    }
                  }}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select day</MenuItem>
                  <MenuItem value={null}>Unassigned</MenuItem>
                  {selectedDays.map(day => (
                    <MenuItem key={day} value={day}>
                      {getWeekdayName(day)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button 
                size="small" 
                color="error" 
                onClick={handleRemoveSelectedExercises}
                startIcon={<DeleteIcon />}
                sx={{ mx: 1 }}
              >
                Remove
              </Button>
              
              <Button 
                size="small" 
                onClick={handleClearExerciseSelection}
                sx={{ ml: 'auto' }}
              >
                Clear Selection
              </Button>
            </Box>
          )}
          
          {/* Unassigned exercises section */}
          <Accordion
            expanded={expandedDay === null}
            onChange={handleAccordionChange(null)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  Unassigned Exercises
                </Typography>
                <Badge badgeContent={getUnassignedExercises().length} color="error" sx={{ mr: 2 }} />
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddExercises(null);
                  }}
                  sx={{ mr: 2 }}
                >
                  Add
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {getUnassignedExercises().length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                  No unassigned exercises. All exercises are assigned to workout days.
                </Typography>
              ) : (
                <Box sx={{ mb: 2 }}>
                  {/* Select all checkbox */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      checked={getUnassignedExercises().every(ex => selectedExerciseIds.includes(ex.id))}
                      indeterminate={
                        getUnassignedExercises().some(ex => selectedExerciseIds.includes(ex.id)) &&
                        !getUnassignedExercises().every(ex => selectedExerciseIds.includes(ex.id))
                      }
                      onChange={() => handleSelectAllForDay(null)}
                    />
                    <Typography>Select All</Typography>
                  </Box>
                  
                  {/* Exercise List */}
                  <List>
                    {getUnassignedExercises().map((exercise, index) => (
                      <ListItem 
                        key={exercise.id} 
                        divider
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveExercise(exercise.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        sx={{ 
                          bgcolor: selectedExerciseIds.includes(exercise.id) ? 'action.selected' : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <Checkbox
                          checked={selectedExerciseIds.includes(exercise.id)}
                          onChange={() => handleToggleExerciseSelection(exercise.id)}
                          edge="start"
                        />
                        
                        <ListItemText
                          primary={exercise.name}
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
                          sx={{ mr: 4 }}
                        >
                          Configure
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
          
          {/* Workout day sections */}
          {selectedDays.map(day => (
            <Accordion
              key={day}
              expanded={expandedDay === day}
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
                  <Box sx={{ mb: 2 }}>
                    {/* Select all checkbox */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Checkbox
                        checked={getExercisesForDay(day).every(ex => selectedExerciseIds.includes(ex.id))}
                        indeterminate={
                          getExercisesForDay(day).some(ex => selectedExerciseIds.includes(ex.id)) &&
                          !getExercisesForDay(day).every(ex => selectedExerciseIds.includes(ex.id))
                        }
                        onChange={() => handleSelectAllForDay(day)}
                      />
                      <Typography>Select All</Typography>
                    </Box>
                    
                    {/* Exercise List for this day */}
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId={`day-${day}`}>
                        {(provided) => (
                          <List
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {getExercisesForDay(day).map((exercise, index) => (
                              <Draggable key={exercise.id} draggableId={exercise.id} index={index}>
                                {(provided) => (
                                  <ListItem 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    divider
                                    secondaryAction={
                                      <IconButton
                                        edge="end"
                                        onClick={() => handleRemoveExercise(exercise.id)}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    }
                                    sx={{ 
                                      bgcolor: selectedExerciseIds.includes(exercise.id) ? 'action.selected' : 'inherit',
                                      '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedExerciseIds.includes(exercise.id)}
                                      onChange={() => handleToggleExerciseSelection(exercise.id)}
                                      edge="start"
                                    />
                                    
                                    <ListItemIcon {...provided.dragHandleProps} sx={{ minWidth: '36px' }}>
                                      <DragIcon />
                                    </ListItemIcon>
                                    
                                    <ListItemText
                                      primary={exercise.name}
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
                                      sx={{ mr: 4 }}
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
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handlePreviousStep}
            >
              Back to Plan Details
            </Button>
            
            <Button
              variant="contained" 
              color="primary"
              onClick={handleCreatePlan}
              disabled={getUnassignedExercises().length > 0 || exercises.length === 0}
              startIcon={<SaveIcon />}
            >
              Create Plan
            </Button>
          </Box>
          
          {getUnassignedExercises().length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please assign all exercises to workout days before creating the plan.
            </Alert>
          )}
        </Paper>
      )}
      
      {/* Exercise selector dialog */}
      <ExerciseSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleExercisesSelected}
        selectedExerciseIds={exercises.map(e => e.id)}
        selectedDays={selectedDays}
        currentAddDay={currentAddDay}
      />
      
      {/* Exercise configuration dialog */}
      {exerciseConfigDialog}
      
      {/* Batch configuration dialog */}
      {batchConfigDialog}
      
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
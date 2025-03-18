import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FitnessCenter as FitnessCenterIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { exercisesApi } from '../../utils/api';
import { useUnitSystem } from '../../utils/unitUtils';

// Define weekdays with their index values
const WEEKDAYS = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 7 }
];

/**
 * Component for selecting exercises for workout plans
 */
const ExerciseSelector = ({ open, onClose, onSelect, selectedExerciseIds = [], selectedDays = [], currentAddDay = null }) => {
  const { weightUnit, displayWeight } = useUnitSystem();
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [categories, setCategories] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Configuration step state
  const [activeStep, setActiveStep] = useState(0);
  const [configuredExercises, setConfiguredExercises] = useState([]);
  
  // Default values for batch configuration
  const [defaultValues, setDefaultValues] = useState({
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    target_weight: 0,
    day_of_week: selectedDays.length > 0 ? selectedDays[0] : null
  });

  // Initialize component
  useEffect(() => {
    if (open) {
      // Don't pre-select exercises when adding to days
      // This allows the same exercise to be added to multiple days
      setSelectedExercises([]);
      setActiveStep(0);
      fetchExercises();
    }
  }, [open]);

  // Fetch exercises from API
  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch exercises
      const response = await exercisesApi.getAll();
      const exercisesData = response.data;
      setExercises(exercisesData);
      setFilteredExercises(exercisesData);
      
      // Extract unique categories and muscle groups
      const uniqueCategories = [...new Set(exercisesData.map(ex => ex.category).filter(Boolean))];
      const uniqueMuscleGroups = [...new Set(exercisesData.map(ex => ex.muscle_group).filter(Boolean))];
      
      setCategories(uniqueCategories);
      setMuscleGroups(uniqueMuscleGroups);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setError('Failed to load exercises. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter exercises based on search and filters
  useEffect(() => {
    if (!exercises.length) return;
    
    let filtered = [...exercises];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(exercise => 
        exercise.name.toLowerCase().includes(searchLower) ||
        (exercise.description && exercise.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory);
    }
    
    // Apply muscle group filter
    if (selectedMuscleGroup) {
      filtered = filtered.filter(exercise => exercise.muscle_group === selectedMuscleGroup);
    }
    
    setFilteredExercises(filtered);
  }, [searchTerm, selectedCategory, selectedMuscleGroup, exercises]);

  // Toggle exercise selection
  const handleToggleExercise = (exerciseId) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseId)) {
        return prev.filter(id => id !== exerciseId);
      } else {
        return [...prev, exerciseId];
      }
    });
  };

  // Update search term
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Update category filter
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  // Update muscle group filter
  const handleMuscleGroupChange = (e) => {
    setSelectedMuscleGroup(e.target.value);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedMuscleGroup('');
  };

  // Handle moving to configuration step
  const handleMoveToConfig = () => {
    // Create configured exercises based on selected IDs
    const selectedExerciseObjects = exercises
      .filter(ex => selectedExercises.includes(ex.id))
      .map(ex => ({
        ...ex,
        sets: defaultValues.sets,
        reps: defaultValues.reps,
        rest_seconds: defaultValues.rest_seconds,
        target_weight: defaultValues.target_weight,
        // Always use currentAddDay to ensure exercises are properly assigned to the selected day
        day_of_week: currentAddDay,
        progression_type: 'weight',
        progression_value: 2.5,
        progression_threshold: 2
      }));
    
    setConfiguredExercises(selectedExerciseObjects);
    setActiveStep(1);
  };

  // Handle going back to selection step
  const handleBackToSelection = () => {
    setActiveStep(0);
  };

  // Update default values for batch configuration
  const handleDefaultValueChange = (field, value) => {
    setDefaultValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply default values to all configured exercises
  const handleApplyToAll = (field) => {
    setConfiguredExercises(prev => 
      prev.map(ex => ({
        ...ex,
        [field]: defaultValues[field]
      }))
    );
  };

  // Update a single configured exercise
  const handleUpdateExercise = (index, field, value) => {
    const updatedExercises = [...configuredExercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value
    };
    setConfiguredExercises(updatedExercises);
    
    // If day_of_week is being changed, clear the selection for this exercise
    if (field === 'day_of_week') {
      setSelectedExercises(prev => {
        // If we're unselecting, don't change anything
        if (value === null) return prev;
        // Clear selection when moving exercise to a specific day
        return prev.filter(id => id !== updatedExercises[index].id);
      });
    }
  };

  // Handle selection confirmation
  const handleConfirm = () => {
    onSelect(configuredExercises);
    onClose();
  };

  // Render weekday options as menu items
  const renderWeekdayOptions = () => {
    return [
      <MenuItem key="none" value={null}>Not assigned</MenuItem>,
      ...selectedDays.map(day => {
        const weekday = WEEKDAYS.find(d => d.value === day);
        return (
          <MenuItem key={day} value={day}>
            {weekday ? weekday.name : `Day ${day}`}
          </MenuItem>
        );
      })
    ];
  };

  // Get weekday name from value
  const getWeekdayName = (value) => {
    const day = WEEKDAYS.find(d => d.value === value);
    return day ? day.name : (value ? `Day ${value}` : 'Not assigned');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="exercise-selector-dialog"
    >
      <DialogTitle id="exercise-selector-dialog" sx={{ pb: 1 }}>
        {activeStep === 0 ? 'Select Exercises' : 'Configure Exercises'}
      </DialogTitle>

      <Box sx={{ width: '100%', px: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          <Step>
            <StepLabel>Select Exercises</StepLabel>
          </Step>
          <Step>
            <StepLabel>Configure Sets, Reps & Weight</StepLabel>
          </Step>
        </Stepper>
      </Box>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {activeStep === 0 ? (
          // STEP 1: Exercise Selection
          <>
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                {/* Search input */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton onClick={handleClearSearch} edge="end" size="small">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                {/* Category filter */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="category-select-label">Category</InputLabel>
                    <Select
                      labelId="category-select-label"
                      value={selectedCategory}
                      label="Category"
                      onChange={handleCategoryChange}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Muscle group filter */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="muscle-group-select-label">Muscle Group</InputLabel>
                    <Select
                      labelId="muscle-group-select-label"
                      value={selectedMuscleGroup}
                      label="Muscle Group"
                      onChange={handleMuscleGroupChange}
                    >
                      <MenuItem value="">All Muscle Groups</MenuItem>
                      {muscleGroups.map((group) => (
                        <MenuItem key={group} value={group}>
                          {group}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {/* Filter controls and stats */}
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  size="small" 
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {selectedExercises.length} selected / {filteredExercises.length} shown
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Exercise list */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredExercises.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                No exercises found. Try adjusting your filters.
              </Typography>
            ) : (
              <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
                {filteredExercises.map((exercise) => (
                  <ListItem key={exercise.id} divider>
                    <ListItemIcon>
                      <FitnessCenterIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={exercise.name}
                      secondary={
                        <>
                          {exercise.muscle_group && (
                            <Typography component="span" variant="body2" color="text.secondary">
                              {exercise.muscle_group}
                            </Typography>
                          )}
                          {exercise.category && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              • {exercise.category}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Checkbox
                        edge="end"
                        onChange={() => handleToggleExercise(exercise.id)}
                        checked={selectedExercises.includes(exercise.id)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        ) : (
          // STEP 2: Exercise Configuration
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Default Values (For All Exercises)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Sets"
                      type="number"
                      fullWidth
                      value={defaultValues.sets}
                      onChange={(e) => handleDefaultValueChange('sets', Math.max(1, parseInt(e.target.value) || 1))}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                    <Button 
                      size="small" 
                      onClick={() => handleApplyToAll('sets')}
                      sx={{ mt: 1 }}
                    >
                      Apply to All
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Reps"
                      type="number"
                      fullWidth
                      value={defaultValues.reps}
                      onChange={(e) => handleDefaultValueChange('reps', Math.max(1, parseInt(e.target.value) || 1))}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                    <Button 
                      size="small" 
                      onClick={() => handleApplyToAll('reps')}
                      sx={{ mt: 1 }}
                    >
                      Apply to All
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Rest (seconds)"
                      type="number"
                      fullWidth
                      value={defaultValues.rest_seconds}
                      onChange={(e) => handleDefaultValueChange('rest_seconds', Math.max(0, parseInt(e.target.value) || 0))}
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                    <Button 
                      size="small" 
                      onClick={() => handleApplyToAll('rest_seconds')}
                      sx={{ mt: 1 }}
                    >
                      Apply to All
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Target Weight"
                      type="number"
                      fullWidth
                      value={defaultValues.target_weight || 0}
                      onChange={(e) => handleDefaultValueChange('target_weight', Math.max(0, parseFloat(e.target.value) || 0))}
                      InputProps={{
                        inputProps: { min: 0, step: 2.5 },
                        endAdornment: <InputAdornment position="end">{weightUnit}</InputAdornment>
                      }}
                    />
                    <Button 
                      size="small" 
                      onClick={() => handleApplyToAll('target_weight')}
                      sx={{ mt: 1 }}
                    >
                      Apply to All
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="default-day-label">Workout Day</InputLabel>
                      <Select
                        labelId="default-day-label"
                        value={defaultValues.day_of_week}
                        onChange={(e) => handleDefaultValueChange('day_of_week', e.target.value)}
                        label="Workout Day"
                      >
                        {renderWeekdayOptions()}
                      </Select>
                    </FormControl>
                    <Button 
                      size="small" 
                      onClick={() => handleApplyToAll('day_of_week')}
                      sx={{ mt: 1 }}
                    >
                      Apply to All
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Exercise Configuration
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '400px', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Exercise</TableCell>
                    <TableCell align="center">Sets</TableCell>
                    <TableCell align="center">Reps</TableCell>
                    <TableCell align="center">Rest (s)</TableCell>
                    <TableCell align="center">Weight ({weightUnit})</TableCell>
                    <TableCell align="center">Day</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configuredExercises.map((exercise, index) => (
                    <TableRow key={exercise.id}>
                      <TableCell>
                        <Tooltip title={exercise.muscle_group || ''}>
                          <Typography variant="body2">{exercise.name}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.sets}
                          onChange={(e) => handleUpdateExercise(index, 'sets', Math.max(1, parseInt(e.target.value) || 1))}
                          InputProps={{ inputProps: { min: 1, style: { textAlign: 'center' } } }}
                          sx={{ width: '70px' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.reps}
                          onChange={(e) => handleUpdateExercise(index, 'reps', Math.max(1, parseInt(e.target.value) || 1))}
                          InputProps={{ inputProps: { min: 1, style: { textAlign: 'center' } } }}
                          sx={{ width: '70px' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.rest_seconds}
                          onChange={(e) => handleUpdateExercise(index, 'rest_seconds', Math.max(0, parseInt(e.target.value) || 0))}
                          InputProps={{ inputProps: { min: 0, style: { textAlign: 'center' } } }}
                          sx={{ width: '70px' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {displayWeight(exercise.target_weight)}
                      </TableCell>
                      <TableCell align="center">
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={exercise.day_of_week}
                            onChange={(e) => handleUpdateExercise(index, 'day_of_week', e.target.value)}
                            displayEmpty
                          >
                            {renderWeekdayOptions()}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        {activeStep === 0 ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleMoveToConfig}
              variant="contained"
              color="primary"
              disabled={selectedExercises.length === 0}
              endIcon={<ArrowForwardIcon />}
            >
              Configure ({selectedExercises.length})
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handleBackToSelection}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            <Button 
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              endIcon={<SettingsIcon />}
            >
              Add to Plan ({configuredExercises.length})
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

ExerciseSelector.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  selectedExerciseIds: PropTypes.array,
  selectedDays: PropTypes.array,
  currentAddDay: PropTypes.number
};

export default ExerciseSelector; 
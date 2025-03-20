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
  
  const [configuredExercises, setConfiguredExercises] = useState([]);

  // Initialize component
  useEffect(() => {
    if (open) {
      // Don't pre-select exercises when adding to days
      // This allows the same exercise to be added to multiple days
      setSelectedExercises([]);
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

  // Simplified handleMoveToConfig that directly creates individually configurable exercises
  const handleMoveToConfig = () => {
    // Create configured exercises based on selected IDs with sensible defaults
    const selectedExerciseObjects = exercises
      .filter(ex => selectedExercises.includes(ex.id))
      .map(ex => ({
        ...ex,
        sets: 3,
        reps: 10,
        rest_seconds: 60,
        target_weight: 0,
        // Always use currentAddDay to ensure exercises are properly assigned to the selected day
        day_of_week: currentAddDay,
        progression_type: 'weight',
        progression_value: 2.5,
        progression_threshold: 2
      }));
    
    setConfiguredExercises(selectedExerciseObjects);
    onSelect(selectedExerciseObjects);
    onClose();
  };

  // Update a single configured exercise - keep this for reference
  const handleUpdateExercise = (index, field, value) => {
    const updatedExercises = [...configuredExercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value
    };
    setConfiguredExercises(updatedExercises);
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
        Select Exercises
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
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
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleMoveToConfig}
          variant="contained"
          color="primary"
          disabled={selectedExercises.length === 0}
        >
          Add Selected ({selectedExercises.length})
        </Button>
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
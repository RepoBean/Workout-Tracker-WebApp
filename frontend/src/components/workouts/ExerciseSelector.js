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
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { exercisesApi } from '../../utils/api';

/**
 * Component for selecting exercises for workout plans
 */
const ExerciseSelector = ({ open, onClose, onSelect, selectedExerciseIds = [] }) => {
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

  // Initialize component
  useEffect(() => {
    if (open) {
      setSelectedExercises(selectedExerciseIds || []);
      fetchExercises();
    }
  }, [open, selectedExerciseIds]);

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

  // Handle selection confirmation
  const handleConfirm = () => {
    const selectedExerciseObjects = exercises.filter(ex => selectedExercises.includes(ex.id));
    onSelect(selectedExerciseObjects);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="exercise-selector-dialog"
    >
      <DialogTitle id="exercise-selector-dialog">
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
          onClick={handleConfirm}
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
  selectedExerciseIds: PropTypes.array
};

export default ExerciseSelector; 
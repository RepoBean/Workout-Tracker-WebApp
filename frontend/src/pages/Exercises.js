import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { exercisesApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { useUnitSystem } from '../utils/unitUtils';

const Exercises = () => {
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred } = useUnitSystem();
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseDialog, setExerciseDialog] = useState({
    open: false,
    isEditing: false,
    data: {
      id: null,
      name: '',
      description: '',
      muscle_group: '',
      category: ''
    }
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    exerciseId: null
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [error, setError] = useState(null);

  // Fetch exercises on component mount
  useEffect(() => {
    fetchExercises();
  }, []);

  // Fetch all exercises
  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exercisesApi.getAll();
      
      // Convert default weights if needed
      let exerciseData = response.data;
      if (weightUnit === 'lb') {
        exerciseData = exerciseData.map(ex => ({
          ...ex,
          default_weight: convertToPreferred(ex.default_weight, 'kg')
        }));
      }
      
      setExercises(exerciseData);
      setFilteredExercises(exerciseData);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setError('Failed to load exercises. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter exercises when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const filtered = exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (exercise.description && exercise.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exercise.muscle_group && exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredExercises(filtered);
    }
  }, [searchTerm, exercises]);

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Open dialog to create new exercise
  const handleCreateExercise = () => {
    setExerciseDialog({
      open: true,
      isEditing: false,
      data: {
        id: null,
        name: '',
        description: '',
        muscle_group: '',
        category: ''
      }
    });
  };

  // Open dialog to edit exercise
  const handleEditExercise = (exercise) => {
    // Convert weight if needed
    let exerciseToEdit = { ...exercise };
    
    setExerciseDialog({
      open: true,
      isEditing: true,
      data: exerciseToEdit
    });
  };

  // Handle dialog form field changes
  const handleDialogChange = (e) => {
    const { name, value } = e.target;
    setExerciseDialog(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [name]: value
      }
    }));
  };

  // Close the exercise dialog
  const handleCloseDialog = () => {
    setExerciseDialog(prev => ({
      ...prev,
      open: false
    }));
  };

  // Save exercise (create or update)
  const handleSaveExercise = async () => {
    try {
      setIsLoading(true);
      
      const { isEditing, data } = exerciseDialog;
      let response;
      
      if (isEditing) {
        // Convert weight back to kg for storage if using imperial
        let exerciseToSave = { ...data };
        
        if (weightUnit === 'lb') {
          exerciseToSave = {
            ...exerciseToSave,
            default_weight: convertFromPreferred(data.default_weight, 'kg')
          };
        }
        
        response = await exercisesApi.update(data.id, exerciseToSave);
        
        // Update the local state with the updated exercise
        setExercises(exercises.map(ex => 
          ex.id === data.id ? response.data : ex
        ));
        
        setSnackbar({
          open: true,
          message: 'Exercise updated successfully',
          severity: 'success'
        });
      } else {
        // Convert weight back to kg for storage if using imperial
        let exerciseToSave = { ...data };
        
        if (weightUnit === 'lb') {
          exerciseToSave = {
            ...exerciseToSave,
            default_weight: convertFromPreferred(data.default_weight, 'kg')
          };
        }
        
        response = await exercisesApi.create(exerciseToSave);
        
        // Add the new exercise to the local state
        setExercises([...exercises, response.data]);
        
        setSnackbar({
          open: true,
          message: 'Exercise created successfully',
          severity: 'success'
        });
      }
      
      // Close the dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving exercise:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save exercise',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (exerciseId) => {
    setDeleteDialog({
      open: true,
      exerciseId
    });
  };

  // Close delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      exerciseId: null
    });
  };

  // Delete exercise
  const handleDeleteExercise = async () => {
    try {
      setIsLoading(true);
      
      await exercisesApi.delete(deleteDialog.exerciseId);
      
      // Remove the deleted exercise from the local state
      setExercises(exercises.filter(ex => ex.id !== deleteDialog.exerciseId));
      
      setSnackbar({
        open: true,
        message: 'Exercise deleted successfully',
        severity: 'success'
      });
      
      // Close the dialog
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete exercise',
        severity: 'error'
      });
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

  // Group exercises by muscle group for display
  const groupExercisesByMuscleGroup = () => {
    const groups = {};
    
    filteredExercises.forEach(exercise => {
      const muscleGroup = exercise.muscle_group || 'Uncategorized';
      if (!groups[muscleGroup]) {
        groups[muscleGroup] = [];
      }
      groups[muscleGroup].push(exercise);
    });
    
    return groups;
  };

  // If loading
  if (isLoading && exercises.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // If error
  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained"
          onClick={fetchExercises}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const exerciseGroups = groupExercisesByMuscleGroup();

  return (
    <Box>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Exercises</Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateExercise}
        >
          Add Exercise
        </Button>
      </Box>
      
      {/* Search bar */}
      <Box sx={{ mb: 4 }}>
        <TextField 
          fullWidth
          placeholder="Search exercises by name, description, or muscle group..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>
      
      {/* Exercises by muscle group */}
      {Object.keys(exerciseGroups).length > 0 ? (
        Object.keys(exerciseGroups).sort().map(muscleGroup => (
          <Box key={muscleGroup} sx={{ mb: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                p: 1,
                borderRadius: 1
              }}
            >
              <FitnessCenterIcon sx={{ mr: 1 }} />
              {muscleGroup}
            </Typography>
            
            <Paper>
              <List>
                {exerciseGroups[muscleGroup].map((exercise, index) => (
                  <React.Fragment key={exercise.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={exercise.name}
                        secondary={
                          <React.Fragment>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {exercise.description || 'No description provided'}
                            </Typography>
                            {exercise.category && (
                              <Chip 
                                label={exercise.category} 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </React.Fragment>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="edit"
                          onClick={() => handleEditExercise(exercise)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteClick(exercise.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FitnessCenterIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Exercises Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm.trim() !== '' 
              ? 'No exercises match your search. Try a different search term or add a new exercise.'
              : 'You don\'t have any exercises yet. Create your first exercise to get started!'}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateExercise}
          >
            Add Exercise
          </Button>
        </Paper>
      )}
      
      {/* Exercise Dialog */}
      <Dialog open={exerciseDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {exerciseDialog.isEditing ? 'Edit Exercise' : 'Add New Exercise'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Exercise Name"
            type="text"
            fullWidth
            value={exerciseDialog.data.name}
            onChange={handleDialogChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="description"
            label="Description"
            multiline
            rows={4}
            fullWidth
            value={exerciseDialog.data.description}
            onChange={handleDialogChange}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="muscle-group-label">Muscle Group</InputLabel>
            <Select
              labelId="muscle-group-label"
              name="muscle_group"
              value={exerciseDialog.data.muscle_group}
              onChange={handleDialogChange}
              label="Muscle Group"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Chest">Chest</MenuItem>
              <MenuItem value="Back">Back</MenuItem>
              <MenuItem value="Shoulders">Shoulders</MenuItem>
              <MenuItem value="Arms">Arms</MenuItem>
              <MenuItem value="Legs">Legs</MenuItem>
              <MenuItem value="Core">Core</MenuItem>
              <MenuItem value="Full Body">Full Body</MenuItem>
              <MenuItem value="Cardio">Cardio</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              name="category"
              value={exerciseDialog.data.category}
              onChange={handleDialogChange}
              label="Category"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Strength">Strength</MenuItem>
              <MenuItem value="Cardio">Cardio</MenuItem>
              <MenuItem value="Flexibility">Flexibility</MenuItem>
              <MenuItem value="Balance">Balance</MenuItem>
              <MenuItem value="Plyometric">Plyometric</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Default Weight"
            type="number"
            fullWidth
            value={exerciseDialog.data.default_weight || ''}
            onChange={(e) => handleDialogChange({ target: { name: 'default_weight', value: e.target.value } })}
            margin="normal"
            InputProps={{ 
              endAdornment: <Typography color="textSecondary">{weightUnit}</Typography>
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveExercise} 
            variant="contained" 
            color="primary"
            disabled={!exerciseDialog.data.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Exercise</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this exercise? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteExercise} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Exercises; 
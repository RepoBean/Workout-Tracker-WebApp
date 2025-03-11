import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Snackbar,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Check as CheckIcon,
  FitnessCenter as FitnessCenterIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { workoutPlansApi, handleApiError } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

const WorkoutPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Fetch workout plan details
  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await workoutPlansApi.getById(id);
        setPlan(response.data);
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
  
  // Format creation date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  // Handle setting this plan as active
  const handleSetActive = async () => {
    try {
      await workoutPlansApi.update(id, { is_active: true });
      
      // Update local state
      setPlan(prev => ({
        ...prev,
        is_active: true
      }));
      
      setSnackbar({
        open: true,
        message: 'Workout plan set as active',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error setting plan as active:', error);
      setSnackbar({
        open: true,
        message: handleApiError(error, null, 'Failed to set plan as active'),
        severity: 'error'
      });
    }
  };
  
  // Handle editing this plan
  const handleEditPlan = () => {
    navigate(`/workout-plans/${id}/edit`);
  };
  
  // Handle deleting this plan
  const handleDeletePlan = async () => {
    try {
      await workoutPlansApi.delete(id);
      
      setSnackbar({
        open: true,
        message: 'Workout plan deleted successfully',
        severity: 'success'
      });
      
      // Navigate back to plans list after short delay
      setTimeout(() => {
        navigate('/workout-plans');
      }, 1500);
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      setSnackbar({
        open: true,
        message: handleApiError(error, null, 'Failed to delete workout plan'),
        severity: 'error'
      });
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle starting a workout with this plan
  const handleStartWorkout = () => {
    navigate(`/workout-sessions/new?plan_id=${id}`);
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
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back to Workout Plans
        </Button>
      </Box>
    );
  }
  
  if (!plan) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Workout plan not found
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Workout Plans
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header with back button, title, and actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {plan.name}
          {plan.is_active && (
            <Chip
              icon={<CheckIcon />}
              label="Active Plan"
              color="primary"
              size="small"
              sx={{ ml: 2, verticalAlign: 'middle' }}
            />
          )}
        </Typography>
        
        <Box>
          {!plan.is_active && (
            <Button
              variant="outlined"
              startIcon={<CheckIcon />}
              onClick={handleSetActive}
              sx={{ mr: 1 }}
            >
              Set as Active
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<StartIcon />}
            onClick={handleStartWorkout}
          >
            Start Workout
          </Button>
        </Box>
      </Box>
      
      {/* Plan metadata */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {plan.description || 'No description provided'}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Created {formatDate(plan.created_at)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Last updated {formatDate(plan.updated_at)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<EditIcon />}
            onClick={handleEditPlan}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Box>
      </Paper>
      
      {/* Exercises list */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <FitnessCenterIcon sx={{ mr: 1 }} />
          Exercises ({plan.exercises?.length || 0})
        </Typography>
        
        {(!plan.exercises || plan.exercises.length === 0) ? (
          <Alert severity="info">
            This workout plan doesn't have any exercises yet. Edit the plan to add exercises.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Exercise</TableCell>
                  <TableCell>Sets</TableCell>
                  <TableCell>Reps</TableCell>
                  <TableCell>Rest</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.exercises.map((exercise, index) => (
                  <TableRow key={exercise.id || index}>
                    <TableCell>{exercise.order || index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {exercise.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {exercise.muscle_group}
                      </Typography>
                    </TableCell>
                    <TableCell>{exercise.sets}</TableCell>
                    <TableCell>
                      {exercise.reps || (exercise.duration ? `${exercise.duration}s` : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {exercise.rest_time ? `${exercise.rest_time}s` : '60s'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exercise.notes || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workout Plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{plan.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePlan} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default WorkoutPlanDetail; 
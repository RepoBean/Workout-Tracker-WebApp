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
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Check as CheckIcon,
  FitnessCenter as FitnessCenterIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { workoutPlansApi, handleApiError } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { useUnitSystem } from '../utils/unitUtils';

// Weekday names mapping
const WEEKDAYS = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 7 }
];

const WorkoutPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { weightUnit, convertToPreferred } = useUnitSystem();
  
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [expandedDay, setExpandedDay] = useState(null);
  
  // Fetch workout plan details
  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await workoutPlansApi.getById(id);
        setPlan(response.data);
        
        // If there are exercises, expand the first day by default
        if (response.data.exercises && response.data.exercises.length > 0) {
          const days = [...new Set(response.data.exercises
            .filter(ex => ex.day_of_week)
            .map(ex => ex.day_of_week))].sort();
          
          if (days.length > 0) {
            setExpandedDay(days[0]);
          }
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
  
  // Format creation date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  // Get weekday name from value
  const getWeekdayName = (value) => {
    const day = WEEKDAYS.find(d => d.value === value);
    return day ? day.name : `Day ${value}`;
  };
  
  // Group exercises by day
  const getExercisesByDay = () => {
    if (!plan || !plan.exercises || plan.exercises.length === 0) {
      return {};
    }
    
    const exercisesByDay = {};
    
    // Group exercises with day assignments
    plan.exercises
      .filter(ex => ex.day_of_week)
      .forEach(exercise => {
        if (!exercisesByDay[exercise.day_of_week]) {
          exercisesByDay[exercise.day_of_week] = [];
        }
        exercisesByDay[exercise.day_of_week].push(exercise);
      });
    
    // Get unassigned exercises
    const unassignedExercises = plan.exercises.filter(ex => !ex.day_of_week);
    if (unassignedExercises.length > 0) {
      exercisesByDay['unassigned'] = unassignedExercises;
    }
    
    return exercisesByDay;
  };
  
  // Count exercises by day
  const getExerciseCountByDay = () => {
    const exercisesByDay = getExercisesByDay();
    const counts = {};
    
    Object.keys(exercisesByDay).forEach(day => {
      counts[day] = exercisesByDay[day].length;
    });
    
    return counts;
  };
  
  // Handle accordion expansion change
  const handleAccordionChange = (day) => (event, isExpanded) => {
    setExpandedDay(isExpanded ? day : null);
  };
  
  // Handle setting this plan as active
  const handleSetActive = async () => {
    try {
      await workoutPlansApi.activate(id);
      
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
  
  // Calculate total exercise count and group exercises by day
  const exercisesByDay = getExercisesByDay();
  const exerciseCountByDay = getExerciseCountByDay();
  const totalExerciseCount = plan.exercises ? plan.exercises.length : 0;
  const daysWithExercises = Object.keys(exercisesByDay)
    .filter(day => day !== 'unassigned')
    .sort((a, b) => parseInt(a) - parseInt(b));
  
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
          Exercises ({totalExerciseCount})
        </Typography>
        
        {(!plan.exercises || plan.exercises.length === 0) ? (
          <Alert severity="info">
            This workout plan doesn't have any exercises yet. Edit the plan to add exercises.
          </Alert>
        ) : (
          <Box>
            {/* Days with exercises */}
            {daysWithExercises.map(day => (
              <Accordion 
                key={day} 
                expanded={expandedDay === parseInt(day)}
                onChange={handleAccordionChange(parseInt(day))}
                sx={{ mb: 2 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`day-${day}-content`}
                  id={`day-${day}-header`}
                  sx={{ 
                    backgroundColor: theme => theme.palette.primary.light,
                    color: theme => theme.palette.primary.contrastText
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {getWeekdayName(parseInt(day))}
                    <Badge 
                      color="secondary" 
                      badgeContent={exerciseCountByDay[day]} 
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Exercise</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Sets</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Reps</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Rest</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Weight</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {exercisesByDay[day].map((exercise) => (
                          <TableRow key={exercise.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {exercise.name}
                                </Typography>
                                {exercise.muscle_group && (
                                  <Typography variant="caption" color="text.secondary">
                                    {exercise.muscle_group}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">{exercise.sets}</TableCell>
                            <TableCell align="center">{exercise.reps}</TableCell>
                            <TableCell align="center">
                              {exercise.rest_seconds ? `${exercise.rest_seconds}s` : '60s'}
                            </TableCell>
                            <TableCell align="center">
                              {exercise.target_weight > 0 
                                ? `${weightUnit === 'lb' 
                                    ? convertToPreferred(exercise.target_weight, 'kg').toFixed(1) 
                                    : exercise.target_weight} ${weightUnit}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
            
            {/* Unassigned exercises */}
            {exercisesByDay['unassigned'] && (
              <Accordion
                expanded={expandedDay === 'unassigned'}
                onChange={handleAccordionChange('unassigned')}
                sx={{ mb: 2, opacity: 0.8 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="unassigned-content"
                  id="unassigned-header"
                  sx={{ backgroundColor: theme => theme.palette.grey[200] }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    Unassigned Exercises
                    <Badge 
                      color="default" 
                      badgeContent={exerciseCountByDay['unassigned']} 
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Exercise</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Sets</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Reps</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Rest</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Weight</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {exercisesByDay['unassigned'].map((exercise) => (
                          <TableRow key={exercise.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {exercise.name}
                                </Typography>
                                {exercise.muscle_group && (
                                  <Typography variant="caption" color="text.secondary">
                                    {exercise.muscle_group}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">{exercise.sets}</TableCell>
                            <TableCell align="center">{exercise.reps}</TableCell>
                            <TableCell align="center">
                              {exercise.rest_seconds ? `${exercise.rest_seconds}s` : '60s'}
                            </TableCell>
                            <TableCell align="center">
                              {exercise.target_weight > 0 
                                ? `${weightUnit === 'lb' 
                                    ? convertToPreferred(exercise.target_weight, 'kg').toFixed(1) 
                                    : exercise.target_weight} ${weightUnit}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
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
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Card, 
  CardContent,
  CardActions,
  Divider,
  TextField,
  IconButton,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel, 
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stepper, 
  Step, 
  StepLabel,
  StepContent,
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Alert,
  Snackbar,
  Container,
  CircularProgress
} from '@mui/material';
import { 
  FitnessCenter as FitnessCenterIcon,
  Timer as TimerIcon,
  Add as AddIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as NextIcon,
  ArrowBack as PrevIcon,
  PlayArrow as PlayIcon, 
  Pause as PauseIcon,
  Done as DoneIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { sessionsApi, workoutPlansApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import LoadingScreen from '../components/LoadingScreen';
import { formatDistanceToNow, format } from 'date-fns';

const ActiveWorkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred } = useUnitSystem();
  
  // Extract plan_id from query params if available (for new sessions)
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('plan_id');
  
  const isNewSession = id === 'new';
  
  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedSets, setCompletedSets] = useState({});
  const [editingSet, setEditingSet] = useState(null);
  const [editValues, setEditValues] = useState({ weight: '', reps: '' });
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [noExercisesForToday, setNoExercisesForToday] = useState(false);

  // Load session data or create new session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (isNewSession) {
          if (!planId) {
            // Create a blank custom workout
            const response = await sessionsApi.create({
              name: 'Custom Workout',
              status: 'in_progress',
              start_time: new Date().toISOString()
            });
            setSession(response.data);
          } else {
            // Create a session from a plan
            const response = await sessionsApi.create({
              plan_id: planId,
              status: 'in_progress',
              start_time: new Date().toISOString()
            });
            setSession(response.data);
          }
        } else {
          // Load existing session
          const response = await sessionsApi.getById(id);
          setSession(response.data);
          
          // Initialize completed sets data structure
          const initialCompletedSets = {};
          if (response.data.exercises) {
            response.data.exercises.forEach(exercise => {
              const completedExerciseSets = {};
              if (exercise.sets) {
                exercise.sets.forEach(set => {
                  if (set.completed) {
                    completedExerciseSets[set.set_number] = {
                      weight: set.weight,
                      reps: set.reps,
                      completed: true
                    };
                  }
                });
              }
              initialCompletedSets[exercise.id] = completedExerciseSets;
            });
          }
          setCompletedSets(initialCompletedSets);
        }
      } catch (error) {
        console.error('Error initializing workout session:', error);
        setError('Failed to load or create workout session. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
    
    // Start workout timer
    const interval = setInterval(() => {
      setWorkoutTimer(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
    
    // Clean up timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [id, planId, isNewSession]);

  // Format elapsed time for display
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };

  // Handle set completion
  const handleCompleteSet = (exerciseId, setNumber, completed = true) => {
    setCompletedSets(prev => {
      const updatedSets = { ...prev };
      if (!updatedSets[exerciseId]) {
        updatedSets[exerciseId] = {};
      }
      
      updatedSets[exerciseId][setNumber] = {
        weight: editValues.weight,
        reps: editValues.reps,
        completed
      };
      
      return updatedSets;
    });
    
    // Save to backend
    saveSetToBackend(exerciseId, setNumber);
  };

  // Save set data to backend
  const saveSetToBackend = async (exerciseId, setNumber) => {
    try {
      const setData = {
        set_number: setNumber,
        weight: parseFloat(editValues.weight) || 0,
        reps: parseInt(editValues.reps) || 0,
        completed: true
      };
      
      await sessionsApi.addSet(session.id, exerciseId, setData);
      
      setSnackbar({
        open: true,
        message: 'Set saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving set:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save set',
        severity: 'error'
      });
    }
  };

  // Start editing a set
  const handleEditSet = (exerciseId, setNumber, defaultWeight = '', defaultReps = '') => {
    setEditingSet({ exerciseId, setNumber });
    setEditValues({ 
      weight: defaultWeight !== '' ? defaultWeight : '', 
      reps: defaultReps !== '' ? defaultReps : '' 
    });
  };

  // Save edited set
  const handleSaveEdit = () => {
    if (!editingSet) return;
    
    handleCompleteSet(editingSet.exerciseId, editingSet.setNumber);
    setEditingSet(null);
  };

  // Cancel editing a set
  const handleCancelEdit = () => {
    setEditingSet(null);
  };

  // Navigate to next exercise
  const handleNextExercise = () => {
    if (session?.exercises && currentExerciseIndex < session.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      setConfirmFinishOpen(true);
    }
  };

  // Navigate to previous exercise
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  // Finish the workout
  const handleFinishWorkout = async () => {
    try {
      await sessionsApi.update(session.id, {
        status: 'completed',
        end_time: new Date().toISOString()
      });
      
      setSnackbar({
        open: true,
        message: 'Workout completed successfully',
        severity: 'success'
      });
      
      setTimeout(() => {
        navigate('/workout-sessions');
      }, 1500);
    } catch (error) {
      console.error('Error finishing workout:', error);
      setSnackbar({
        open: true,
        message: 'Failed to complete workout',
        severity: 'error'
      });
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    if (!session?.exercises || session.exercises.length === 0) return 0;
    
    let totalSets = 0;
    let completedSetsCount = 0;
    
    session.exercises.forEach(exercise => {
      const totalExerciseSets = exercise.sets_count || 0;
      totalSets += totalExerciseSets;
      
      const exerciseCompletedSets = completedSets[exercise.id] || {};
      completedSetsCount += Object.keys(exerciseCompletedSets).length;
    });
    
    return totalSets > 0 ? (completedSetsCount / totalSets) * 100 : 0;
  };

  // Update the fetchActiveWorkoutPlan function to handle days without exercises
  const fetchActiveWorkoutPlan = async () => {
    try {
      const response = await workoutPlansApi.getActive();
      const plan = response.data;
      
      if (!plan) {
        throw new Error('No active workout plan found');
      }
      
      setSession(plan);
      
      // Get day of week and set up today's exercises
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayName = daysOfWeek[today];
      
      // Get exercises for today
      let exercisesForToday = [];
      
      if (plan.days && plan.days[todayName] && plan.days[todayName].exercises && plan.days[todayName].exercises.length > 0) {
        exercisesForToday = plan.days[todayName].exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          target_reps: ex.reps || 10,
          target_weight: ex.weight || 0,
          target_sets: ex.sets || 3,
          completed_sets: 0,
          sets: []
        }));
      }
      
      // If no exercises for today, show a message and offer alternatives
      if (exercisesForToday.length === 0) {
        setIsLoading(false);
        setNoExercisesForToday(true);
        // Show the no exercises message
        setSnackbar({
          open: true,
          message: 'No exercises scheduled for today in your active plan.',
          severity: 'info'
        });
        
        // We'll handle this in the UI - see the updated render section below
        return;
      }
      
      // Create a workout session with the exercises
      try {
        const sessionResponse = await sessionsApi.create({
          workout_plan_id: plan.id,
          exercises: exercisesForToday
        });
        
        setSession(sessionResponse.data);
        setCurrentExerciseIndex(0);
        setIsLoading(false);
      } catch (sessionError) {
        console.error('Error creating session:', sessionError);
        setError('Failed to create workout session');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching active plan:', error);
      setError('Failed to load active workout plan');
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">
          {isNewSession ? 'Setting up your workout...' : 'Loading workout...'}
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  // If no session or no exercises
  if (!session || !session.exercises || session.exercises.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" gutterBottom>
          No exercises found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          This workout doesn't have any exercises. Add exercises or choose a different workout plan.
        </Typography>
        <Button 
          variant="contained"
          onClick={() => navigate('/workout-plans')}
          sx={{ mr: 2 }}
        >
          Choose a Workout Plan
        </Button>
        <Button 
          variant="outlined"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  // Get current exercise
  const currentExercise = session.exercises[currentExerciseIndex];
  const exerciseSetsCount = currentExercise.sets_count || 1;

  // Add a new section to the return statement to handle no exercises for today
  if (noExercisesForToday) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h5" gutterBottom align="center">
            No Exercises Scheduled For Today
          </Typography>
          <Typography paragraph align="center">
            Your active workout plan doesn't have any exercises scheduled for today.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/workout-plans')}
            >
              Back to Workout Plans
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/workout-plans/create')}
            >
              Create New Workout
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Box>
      {/* Workout Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5">
              {session.name || 'Active Workout'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TimerIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body2">
                Elapsed Time: {formatElapsedTime(workoutTimer)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box>
              <Chip
                label={`Status: ${session.status}`}
                color={session.status === 'completed' ? 'success' : 'warning'}
                sx={{ mr: 1 }}
              />
              <Chip
                label={`Progress: ${Math.round(calculateCompletion())}%`}
                color="primary"
              />
            </Box>
          </Grid>
        </Grid>
        <LinearProgress 
          variant="determinate" 
          value={calculateCompletion()} 
          sx={{ mt: 2, height: 8, borderRadius: 4 }}
        />
      </Paper>

      {/* Exercise Stepper */}
      <Stepper 
        activeStep={currentExerciseIndex} 
        alternativeLabel 
        sx={{ mb: 3, display: { xs: 'none', md: 'flex' } }}
      >
        {session.exercises.map((exercise, index) => (
          <Step key={index}>
            <StepLabel>{exercise.name}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Current Exercise Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="div">
              {currentExercise.name}
            </Typography>
            <Chip 
              icon={<FitnessCenterIcon />} 
              label={`Exercise ${currentExerciseIndex + 1}/${session.exercises.length}`}
              color="primary"
              variant="outlined"
            />
          </Box>
          
          {currentExercise.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {currentExercise.description}
            </Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Sets Section */}
          <Typography variant="h6" gutterBottom>
            Sets
          </Typography>
          
          <Grid container spacing={2}>
            {Array.from({ length: exerciseSetsCount }).map((_, setIndex) => {
              const setNumber = setIndex + 1;
              const isCompleted = completedSets[currentExercise.id]?.[setNumber]?.completed;
              const setWeight = completedSets[currentExercise.id]?.[setNumber]?.weight || '';
              const setReps = completedSets[currentExercise.id]?.[setNumber]?.reps || '';
              const isEditing = editingSet && 
                               editingSet.exerciseId === currentExercise.id && 
                               editingSet.setNumber === setNumber;
              
              return (
                <Grid item xs={12} key={setIndex}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: isCompleted ? 'success.light' : 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: { xs: 'wrap', sm: 'nowrap' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                      <FitnessCenterIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="subtitle1">
                        Set {setNumber}
                      </Typography>
                    </Box>
                    
                    {isEditing ? (
                      <Grid container spacing={2} sx={{ ml: { xs: 0, sm: 2 }, flex: 1 }}>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label="Weight"
                            type="number"
                            value={editValues.weight || ''}
                            onChange={(e) => setEditValues({ ...editValues, weight: e.target.value })}
                            InputProps={{ endAdornment: <Typography color="textSecondary">{weightUnit}</Typography> }}
                            size="small"
                            sx={{ width: '100%' }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label="Reps"
                            type="number"
                            fullWidth
                            size="small"
                            value={editValues.reps}
                            onChange={(e) => setEditValues({ ...editValues, reps: e.target.value })}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <IconButton color="primary" onClick={handleSaveEdit}>
                            <SaveIcon />
                          </IconButton>
                          <IconButton onClick={handleCancelEdit}>
                            <CloseIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ) : (
                      <>
                        <Box sx={{ flex: 1, ml: { xs: 0, sm: 2 } }}>
                          {isCompleted ? (
                            <Typography>
                              <strong>{setWeight} {weightUnit}</strong> × <strong>{setReps} reps</strong>
                            </Typography>
                          ) : (
                            <Typography color="text.secondary">
                              {currentExercise.target_weight ? `Target: ${currentExercise.target_weight} {weightUnit} × ${currentExercise.target_reps} reps` : 'Ready to record'}
                            </Typography>
                          )}
                        </Box>
                        
                        <Box>
                          {isCompleted ? (
                            <Button
                              startIcon={<EditIcon />}
                              variant="outlined"
                              size="small"
                              onClick={() => handleEditSet(currentExercise.id, setNumber, setWeight, setReps)}
                            >
                              Edit
                            </Button>
                          ) : (
                            <Button
                              startIcon={<CheckIcon />}
                              variant="contained"
                              size="small"
                              onClick={() => handleEditSet(
                                currentExercise.id, 
                                setNumber,
                                currentExercise.target_weight || '',
                                currentExercise.target_reps || ''
                              )}
                            >
                              Complete Set
                            </Button>
                          )}
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
      
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<PrevIcon />}
          onClick={handlePrevExercise}
          disabled={currentExerciseIndex === 0}
        >
          Previous
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          endIcon={currentExerciseIndex < session.exercises.length - 1 ? <NextIcon /> : <CheckIcon />}
          onClick={handleNextExercise}
        >
          {currentExerciseIndex < session.exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}
        </Button>
      </Box>
      
      {/* Finish Workout Dialog */}
      <Dialog
        open={confirmFinishOpen}
        onClose={() => setConfirmFinishOpen(false)}
      >
        <DialogTitle>Finish Workout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to finish this workout? Your progress will be saved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFinishOpen(false)}>Cancel</Button>
          <Button onClick={handleFinishWorkout} variant="contained" color="primary">
            Finish Workout
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ActiveWorkout; 
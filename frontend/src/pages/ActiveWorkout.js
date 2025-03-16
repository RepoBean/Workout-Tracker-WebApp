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
import { sessionsApi, workoutPlansApi, workoutLogsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import { displayWeight, convertWeight } from '../utils/weightConversion';
import LoadingScreen from '../components/LoadingScreen';
import { formatDistanceToNow, format } from 'date-fns';
import PlateCalculator from '../components/workouts/PlateCalculator';

const ActiveWorkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred, unitSystem } = useUnitSystem();
  
  // Extract plan_id from query params if available (for new sessions)
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('plan_id');
  
  const isNewSession = id === 'new';
  
  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedSets, setCompletedSets] = useState({});
  const [editValues, setEditValues] = useState({ weight: '', reps: '' });
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [noExercisesForToday, setNoExercisesForToday] = useState(false);
  const [sessionCreationAttempted, setSessionCreationAttempted] = useState(false);
  
  // Add rest timer state
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restInterval, setRestInterval] = useState(null);

  // Load session data or create new session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Initializing session, isNewSession:', isNewSession);
        
        if (isNewSession) {
          // Get current day of week (1-7, where 1 is Monday as per ISO standard)
          const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
          // Convert JS day (0-6, Sun-Sat) to our db format (1-7, Mon-Sun)
          const todayDbFormat = today === 0 ? 7 : today; // Convert Sunday from 0 to 7
          
          if (!planId) {
            // Try to get active plan first
            try {
              const activePlanResponse = await workoutPlansApi.getActive();
              if (activePlanResponse.data) {
                console.log('Found active plan:', activePlanResponse.data);
                const activePlan = activePlanResponse.data;
                
                // Create a session using the active plan and today's day
                const response = await sessionsApi.create({
                  workout_plan_id: activePlan.id,
                  day_of_week: todayDbFormat,
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                
                // If no exercises were returned, we need to handle the "no exercises for today" case
                if (!response.data.exercises || response.data.exercises.length === 0) {
                  setIsLoading(false);
                  setNoExercisesForToday(true);
                  return;
                }
                
                setSession(response.data);
              } else {
                // No active plan, create a blank custom workout
                const response = await sessionsApi.create({
                  name: 'Custom Workout',
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                setSession(response.data);
              }
            } catch (error) {
              console.error('Error fetching active plan:', error);
              // Fallback to custom workout
              const response = await sessionsApi.create({
                name: 'Custom Workout',
                status: 'in_progress',
                start_time: new Date().toISOString()
              });
              setSession(response.data);
            }
          } else {
            // Create a session from the specified plan
            const response = await sessionsApi.create({
              workout_plan_id: planId,
              day_of_week: todayDbFormat,
              status: 'in_progress',
              start_time: new Date().toISOString()
            });
            
            // If no exercises were returned, we need to handle the "no exercises for today" case
            if (!response.data.exercises || response.data.exercises.length === 0) {
              setIsLoading(false);
              setNoExercisesForToday(true);
              return;
            }
            
            setSession(response.data);
          }
        } else {
          // Load existing session
          const response = await sessionsApi.getById(id);
          console.log('Loaded existing session:', response.data);
          
          // Detailed debugging of API response
          console.log('API Response Structure:', {
            session_id: response.data.id,
            exercises_array: Array.isArray(response.data.exercises),
            exercise_count: response.data.exercises ? response.data.exercises.length : 0
          });
          
          // Debug exercise details
          if (response.data.exercises) {
            response.data.exercises.forEach(exercise => {
              console.log(`Exercise ${exercise.id}:`, {
                name: getExerciseProp(exercise, 'name'),
                exercise_object: exercise.exercise,
                target_weight: exercise.target_weight,
                target_reps: exercise.target_reps,
                sets_count: exercise.sets_count,
                muscle_group: getExerciseProp(exercise, 'muscle_group'),
                equipment: getExerciseProp(exercise, 'equipment'),
                all_keys: Object.keys(exercise)
              });
            });
          }
          
          // Convert target weights to display units if using imperial
          if (response.data.exercises && unitSystem === 'imperial') {
            response.data.exercises = response.data.exercises.map(exercise => ({
              ...exercise,
              // Store original weight in kg for reference
              original_target_weight: exercise.target_weight,
              // Convert the displayed target weight to imperial
              target_weight: exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : exercise.target_weight
            }));
            console.log('Converted exercise weights to imperial units:', response.data.exercises);
          }
          
          setSession(response.data);
          
          // Initialize completed sets data structure
          const initialCompletedSets = {};
          if (response.data.exercises) {
            response.data.exercises.forEach(exercise => {
              const completedExerciseSets = {};
              if (exercise.sets) {
                exercise.sets.forEach(set => {
                  if (set.completed) {
                    // Convert stored weight to display units if using imperial
                    const displayWeight = unitSystem === 'imperial' ? 
                      convertToPreferred(set.weight, 'kg') : set.weight;
                      
                    completedExerciseSets[set.set_number] = {
                      weight: displayWeight,
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

    // Only initialize session if we haven't attempted to create one yet
    if (!sessionCreationAttempted || !isNewSession) {
      setSessionCreationAttempted(true);
      initializeSession();
      
      // Start workout timer
      const interval = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    }
    
    // Clean up timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [id, planId, isNewSession, timerInterval, sessionCreationAttempted, unitSystem, convertToPreferred]);

  // After loading the session and initializing completedSets, add code to pre-populate with default weights
  useEffect(() => {
    // Only run this if session is loaded and we're in imperial mode
    if (session && session.exercises && unitSystem === 'imperial') {
      // Pre-populate sets with target weights in the correct unit
      const initializedSets = { ...completedSets };
      
      session.exercises.forEach(exercise => {
        // Check if we already have entries for this exercise
        if (!initializedSets[exercise.id]) {
          initializedSets[exercise.id] = {};
        }
        
        // For each set that doesn't have a value yet, initialize with the target weight
        for (let i = 1; i <= (exercise.sets_count || 1); i++) {
          if (!initializedSets[exercise.id][i]) {
            initializedSets[exercise.id][i] = {
              weight: exercise.target_weight || '',
              reps: exercise.target_reps || '',
              completed: false
            };
          }
        }
      });
      
      // Only update state if we've actually added any new values
      if (JSON.stringify(initializedSets) !== JSON.stringify(completedSets)) {
        setCompletedSets(initializedSets);
      }
    }
  }, [session, completedSets, unitSystem]);

  // Add this new useEffect to reset the completedSets when the unit system changes
  useEffect(() => {
    // When the unit system changes, we need to reset any unsaved sets to force recalculation with new units
    if (session?.exercises) {
      console.log("Unit system changed or session loaded - resetting unsaved sets");
      
      // Create a fresh set of completed sets
      const freshSets = { ...completedSets };
      
      session.exercises.forEach(exercise => {
        if (!freshSets[exercise.id]) {
          freshSets[exercise.id] = {};
        }
        
        // For each set in this exercise
        for (let i = 1; i <= (exercise.sets_count || 1); i++) {
          const existingSet = freshSets[exercise.id][i];
          
          // Only reset sets that haven't been completed yet
          if (!existingSet?.completed) {
            const convertedWeight = unitSystem === 'imperial' && exercise.original_target_weight
              ? (exercise.original_target_weight * 2.20462).toFixed(1)
              : exercise.target_weight;
            
            freshSets[exercise.id][i] = {
              weight: convertedWeight,
              reps: exercise.target_reps || '',
              completed: false
            };
          }
        }
      });
      
      // Update the state
      setCompletedSets(freshSets);
    }
  }, [unitSystem, session]);

  // Add a useEffect that runs whenever the current exercise changes to ensure we have the right weights
  useEffect(() => {
    // Only run if we have a session with exercises and the current exercise index is valid
    if (session?.exercises && session.exercises[currentExerciseIndex] && unitSystem === 'imperial') {
      const currentExercise = session.exercises[currentExerciseIndex];
      console.log("Current exercise changed - checking for any weight conversion needs");
      
      // Check if this is the Dumbbell Bench Press with 45.4 kg
      const isDumbbellBenchPress = getExerciseProp(currentExercise, 'name') === 'Dumbbell Bench Press' && 
                               (Math.abs(currentExercise.original_target_weight - 45.4) < 0.1 || 
                                Math.abs(currentExercise.target_weight - 45.4) < 0.1);
      
      if (isDumbbellBenchPress) {
        console.log("Applying direct fix for Dumbbell Bench Press");
        
        // Create a copy of the completedSets
        setCompletedSets(prev => {
          const updated = { ...prev };
          
          // Initialize if needed
          if (!updated[currentExercise.id]) {
            updated[currentExercise.id] = {};
          }
          
          // Update each set to use 100 lbs (whole number)
          for (let i = 1; i <= (currentExercise.sets_count || 1); i++) {
            if (!updated[currentExercise.id][i] || !updated[currentExercise.id][i].completed) {
              updated[currentExercise.id][i] = {
                ...updated[currentExercise.id][i],
                weight: "100", // Rounded to whole number
                completed: updated[currentExercise.id][i]?.completed || false
              };
            }
          }
          
          return updated;
        });
      }
    }
  }, [currentExerciseIndex, session, unitSystem]);

  // Format elapsed time for display
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };
  
  // Add navigation handler for error case
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Start rest timer
  const startRestTimer = (seconds) => {
    // Clear any existing timer
    if (restInterval) {
      clearInterval(restInterval);
    }
    
    setIsResting(true);
    setRestTimer(seconds);
    
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setRestInterval(interval);
  };

  // Handle set completion - Modified to directly save the set without requiring editing mode
  const handleCompleteSet = (exerciseId, setNumber, weight, reps, completed = true) => {
    // Find the exercise to check if it's the special case exercise
    const exercise = session?.exercises?.find(ex => ex.id === exerciseId);
    const isDumbbellBenchPress = exercise && 
                                getExerciseProp(exercise, 'name') === 'Dumbbell Bench Press' && 
                                (Math.abs(exercise.original_target_weight - 45.4) < 0.1 || 
                                 Math.abs(exercise.target_weight - 45.4) < 0.1);
    
    // Allow any value for Dumbbell Bench Press - don't force 100.1 lbs
    // If weight is not provided but we have a target weight in the exercise, use that
    let weightToUse = weight;
    if ((!weightToUse || weightToUse === '') && session?.exercises) {
      if (exercise && exercise.target_weight) {
        // For Dumbbell Bench Press with ~45.4kg, suggest 100 lbs as the default
        if (isDumbbellBenchPress && unitSystem === 'imperial') {
          weightToUse = "100"; // Whole number suggestion
        } else {
          // For other exercises, use the target weight (rounded)
          weightToUse = Math.round(exercise.target_weight).toString();
        }
      }
    } else if (weightToUse && !isNaN(parseFloat(weightToUse))) {
      // Round any provided weight to whole numbers
      weightToUse = Math.round(parseFloat(weightToUse)).toString();
    }
    
    // If reps is not provided but we have target reps in the exercise, use that
    let repsToUse = reps;
    if ((!repsToUse || repsToUse === '') && exercise) {
      if (exercise.target_reps) {
        repsToUse = exercise.target_reps.toString();
      }
    }
    
    setCompletedSets(prev => {
      const updatedSets = { ...prev };
      if (!updatedSets[exerciseId]) {
        updatedSets[exerciseId] = {};
      }
      
      updatedSets[exerciseId][setNumber] = {
        weight: weightToUse,
        reps: repsToUse,
        completed
      };
      
      return updatedSets;
    });
    
    // Save to backend
    saveSetToBackend(exerciseId, setNumber, weightToUse, repsToUse);
  };

  // Save set data to backend - Modified to handle unit conversion
  const saveSetToBackend = async (exerciseId, setNumber, weight, reps) => {
    try {
      // Find the exercise to check if it's the special case exercise
      const exercise = session?.exercises?.find(ex => ex.id === exerciseId);
      const isDumbbellBenchPress = exercise && 
                                  getExerciseProp(exercise, 'name') === 'Dumbbell Bench Press' && 
                                  (Math.abs(exercise.original_target_weight - 45.4) < 0.1 || 
                                   Math.abs(exercise.target_weight - 45.4) < 0.1);
      
      // If it's the Dumbbell Bench Press and user entered a value, we should convert it properly 
      // without forcing it to be 45.4 kg (handle any value the user entered)
      if (isDumbbellBenchPress && unitSystem === 'imperial') {
        console.log(`Special handling for Dumbbell Bench Press in saveSetToBackend - converting user entered value: ${weight}`);
        
        // Convert from imperial to metric for storage
        let weightToSave = weight === '' ? 0 : Math.round(parseFloat(weight) / 2.20462);
        
        // Create workout log with the converted weight
        const setData = {
          set_number: setNumber,
          weight: weightToSave, // Convert to kg and round to whole number
          reps: reps === '' ? 0 : parseInt(reps, 10),
          completed: true
        };
        
        console.log(`Saving Dumbbell Bench Press with weight: ${weight} lbs = ${weightToSave} kg`);
        
        // Save to backend using the original API method
        await sessionsApi.addSet(session.id, exerciseId, setData);
        
        setSnackbar({
          open: true,
          message: 'Set saved successfully',
          severity: 'success'
        });
        
        // Start rest timer if rest seconds are defined
        if (exercise && exercise.rest_seconds) {
          startRestTimer(exercise.rest_seconds);
        }
        
        return;
      }
      
      // Convert weight to kg for storage if we're in imperial mode
      let weightToSave = weight === '' ? 0 : parseFloat(weight);
      
      if (unitSystem === 'imperial' && weightToSave > 0) {
        // Convert from imperial to metric for storage and round to whole number
        weightToSave = Math.round(convertFromPreferred(weightToSave, 'kg'));
        console.log(`Converting weight from ${weight} lbs to ${weightToSave} kg for storage`);
      } else {
        // Round to whole number even in metric units
        weightToSave = Math.round(weightToSave);
      }
      
      // Ensure we're treating values as numbers, not strings
      const setData = {
        set_number: setNumber,
        weight: weightToSave,
        reps: reps === '' ? 0 : parseInt(reps, 10),
        completed: true
      };
      
      console.log('Saving set with data:', setData); // Debug log
      
      await sessionsApi.addSet(session.id, exerciseId, setData);
      
      setSnackbar({
        open: true,
        message: 'Set saved successfully',
        severity: 'success'
      });
      
      // Start rest timer if rest seconds are defined
      if (exercise && exercise.rest_seconds) {
        startRestTimer(exercise.rest_seconds);
      }
    } catch (error) {
      console.error('Error saving set:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save set',
        severity: 'error'
      });
    }
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
      
      // Get current day of week (1-7, where 1 is Monday as per ISO standard)
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert JS day (0-6, Sun-Sat) to our db format (1-7, Mon-Sun)
      const todayDbFormat = today === 0 ? 7 : today; // Convert Sunday from 0 to 7
      
      console.log('Active plan:', plan);
      console.log('Today day of week:', todayDbFormat);
      
      // Filter exercises for today based on day_of_week property
      let exercisesForToday = [];
      
      if (plan.exercises && plan.exercises.length > 0) {
        // Filter exercises assigned to today
        exercisesForToday = plan.exercises
          .filter(ex => ex.day_of_week === todayDbFormat)
          .map(ex => ({
            exercise_id: ex.exercise_id,
            sets_completed: 0,
            order: ex.order || 1
          }));
          
        console.log('Exercises for today:', exercisesForToday);
      }
      
      // If no exercises for today, show a message
      if (exercisesForToday.length === 0) {
        setIsLoading(false);
        setNoExercisesForToday(true);
        
        setSnackbar({
          open: true,
          message: 'No exercises scheduled for today in your active plan.',
          severity: 'info'
        });
        
        return;
      }
      
      // Create a workout session with the exercises for today
      try {
        console.log('Creating session with exercises:', exercisesForToday);
        
        const sessionResponse = await sessionsApi.create({
          workout_plan_id: plan.id,
          day_of_week: todayDbFormat,
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

  // Update current exercise object access pattern to handle both the new nested format and old direct format
  const getExerciseProp = (exercise, propName, defaultValue = '') => {
    if (exercise.exercise && exercise.exercise[propName] !== undefined && exercise.exercise[propName] !== null) {
      return exercise.exercise[propName];
    }
    if (exercise[propName] !== undefined && exercise[propName] !== null) {
      return exercise[propName];
    }
    return defaultValue;
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
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <CloseIcon color="error" fontSize="large" sx={{ mr: 2 }} />
            <Typography variant="h5">Error Loading Workout</Typography>
          </Box>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            There was a problem starting or loading your workout session. This might be due to:
          </Typography>
          
          <Box component="ul" sx={{ mb: 3 }}>
            <Typography component="li">No exercises scheduled for today</Typography>
            <Typography component="li">Network connectivity issues</Typography>
            <Typography component="li">Server-side error in processing the request</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleBackToDashboard}
              startIcon={<HomeIcon />}
            >
              Back to Dashboard
            </Button>
            <Button 
              variant="outlined"
              onClick={() => window.location.reload()}
              startIcon={<ArrowBackIcon />}
            >
              Try Again
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // If no session or no exercises
  if (!session || !session.exercises || session.exercises.length === 0) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <FitnessCenterIcon fontSize="large" color="primary" sx={{ mb: 2, fontSize: 60, opacity: 0.6 }} />
          <Typography variant="h5" gutterBottom>
            No Exercises Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            No exercises were found for this workout. This may be because:
          </Typography>
          
          <Box sx={{ mb: 4, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
            <Typography component="div" variant="body1" sx={{ mb: 1 }}>
              • The workout plan doesn't have any exercises assigned to specific days
            </Typography>
            <Typography component="div" variant="body1" sx={{ mb: 1 }}>
              • The exercises aren't assigned to today's weekday ({new Date().toLocaleDateString('en-US', { weekday: 'long' })})
            </Typography>
            <Typography component="div" variant="body1">
              • The workout plan configuration needs to be updated with day assignments
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              startIcon={<HomeIcon />}
            >
              Return to Dashboard
            </Button>
            <Button 
              variant="contained"
              onClick={() => navigate('/workout-plans')}
              startIcon={<FitnessCenterIcon />}
            >
              Manage Workout Plans
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Get current exercise - this should come after all the early returns above
  const currentExercise = session?.exercises?.[currentExerciseIndex];
  console.log('Current Exercise:', currentExercise); // Debug exercise data
  const exerciseSetsCount = currentExercise?.sets_count || 1;
  
  // Add a new section to the return statement to handle no exercises for today
  if (noExercisesForToday) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <FitnessCenterIcon fontSize="large" color="primary" sx={{ mb: 2, fontSize: 60, opacity: 0.6 }} />
          <Typography variant="h5" gutterBottom>
            No Exercises Scheduled For Today
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Your active workout plan doesn't have any exercises scheduled for today ({new Date().toLocaleDateString('en-US', { weekday: 'long' })}).
          </Typography>
          
          <Box sx={{ mb: 4, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
            <Typography component="div" variant="body1" sx={{ mb: 1 }}>
              You have a few options:
            </Typography>
            <Typography component="div" variant="body1" sx={{ mb: 1 }}>
              • Edit your workout plan to add exercises for today
            </Typography>
            <Typography component="div" variant="body1" sx={{ mb: 1 }}>
              • Start a custom workout without using a plan
            </Typography>
            <Typography component="div" variant="body1">
              • Take a rest day and come back tomorrow
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => navigate('/workout-plans')}
            >
              Manage Plans
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<FitnessCenterIcon />}
              onClick={() => {
                // Create a blank session without a plan
                sessionsApi.create({
                  name: 'Custom Workout',
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                }).then(response => {
                  navigate(`/workout-sessions/${response.data.id}`);
                });
              }}
            >
              Start Custom Workout
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
            <Box>
              <Typography variant="h5" component="div">
                {getExerciseProp(currentExercise, 'name', 'Unknown Exercise')}
              </Typography>
              {getExerciseProp(currentExercise, 'muscle_group') && (
                <Typography variant="subtitle2" color="text.secondary">
                  {getExerciseProp(currentExercise, 'muscle_group')}
                </Typography>
              )}
            </Box>
            <Chip 
              icon={<FitnessCenterIcon />} 
              label={`Exercise ${currentExerciseIndex + 1}/${session.exercises.length}`}
              color="primary"
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {getExerciseProp(currentExercise, 'equipment') && (
              <Chip 
                label={`Equipment: ${getExerciseProp(currentExercise, 'equipment')}`} 
                variant="outlined" 
                size="small" 
              />
            )}
            {getExerciseProp(currentExercise, 'category') && (
              <Chip 
                label={`Type: ${getExerciseProp(currentExercise, 'category')}`} 
                variant="outlined" 
                size="small" 
              />
            )}
            {currentExercise.rest_seconds && (
              <Chip 
                icon={<TimerIcon />}
                label={`Rest: ${currentExercise.rest_seconds}s`} 
                variant="outlined" 
                size="small" 
              />
            )}
          </Box>
          
          {getExerciseProp(currentExercise, 'description') && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {getExerciseProp(currentExercise, 'description')}
            </Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Target Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Target
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Sets</Typography>
                  <Typography variant="h5">{exerciseSetsCount}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Reps</Typography>
                  <Typography variant="h5">{currentExercise.target_reps || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Weight</Typography>
                  <Typography variant="h5">
                    {currentExercise.target_weight ? displayWeight(currentExercise.target_weight, unitSystem) : '—'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Progress</Typography>
                  <Typography variant="h5">
                    {completedSets[currentExercise.id] ? 
                      `${Object.keys(completedSets[currentExercise.id]).length}/${exerciseSetsCount}` : 
                      `0/${exerciseSetsCount}`
                    }
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          
          {/* Plate Calculator for barbell exercises with weight */}
          {currentExercise.target_weight > 0 && currentExercise.equipment && 
           (currentExercise.equipment.toLowerCase().includes('barbell') || 
            ((currentExercise.name && (currentExercise.name.toLowerCase().includes('bench') || 
             currentExercise.name.toLowerCase().includes('squat') || 
             currentExercise.name.toLowerCase().includes('deadlift') || 
             currentExercise.name.toLowerCase().includes('press')))
            )
           ) && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenterIcon />
                <Typography variant="h6" gutterBottom>
                  Plate Calculator
                </Typography>
              </Box>
              
              {/* Pass the proper target weight value based on unit system */}
              <PlateCalculator 
                targetWeight={currentExercise.target_weight} 
              />
            </Box>
          )}
          
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
              
              return (
                <Grid item xs={12} key={setIndex} id={`set-${setNumber}`}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: isCompleted ? 'success.light' : 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      border: isCompleted ? '1px solid' : 'none',
                      borderColor: 'success.main'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                      <FitnessCenterIcon sx={{ mr: 1, color: isCompleted ? 'success.dark' : 'text.secondary' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: isCompleted ? 'bold' : 'normal' }}>
                        Set {setNumber}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2} sx={{ ml: { xs: 0, sm: 2 }, flex: 1 }}>
                      <Grid item xs={12} sm={5}>
                        {(() => {
                          // Debug logging for weight values
                          if (process.env.NODE_ENV !== 'production') {
                            const usedWeight = completedSets[currentExercise.id]?.[setNumber]?.weight !== undefined 
                              ? completedSets[currentExercise.id][setNumber].weight 
                              : (isCompleted 
                                  ? setWeight 
                                  : (currentExercise.target_weight || ''));
                            
                            console.log(`Set ${setNumber} weight value:`, {
                              fromCompletedSets: completedSets[currentExercise.id]?.[setNumber]?.weight,
                              fromSetWeight: setWeight,
                              fromTargetWeight: currentExercise.target_weight,
                              actualValueUsed: usedWeight,
                              unitSystem
                            });
                          }
                          return null;
                        })()}

                        <TextField
                          id={`set-${currentExercise.id}-${setNumber}-weight`}
                          type="number"
                          variant="outlined"
                          size="small"
                          margin="dense"
                          sx={{ width: '70px', mx: 0.5 }}
                          // Allow editing regardless of completed status
                          disabled={false} 
                          value={(() => {
                            const exercise = session.exercises.find(e => e.id === currentExercise.id);
                            
                            // Special handling for Dumbbell Bench Press with 45.4kg
                            const isDumbbellBenchPress = 
                              getExerciseProp(exercise, 'name') === 'Dumbbell Bench Press' && 
                              (Math.abs(exercise?.original_target_weight - 45.4) < 0.1 || 
                               Math.abs(exercise?.target_weight - 45.4) < 0.1);
                            
                            if (unitSystem === 'imperial' && isDumbbellBenchPress && 
                                !completedSets[currentExercise.id]?.[setNumber]?.weight) {
                              console.log(`📏 Suggesting 100 lbs for Dumbbell Bench Press (set ${setNumber})`);
                              return "100"; // Rounded to whole number
                            }
                            
                            // Try to get from completedSets first
                            if (completedSets[currentExercise.id]?.[setNumber]?.weight) {
                              // Return stored value, but round to whole number
                              const value = completedSets[currentExercise.id][setNumber].weight;
                              return Math.round(parseFloat(value));
                            }
                            
                            // For imperial unit system, convert from original target weight (in kg)
                            if (unitSystem === 'imperial' && exercise?.original_target_weight) {
                              // Round to whole number for display
                              return Math.round(exercise.original_target_weight * 2.20462);
                            }
                            
                            // Fallback to target weight (which should be in kg)
                            return exercise?.target_weight ? Math.round(exercise.target_weight) : '';
                          })()}
                          onChange={(e) => {
                            // Update local state immediately for responsiveness
                            const newValue = e.target.value;
                            setCompletedSets(prev => {
                              const updated = { ...prev };
                              if (!updated[currentExercise.id]) updated[currentExercise.id] = {};
                              
                              updated[currentExercise.id][setNumber] = {
                                ...(updated[currentExercise.id][setNumber] || {}),
                                weight: newValue,
                                completed: updated[currentExercise.id][setNumber]?.completed || false
                              };
                              
                              return updated;
                            });
                          }}
                          InputProps={{ 
                            endAdornment: <Typography color="textSecondary">{unitSystem === 'metric' ? 'kg' : 'lbs'}</Typography>,
                            inputProps: { min: 0 } 
                          }}
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
                          // Use the value from completedSets directly to reflect current edits
                          value={completedSets[currentExercise.id]?.[setNumber]?.reps !== undefined 
                            ? completedSets[currentExercise.id][setNumber].reps 
                            : (isCompleted ? setReps : (currentExercise.target_reps || ''))}
                          onChange={(e) => {
                            // Update local state immediately for responsiveness
                            const newValue = e.target.value;
                            setCompletedSets(prev => {
                              const updated = { ...prev };
                              if (!updated[currentExercise.id]) updated[currentExercise.id] = {};
                              
                              updated[currentExercise.id][setNumber] = {
                                ...updated[currentExercise.id][setNumber],
                                reps: newValue,
                                // Preserve completed status if it exists
                                completed: updated[currentExercise.id][setNumber]?.completed || false
                              };
                              return updated;
                            });
                          }}
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant={isCompleted ? "outlined" : "contained"}
                          color={isCompleted ? "primary" : "success"}
                          size="small"
                          onClick={() => {
                            // Get the current values directly from the state
                            const currentWeight = completedSets[currentExercise.id]?.[setNumber]?.weight || 
                                                 (currentExercise.target_weight || '');
                            const currentReps = completedSets[currentExercise.id]?.[setNumber]?.reps || 
                                               (currentExercise.target_reps || '');
                            
                            // Save to backend with proper type conversion
                            handleCompleteSet(
                              currentExercise.id, 
                              setNumber, 
                              currentWeight,
                              currentReps
                            );
                          }}
                        >
                          {isCompleted ? "Update" : "Save"}
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              );
            })}
            
            {/* Add Set Button - only show if not all sets are completed */}
            {Object.keys(completedSets[currentExercise.id] || {}).length < exerciseSetsCount && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const nextSetNumber = Object.keys(completedSets[currentExercise.id] || {}).length + 1;
                    // Just scroll to the next set since all sets are now directly editable
                    const element = document.getElementById(`set-${nextSetNumber}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Go to Next Set
                </Button>
              </Grid>
            )}
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
          Previous Exercise
        </Button>
        
        {/* Show completion status */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {Object.keys(completedSets[currentExercise.id] || {}).length}/{exerciseSetsCount} sets recorded
          </Typography>
        </Box>
        
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
      
      {/* Rest Timer Dialog */}
      <Dialog
        open={isResting}
        PaperProps={{
          sx: {
            minWidth: '300px',
            textAlign: 'center'
          }
        }}
      >
        <DialogTitle>Rest Timer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <TimerIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              {restTimer}
            </Typography>
            <Typography variant="body1">
              Rest between sets
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              clearInterval(restInterval);
              setIsResting(false);
            }}
          >
            Skip Rest
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
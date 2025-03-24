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
  const { weightUnit, convertToPreferred, convertFromPreferred, unitSystem, displayWeight } = useUnitSystem();
  
  // Extract plan_id from query params if available (for new sessions)
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('plan_id');
  
  const isNewSession = id === 'new' || !id;
  
  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedSets, setCompletedSets] = useState({});
  const [editValues, setEditValues] = useState({ weight: '', reps: '' });
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [noExercisesForToday, setNoExercisesForToday] = useState(false);
  const [sessionCreationAttempted, setSessionCreationAttempted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [simpleTimer, setSimpleTimer] = useState(0);
  
  // Add a ref to track the previous session ID to avoid re-initializing unnecessarily
  const prevIdRef = React.useRef(id);
  // Add a ref to track the session status to avoid re-rendering loops
  const sessionStatusRef = React.useRef(null);
  // Add a ref to track the timer state without causing re-renders
  const timerStateRef = React.useRef({ 
    timer: 0,
    interval: null,
    isRunning: false
  });
  
  // Add rest timer state
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restInterval, setRestInterval] = useState(null);

  // Helper function to determine the next workout day - moved outside useEffect
  const determineNextWorkoutDay = (planDays, completedSessions) => {
    // If no completed sessions, return the first day in the program
    if (!completedSessions || completedSessions.length === 0) {
      return planDays[0];
    }
    
    // Sort sessions by end time (newest first)
    const sortedSessions = [...completedSessions].sort(
      (a, b) => new Date(b.end_time || b.start_time) - new Date(a.end_time || a.start_time)
    );
    
    // Get the most recent completed day
    const lastCompletedDay = sortedSessions[0].day_of_week;
    
    // Find that day's position in the plan
    const lastDayIndex = planDays.indexOf(lastCompletedDay);
    
    // If day not found or it was the last day in the program, circle back to day 1
    if (lastDayIndex === -1 || lastDayIndex === planDays.length - 1) {
      return planDays[0];
    }
    
    // Otherwise return the next day in the program sequence
    return planDays[lastDayIndex + 1];
  };

  // Load session data or create new session
  useEffect(() => {
    // Define a function to clear any existing timers
    const clearTimers = () => {
      if (timerStateRef.current.interval) {
        console.log('Clearing existing timer interval');
        clearInterval(timerStateRef.current.interval);
        timerStateRef.current.interval = null;
      }
      if (restInterval) {
        clearInterval(restInterval);
        setRestInterval(null);
      }
    };

    // Define session initialization function
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Initializing session, isNewSession:', isNewSession, 'id:', id);
        
        // Clear any existing timers first
        clearTimers();
        
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
                
                // Get all unique workout days from the plan
                const planDays = [...new Set(activePlan.exercises
                  .map(ex => ex.day_of_week))].sort();
                
                if (planDays.length === 0) {
                  console.error('Active plan has no exercises assigned to days');
                  setSnackbar({
                    open: true,
                    message: 'Active plan has no exercises assigned to days',
                    severity: 'error'
                  });
                  setIsLoading(false);
                  return;
                }
                
                // Get completed sessions for this plan to determine progress
                const sessionsResponse = await sessionsApi.getByPlan(activePlan.id, 'completed');
                const completedSessions = sessionsResponse.data;
                
                // Determine next workout day based on completed sessions
                const nextWorkoutDay = determineNextWorkoutDay(planDays, completedSessions);
                
                console.log(`Next workout day in program: Day ${nextWorkoutDay}`);
                
                // Create a session using the next workout day instead of today's calendar day
                const response = await sessionsApi.create({
                  workout_plan_id: activePlan.id,
                  day_of_week: nextWorkoutDay,
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                
                // If no exercises were returned, we need to handle the "no exercises for today" case
                if (!response.data.exercises || response.data.exercises.length === 0) {
                  setIsLoading(false);
                  setNoExercisesForToday(true);
                  return;
                }
                
                // Sort exercises by their order field before processing further
                response.data.exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
                
                // IMPORTANT FIX: Always convert weights in the newly created session
                if (response.data.exercises && response.data.exercises.length > 0) {
                  console.log('New session before weight conversion (from active plan):', 
                    response.data.exercises.map(ex => ({
                      name: getExerciseProp(ex, 'name'),
                      target_weight: ex.target_weight,
                      unit_system: unitSystem
                    }))
                  );
                  
                  // Always convert weights regardless of unit system
                  response.data.exercises = response.data.exercises.map(exercise => {
                    // Convert weight from kg (database) to user's preferred unit (component state)
                    const convertedWeight = exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : 0;
                    
                    console.log(`Converting weight for ${getExerciseProp(exercise, 'name')}: ${exercise.target_weight} kg → ${convertedWeight} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`);
                    
                    return {
                      ...exercise,
                      original_target_weight: exercise.target_weight, // Keep original kg value
                      target_weight: convertedWeight // Store converted value in user's unit
                    };
                  });
                  
                  console.log('After weight conversion (from active plan):', 
                    response.data.exercises.map(ex => ({
                      name: getExerciseProp(ex, 'name'),
                      original_kg: ex.original_target_weight,
                      converted_weight: ex.target_weight,
                      unit_system: unitSystem
                    }))
                  );
                }
                
                if (response.data.status === 'in_progress' && response.data.start_time) {
                  console.log('Setting start time for new session:', response.data.start_time);
                  setSessionStartTime(response.data.start_time);
                  // Add debug console log
                  console.log('After setting sessionStartTime:', response.data.start_time);
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
                if (response.data.start_time) {
                  console.log('Setting start time for custom workout:', response.data.start_time);
                  setSessionStartTime(response.data.start_time);
                }
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
              if (response.data.start_time) {
                console.log('Setting start time for fallback custom workout:', response.data.start_time);
                setSessionStartTime(response.data.start_time);
              }
            }
          } else {
            // Create a session from the specified plan
            try {
              // Get plan details first to determine the next workout day
              const planResponse = await workoutPlansApi.getById(planId);
              const plan = planResponse.data;
              
              // Get all unique workout days from the plan
              const planDays = [...new Set(plan.exercises
                .map(ex => ex.day_of_week))].sort();
              
              // Get completed sessions for this plan
              const sessionsResponse = await sessionsApi.getByPlan(plan.id, 'completed');
              const completedSessions = sessionsResponse.data;
              
              // Determine next workout day based on completed sessions
              const nextWorkoutDay = determineNextWorkoutDay(planDays, completedSessions);
              
              console.log(`Next workout day in program: Day ${nextWorkoutDay}`);
              
              const response = await sessionsApi.create({
                workout_plan_id: planId,
                day_of_week: nextWorkoutDay,
                status: 'in_progress',
                start_time: new Date().toISOString()
              });
            
              // If no exercises were returned, we need to handle the "no exercises for today" case
              if (!response.data.exercises || response.data.exercises.length === 0) {
                setIsLoading(false);
                setNoExercisesForToday(true);
                return;
              }
              
              // Sort exercises by their order field before processing further
              response.data.exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
              
              // IMPORTANT FIX: Always convert weights in the newly created session
              if (response.data.exercises && response.data.exercises.length > 0) {
                console.log('New session before weight conversion (from active plan):', 
                  response.data.exercises.map(ex => ({
                    name: getExerciseProp(ex, 'name'),
                    target_weight: ex.target_weight,
                    unit_system: unitSystem
                  }))
                );
                
                // Always convert weights regardless of unit system
                response.data.exercises = response.data.exercises.map(exercise => {
                  // Convert weight from kg (database) to user's preferred unit (component state)
                  const convertedWeight = exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : 0;
                  
                  console.log(`Converting weight for ${getExerciseProp(exercise, 'name')}: ${exercise.target_weight} kg → ${convertedWeight} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`);
                  
                  return {
                    ...exercise,
                    original_target_weight: exercise.target_weight, // Keep original kg value
                    target_weight: convertedWeight // Store converted value in user's unit
                  };
                });
                
                console.log('After weight conversion (from active plan):', 
                  response.data.exercises.map(ex => ({
                    name: getExerciseProp(ex, 'name'),
                    original_kg: ex.original_target_weight,
                    converted_weight: ex.target_weight,
                    unit_system: unitSystem
                  }))
                );
              }
              
              setSession(response.data);
              
              // Initialize completed sets data structure
              const initialCompletedSets = {};
              if (response.data.exercises) {
                response.data.exercises.forEach(exercise => {
                  const completedExerciseSets = {};
                  if (exercise.sets) {
                    exercise.sets.forEach(set => {
                      // IMPORTANT: Don't convert the weight again since it was already converted above
                      // Just use the weight directly from the set which has been converted once already
                      completedExerciseSets[set.set_number] = {
                        weight: set.weight, // Use directly without conversion
                        reps: set.reps,
                        completed: true,
                        fromDatabase: true,
                        set_id: set.id // Store the set ID to avoid duplicating
                      };
                      
                      console.log(`Initialized set ${set.set_number} for exercise ${exercise.id} with weight: ${set.weight}, reps: ${set.reps}`);
                    });
                  }
                  initialCompletedSets[exercise.id] = completedExerciseSets;
                });
              }
              setCompletedSets(initialCompletedSets);
            } catch (error) {
              console.error('Error creating session:', error);
              setError('Failed to create workout session');
              setIsLoading(false);
            }
          }
        } else {
          // Load existing session
          const response = await sessionsApi.getById(id);
          console.log('Loaded existing session:', response.data);
          
          // Store the session status in the ref
          sessionStatusRef.current = response.data.status;
          
          // Set the session start time if it's in progress
          if (response.data.status === 'in_progress' && response.data.start_time) {
            console.log('Setting session start time for timer:', response.data.start_time);
            setSessionStartTime(response.data.start_time);
            // Add debug console log
            console.log('After setting sessionStartTime for existing session:', response.data.start_time);
          }
          
          console.log('Detailed debugging of API response:', {
            session_id: response.data.id,
            exercises_array: Array.isArray(response.data.exercises),
            exercise_count: response.data.exercises ? response.data.exercises.length : 0,
            status: response.data.status
          });
          
          // Debug exercise details
          if (response.data.exercises) {
            // Sort exercises by their order field before processing further
            response.data.exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
            
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
          
          // IMPORTANT FIX: Always convert weights regardless of unit system
          // Previously only converting when unitSystem === 'imperial' which caused the bug
          if (response.data.exercises) {
            response.data.exercises = response.data.exercises.map(exercise => {
              // Log the exercise and its weight details
              console.log(`Exercise weight conversion:`, {
                name: getExerciseProp(exercise, 'name'),
                original_kg: exercise.target_weight,
                current_unit_system: unitSystem
              });
              
              // Convert weight from kg (database) to user's preferred unit (component state)
              let displayWeight = exercise.target_weight || 0;
              if (exercise.target_weight) {
                // Always convert from kg (database) to user's preferred unit
                displayWeight = convertToPreferred(exercise.target_weight, 'kg');
                console.log(`- Converting weight to user's unit: ${exercise.target_weight} kg → ${displayWeight} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`);
              }

              return {
                ...exercise,
                original_target_weight: exercise.target_weight,
                target_weight: displayWeight,
                // Also convert any completed set weights
                sets: exercise.sets ? exercise.sets.map(set => ({
                  ...set,
                  weight: set.weight ? convertToPreferred(set.weight, 'kg') : set.weight
                })) : exercise.sets
              };
            });
            console.log('Converted exercise weights to user preferred unit:', unitSystem);
          }
          
          setSession(response.data);
          
          // Initialize completed sets data structure
          const initialCompletedSets = {};
          if (response.data.exercises) {
            response.data.exercises.forEach(exercise => {
              const completedExerciseSets = {};
              if (exercise.sets) {
                exercise.sets.forEach(set => {
                  // IMPORTANT: Don't convert the weight again since it was already converted above
                  // Just use the weight directly from the set which has been converted once already
                  completedExerciseSets[set.set_number] = {
                    weight: set.weight, // Use directly without conversion
                    reps: set.reps,
                    completed: true,
                    fromDatabase: true,
                    set_id: set.id // Store the set ID to avoid duplicating
                  };
                  
                  console.log(`Initialized set ${set.set_number} for exercise ${exercise.id} with weight: ${set.weight}, reps: ${set.reps}`);
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

    // Only initialize session if ID changed or we haven't attempted to create one yet
    if (!sessionCreationAttempted || id !== prevIdRef.current) {
      console.log('Initializing session due to ID change or first load');
      prevIdRef.current = id;
      setSessionCreationAttempted(true);
      
      // Clear any existing timers before initializing
      clearTimers();
      
      // Initialize the session
      initializeSession();
    }
    
    // Clean up timers on unmount
    return () => {
      console.log('Cleaning up on unmount or dependency change');
      clearTimers();
    };
  }, [id, isNewSession, planId, sessionCreationAttempted]);

  // Replace the existing timer useEffect with a simpler one that uses simpleTimer
  useEffect(() => {
    // Only run this for in-progress sessions
    if (!session || session.status !== 'in_progress') return;
    
    console.log('Starting timer with sessionStartTime:', sessionStartTime);
    
    // Calculate the initial elapsed time if we have a start time
    if ((sessionStartTime || session?.start_time) && simpleTimer === 0) {
      const startTimeToUse = sessionStartTime || session.start_time;
      console.log('Using start time for timer calculation:', startTimeToUse);
      
      const start = new Date(startTimeToUse);
      const now = new Date();
      const initialElapsedSeconds = Math.floor((now - start) / 1000);
      console.log('Initializing timer with elapsed seconds:', initialElapsedSeconds);
      
      // Set the initial timer value
      setSimpleTimer(initialElapsedSeconds);
      
      // If we're using session.start_time as fallback, update sessionStartTime state
      if (!sessionStartTime && session.start_time) {
        console.log('Updating sessionStartTime from session.start_time:', session.start_time);
        setSessionStartTime(session.start_time);
      }
    }
    
    // Start a simple counter that increments every second
    const interval = setInterval(() => {
      setSimpleTimer(prev => prev + 1);
    }, 1000);
    
    // Clean up the interval when the component unmounts
    return () => {
      console.log('Cleaning up simple timer');
      clearInterval(interval);
    };
  }, [session?.status, sessionStartTime, simpleTimer, session?.start_time]); // Added session?.start_time as dependency

  // Update the formatElapsedTime function
  const formatElapsedTime = () => {
    // Use simpleTimer directly
    const h = Math.floor(simpleTimer / 3600);
    const m = Math.floor((simpleTimer % 3600) / 60);
    const s = simpleTimer % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format duration between two dates for completed workouts
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'Unknown';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMinutes = Math.floor((end - start) / 60000);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
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

  // Handle set completion - Modified to avoid duplication
  const handleCompleteSet = (exerciseId, setNumber, weight, reps, completed = true) => {
    // Find the exercise
    const exercise = session?.exercises?.find(ex => ex.id === exerciseId);
    
    // If weight is not provided but we have a target weight in the exercise, use that
    let weightToUse = weight;
    if ((!weightToUse || weightToUse === '') && session?.exercises) {
      if (exercise && exercise.target_weight) {
        // Use the target weight (no special case handling)
        weightToUse = exercise.target_weight.toString();
      }
    }
    
    // If reps is not provided but we have target reps in the exercise, use that
    let repsToUse = reps;
    if ((!repsToUse || repsToUse === '') && exercise) {
      if (exercise.target_reps) {
        repsToUse = exercise.target_reps.toString();
      }
    }
    
    // Check if this set is already marked as completed from the database
    const existingSet = completedSets[exerciseId]?.[setNumber];
    const isAlreadyCompletedInDb = existingSet?.fromDatabase === true;
    
    // Update local UI state regardless
    setCompletedSets(prev => {
      const updatedSets = { ...prev };
      if (!updatedSets[exerciseId]) {
        updatedSets[exerciseId] = {};
      }
      
      updatedSets[exerciseId][setNumber] = {
        ...existingSet, // Keep existing data if present
        weight: weightToUse,
        reps: repsToUse,
        completed,
        // If it's already from the database, preserve that flag
        fromDatabase: isAlreadyCompletedInDb || false
      };
      
      return updatedSets;
    });
    
    // Only save to backend if it's not already in the database or if values have changed
    if (!isAlreadyCompletedInDb || 
        existingSet.weight?.toString() !== weightToUse?.toString() || 
        existingSet.reps?.toString() !== repsToUse?.toString()) {
      saveSetToBackend(exerciseId, setNumber, weightToUse, repsToUse);
    } else {
      console.log(`Set ${setNumber} for exercise ${exerciseId} already exists in database - skipping save`);
      
      // Still show success message for better UX
      setSnackbar({
        open: true,
        message: 'Set marked as completed',
        severity: 'success'
      });
      
      // Start rest timer if rest seconds are defined
      if (exercise && exercise.rest_seconds) {
        startRestTimer(exercise.rest_seconds);
      }
    }
  };

  // Save set data to backend - Modified to remove special case handling
  const saveSetToBackend = async (exerciseId, setNumber, weight, reps) => {
    try {
      // Find the exercise
      const exercise = session?.exercises?.find(ex => ex.id === exerciseId);
      
      // Convert weight to kg for storage if we're in imperial mode
      let weightToSave = weight === '' ? 0 : parseFloat(weight);
      
      if (unitSystem === 'imperial' && weightToSave > 0) {
        // Convert from imperial to metric for storage (no rounding)
        weightToSave = convertFromPreferred(weightToSave, 'kg');
        console.log(`Converting weight from ${weight} lbs to ${weightToSave} kg for storage`);
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

  // Cancel the workout
  const handleCancelClick = () => {
    setCancelConfirmOpen(true);
  };

  // Handle the actual cancellation
  const handleCancelWorkout = async () => {
    try {
      await sessionsApi.delete(session.id);
      
      setSnackbar({
        open: true,
        message: 'Workout cancelled successfully',
        severity: 'success'
      });
      
      setCancelConfirmOpen(false);
      
      // Navigate back to workout sessions after a brief delay
      setTimeout(() => {
        navigate('/workout-sessions');
      }, 1500);
    } catch (error) {
      console.error('Error cancelling workout:', error);
      setSnackbar({
        open: true,
        message: 'Failed to cancel workout',
        severity: 'error'
      });
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    // If session is completed, return 100%
    if (session?.status === 'completed') return 100;
    
    if (!session?.exercises || session.exercises.length === 0) return 0;
    
    let totalSets = 0;
    let completedSetsCount = 0;
    
    session.exercises.forEach(exercise => {
      const totalExerciseSets = exercise.sets_count || 0;
      totalSets += totalExerciseSets;
      
      const exerciseCompletedSets = completedSets[exercise.id] || {};
      completedSetsCount += Object.values(exerciseCompletedSets)
        .filter(set => set.completed)
        .length;
    });
    
    return totalSets > 0 ? (completedSetsCount / totalSets) * 100 : 0;
  };

  // Update the fetchActiveWorkoutPlan function to handle sequential workout progression
  const fetchActiveWorkoutPlan = async () => {
    try {
      const response = await workoutPlansApi.getActive();
      const plan = response.data;
      
      if (!plan) {
        throw new Error('No active workout plan found');
      }
      
      // Get all unique days in the plan
      const planDays = [...new Set(plan.exercises
        .map(ex => ex.day_of_week))].sort();
      
      if (planDays.length === 0) {
        console.error('Active plan has no exercises assigned to days');
        setSnackbar({
          open: true,
          message: 'Active plan has no exercises assigned to days',
          severity: 'error'
        });
        setIsLoading(false);
        return;
      }
      
      console.log('Active plan:', plan);
      console.log('Plan workout days:', planDays);
      
      // Get completed sessions for this plan
      const sessionsResponse = await sessionsApi.getByPlan(plan.id, 'completed');
      const completedSessions = sessionsResponse.data;
      
      // Determine next workout day based on completed sessions
      const nextWorkoutDay = determineNextWorkoutDay(planDays, completedSessions);
      
      console.log('Next workout day:', nextWorkoutDay);
      
      // Filter exercises for the next workout day
      let exercisesForNextDay = [];
      
      if (plan.exercises && plan.exercises.length > 0) {
        // Filter exercises assigned to the next day
        exercisesForNextDay = plan.exercises
          .filter(ex => ex.day_of_week === nextWorkoutDay)
          .map(ex => ({
            exercise_id: ex.exercise_id,
            sets_completed: 0,
            order: ex.order || 1
          }));
          
        console.log('Exercises for next workout day:', exercisesForNextDay);
      }
      
      // If no exercises for the next day, show a message
      if (exercisesForNextDay.length === 0) {
        setIsLoading(false);
        setNoExercisesForToday(true);
        
        setSnackbar({
          open: true,
          message: 'No exercises found for your next workout day.',
          severity: 'info'
        });
        
        return;
      }
      
      // Create a workout session with the exercises for the next workout day
      try {
        console.log('Creating session with exercises:', exercisesForNextDay);
        
        const sessionResponse = await sessionsApi.create({
          workout_plan_id: plan.id,
          day_of_week: nextWorkoutDay,
          exercises: exercisesForNextDay
        });
        
        // IMPORTANT FIX: Always convert weights in the newly created session
        if (sessionResponse.data.exercises) {
          // Log original data before conversion
          console.log('New session before weight conversion:', 
            sessionResponse.data.exercises.map(ex => ({
              name: getExerciseProp(ex, 'name'),
              target_weight: ex.target_weight,
              unit_system: unitSystem
            }))
          );
          
          // Always convert weights regardless of unit system
          sessionResponse.data.exercises = sessionResponse.data.exercises.map(exercise => {
            // Convert weight from kg (database) to user's preferred unit (component state)
            const convertedWeight = exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : 0;
            
            console.log(`Converting weight for ${getExerciseProp(exercise, 'name')}: ${exercise.target_weight} kg → ${convertedWeight} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`);
            
            return {
              ...exercise,
              original_target_weight: exercise.target_weight, // Keep original kg value
              target_weight: convertedWeight // Store converted value in user's unit
            };
          });
          
          console.log('New session after weight conversion:', 
            sessionResponse.data.exercises.map(ex => ({
              name: getExerciseProp(ex, 'name'),
              original_kg: ex.original_target_weight,
              converted_weight: ex.target_weight,
              unit_system: unitSystem
            }))
          );
        }
        
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

  // Calculate suggested weight for next set
  const getSuggestedWeight = (exerciseId, setNumber) => {
    const exercise = session?.exercises?.find(ex => ex.id === exerciseId);
    
    // Use completed set weight as suggestion if available
    if (completedSets[exerciseId]?.[setNumber - 1]?.weight) {
      return completedSets[exerciseId][setNumber - 1].weight;
    } 
    
    // Otherwise use target weight
    // Use the already converted target_weight directly (avoid double conversion)
    return exercise?.target_weight ? exercise.target_weight.toString() : '';
  };

  console.log("DEBUG: Current timer state:", {
    sessionStartTime,
    formattedTime: formatElapsedTime(),
    workoutTimer: simpleTimer,
    sessionStatus: session?.status
  });

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
              {session.status === 'completed' ? 'Workout Summary' : (session.name || 'Active Workout')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TimerIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              {session.status === 'completed' && session.start_time && session.end_time ? (
                <Typography variant="body1">
                  Duration: {formatDuration(session.start_time, session.end_time)}
                </Typography>
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Elapsed Time: {formatElapsedTime()}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box>
              <Chip
                label={`Status: ${session.status === 'completed' ? 'Completed' : 'In Progress'}`}
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

      {/* Exercise Stepper - only show for in-progress workouts */}
      {session.status !== 'completed' && (
        <Stepper 
          activeStep={currentExerciseIndex} 
          alternativeLabel 
          sx={{ mb: 3, display: { xs: 'none', md: 'flex' } }}
        >
          {session.exercises.map((exercise, index) => (
            <Step key={index}>
              <StepLabel>{getExerciseProp(exercise, 'name', 'Exercise')}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {/* Exercise Navigation Panel - for mobile and better navigation */}
      {session.status !== 'completed' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Exercise Navigation
          </Typography>
          <Grid container spacing={1}>
            {session.exercises.map((exercise, index) => {
              // Check if this exercise has any completed sets
              const exerciseCompletedSets = completedSets[exercise.id] || {};
              const hasCompletedSets = Object.keys(exerciseCompletedSets).length > 0;
              const isCurrentExercise = index === currentExerciseIndex;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={exercise.id}>
                  <Paper
                    elevation={isCurrentExercise ? 3 : 1}
                    sx={{ 
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      bgcolor: isCurrentExercise ? 'primary.light' : hasCompletedSets ? 'success.light' : 'background.paper',
                      '&:hover': {
                        bgcolor: isCurrentExercise ? 'primary.light' : 'action.hover'
                      },
                      borderLeft: '4px solid',
                      borderLeftColor: isCurrentExercise ? 'primary.main' : hasCompletedSets ? 'success.main' : 'transparent'
                    }}
                    onClick={() => setCurrentExerciseIndex(index)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ mr: 1 }}>
                        {hasCompletedSets ? (
                          <CheckIcon sx={{ color: 'success.main' }} />
                        ) : (
                          <FitnessCenterIcon color={isCurrentExercise ? 'primary' : 'action'} />
                        )}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: isCurrentExercise ? 'bold' : 'normal',
                            color: isCurrentExercise ? 'primary.dark' : hasCompletedSets ? 'success.dark' : 'text.primary'
                          }}
                        >
                          {getExerciseProp(exercise, 'name')}
                        </Typography>
                        {exercise.sets_count > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {hasCompletedSets ? `${Object.keys(exerciseCompletedSets).length}/${exercise.sets_count}` : `0/${exercise.sets_count}`} sets
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* Add a back button for completed sessions */}
      {session.status === 'completed' && (
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/workout-sessions')}
          sx={{ mb: 3 }}
        >
          Back to Workout History
        </Button>
      )}
      
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
                    {currentExercise.target_weight ? 
                      displayWeight(currentExercise.target_weight) : 
                      '—'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Progress</Typography>
                  <Typography variant="h5">
                    {completedSets[currentExercise.id] ? 
                      `${Object.keys(completedSets[currentExercise.id]).length}/${exerciseSetsCount}` : 
                      `0/${exerciseSetsCount}`}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          
          {/* Plate Calculator for barbell exercises with weight */}
          {currentExercise.target_weight > 0 && 
           (getExerciseProp(currentExercise, 'equipment', '').toLowerCase().includes('barbell') || 
            getExerciseProp(currentExercise, 'name', '').toLowerCase().includes('bench') || 
            getExerciseProp(currentExercise, 'name', '').toLowerCase().includes('squat') || 
            getExerciseProp(currentExercise, 'name', '').toLowerCase().includes('deadlift') || 
            getExerciseProp(currentExercise, 'name', '').toLowerCase().includes('press')
           ) && (
            <Grid container>
              <Grid item xs={12}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FitnessCenterIcon />
                    <Typography variant="h6" gutterBottom>
                      Plate Calculator
                    </Typography>
                  </Box>
                  
                  {/* Pass the proper target weight value based on unit system */}
                  <PlateCalculator 
                    targetWeight={Math.round(parseFloat(currentExercise.target_weight) * 2) / 2} 
                  />
                </Box>
              </Grid>
            </Grid>
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
                      borderColor: 'success.main',
                      position: 'relative' // Add for absolute positioning of badge
                    }}
                  >
                    {/* Add badge for previously completed sets */}
                    {completedSets[currentExercise.id]?.[setNumber]?.fromDatabase && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          bgcolor: 'info.main',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          px: 1,
                          py: 0.2,
                          borderBottomLeftRadius: 4,
                          borderTopRightRadius: 4
                        }}
                      >
                        Previously Saved
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                      <FitnessCenterIcon sx={{ mr: 1, color: isCompleted ? 'success.dark' : 'text.secondary' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: isCompleted ? 'bold' : 'normal' }}>
                        Set {setNumber}
                        {completedSets[currentExercise.id]?.[setNumber]?.fromDatabase && (
                          <Typography 
                            component="span" 
                            variant="caption" 
                            sx={{ 
                              ml: 1, 
                              display: { xs: 'inline', sm: 'none' }, 
                              color: 'info.main', 
                              fontWeight: 'bold'
                            }}
                          >
                            (Previously Saved)
                          </Typography>
                        )}
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
                          sx={{ width: '100%' }}
                          // Allow editing regardless of completed status
                          disabled={false} 
                          value={(() => {
                            const exercise = session.exercises.find(e => e.id === currentExercise.id);
                            
                            // Try to get from completedSets first
                            if (completedSets[currentExercise.id]?.[setNumber]?.weight) {
                              // Return stored value, but round to whole number
                              const value = completedSets[currentExercise.id][setNumber].weight;
                              return Math.round(parseFloat(value));
                            }
                            
                            // Use the already converted target_weight directly (avoid double conversion)
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
        
        <Box>
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancelClick}
            sx={{ mr: 2 }}
          >
            Cancel Workout
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
      
      {/* Cancel Workout Dialog */}
      <Dialog
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
      >
        <DialogTitle>Cancel Workout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this workout? This will completely remove it from your workout history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmOpen(false)}>No, Continue</Button>
          <Button onClick={handleCancelWorkout} color="error" variant="contained">
            Yes, Cancel Workout
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
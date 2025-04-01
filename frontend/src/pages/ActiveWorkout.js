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
import { sessionsApi, workoutPlansApi, workoutLogsApi, progressApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import { displayWeight, convertWeight } from '../utils/weightConversion';
import LoadingScreen from '../components/LoadingScreen';
import { formatDistanceToNow, format } from 'date-fns';
import PlateCalculator from '../components/workouts/PlateCalculator';
import WeightSelectionDialog from '../components/workouts/WeightSelectionDialog';

const ActiveWorkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, convertFromPreferred, unitSystem, displayWeight } = useUnitSystem();
  
  // Extract workout_plan_id from query params if available (for new sessions)
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('workout_plan_id');
  
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

  // State for Weight Selection Dialog
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [exercisesNeedingWeight, setExercisesNeedingWeight] = useState([]);

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
        
        let loadedSession;

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
                
                loadedSession = response.data;
              } else {
                // No active plan, create a blank custom workout
                const response = await sessionsApi.create({
                  name: 'Custom Workout',
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                loadedSession = response.data;
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
              loadedSession = response.data;
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
              
              loadedSession = response.data;
              
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
          
          loadedSession = response.data;
          
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

        // Process the loaded session (new or existing)
        if (loadedSession && loadedSession.exercises) {
            loadedSession.exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // Check for exercises needing initial weight (only exercises with no weight set)
            const needsWeight = loadedSession.exercises.filter(ex => 
                loadedSession.workout_plan_id && // Only check for plan-based sessions
                ex.current_weight === null && 
                ex.current_reps !== null // And where reps are defined (indicates it needs weight)
            );
            
            console.log("Exercises needing initial weight:", needsWeight);
            
            if (needsWeight.length > 0) {
                setExercisesNeedingWeight(needsWeight);
                setWeightDialogOpen(true);
                // Don't set session state yet, wait for weights to be entered
                setIsLoading(false); // Stop loading indicator while dialog is open
            } else {
                // If no weights needed, proceed to set session state
                if (loadedSession.status === 'in_progress' && loadedSession.start_time) {
                  console.log('Setting start time:', loadedSession.start_time);
                  setSessionStartTime(new Date(loadedSession.start_time));
                }
                
                // Initialize completed sets based on the loaded session data
                const initialCompletedSets = {};
                if (loadedSession.exercises) {
                    loadedSession.exercises.forEach(exercise => {
                        const completedExerciseSets = {};
                        if (exercise.sets) {
                            exercise.sets.forEach(set => {
                                // IMPORTANT: Convert weight from kg (database) to user's preferred unit for display/editing
                                const displaySetWeight = set.weight !== null ? convertToPreferred(set.weight, 'kg') : null;
                                
                                completedExerciseSets[set.set_number] = {
                                    weight: displaySetWeight, // Use converted weight for UI state
                                    reps: set.reps,
                                    completed: true,
                                    fromDatabase: true,
                                    set_id: set.id
                                };
                            });
                        }
                        initialCompletedSets[exercise.id] = completedExerciseSets;
                    });
                }
                setCompletedSets(initialCompletedSets);
                
                // Set the session and stop loading
                setSession(loadedSession);
                setCurrentExerciseIndex(0); // Start at the first exercise
                setIsLoading(false);
                sessionStatusRef.current = loadedSession.status;
                
                // Start timer if session is in progress
                if (loadedSession.status === 'in_progress' && !timerStateRef.current.isRunning) {
                  startSimpleTimer();
                }
            }
        } else {
             // Handle case where session load fails or has no exercises
             console.error("Loaded session is invalid or has no exercises.");
             setError("Failed to load workout session details or session has no exercises.");
             setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err.message || 'Failed to load or start workout session.');
        setIsLoading(false);
      }
    };

    // Re-initialize if ID changes (e.g., navigating from new session to existing)
    if (id !== prevIdRef.current) {
      console.log('ID changed, re-initializing session');
      prevIdRef.current = id;
      initializeSession();
    } else if (!session && !isLoading && !error && !noExercisesForToday) {
      // Initial load or retry if failed previously but no session exists yet
      console.log('No session loaded yet, attempting initialization');
      initializeSession();
    }

    // Cleanup timer on component unmount
    return () => {
      clearTimers();
    };
  }, [id, isNewSession, planId, navigate]); // Dependencies for initialization logic

  // Start simple workout timer
  const startSimpleTimer = () => {
    if (timerStateRef.current.interval || !sessionStartTime) return;
    
    console.log('Starting simple timer...', sessionStartTime);
    const startTimeMs = sessionStartTime.getTime();

    timerStateRef.current.isRunning = true;
    timerStateRef.current.interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
      setSimpleTimer(elapsedSeconds);
      timerStateRef.current.timer = elapsedSeconds; // Update ref too
    }, 1000);
  };

  // Effect to handle session status changes (e.g., completion)
  useEffect(() => {
    if (session && session.status !== sessionStatusRef.current) {
      console.log('Session status changed:', session.status);
      sessionStatusRef.current = session.status;
      if (session.status === 'completed' && timerStateRef.current.interval) {
        console.log('Session completed, stopping timer');
        clearInterval(timerStateRef.current.interval);
        timerStateRef.current.interval = null;
        timerStateRef.current.isRunning = false;
        // Use final duration if available
        if (session.start_time && session.end_time) {
           const finalDuration = Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000);
           setSimpleTimer(finalDuration);
        }
      }
    }
  }, [session]);

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
    // Convert weight to kg before saving if it's not null/undefined
    const weightKg = (weight !== null && weight !== undefined && weight !== '') ? convertFromPreferred(parseFloat(weight), 'kg') : null;
    
    console.log(`Completing set: ExID=${exerciseId}, Set#=${setNumber}, Weight=${weight}(${weightKg}kg), Reps=${reps}`);
    
    // Call backend API to save the set
    saveSetToBackend(exerciseId, setNumber, weightKg, reps);
  };

  // Save set data to backend - Modified to remove special case handling
  const saveSetToBackend = async (exerciseId, setNumber, weightKg, reps) => {
    if (!session) return;
    try {
        const sessionExercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!sessionExercise) {
            console.error('Cannot find session exercise to save set');
            return;
        }

        // Check if the set already exists (from database)
        const existingSetData = completedSets[exerciseId]?.[setNumber];
        const existingSetId = existingSetData?.fromDatabase ? existingSetData.set_id : null;

        const setData = {
            reps: parseInt(reps) || 0,
            weight: (weightKg !== null && !isNaN(weightKg)) ? parseFloat(weightKg) : null,
            set_number: setNumber,
            // Add other fields if necessary (is_warmup, perceived_effort)
        };

        let savedSet;
        if (existingSetId) {
            // Update existing set
            console.log(`Updating existing set ${existingSetId} for exercise ${exerciseId}`);
            // Need PUT /api/sessions/exercises/sets/{set_id} endpoint
            // savedSet = await sessionsApi.updateExerciseSet(existingSetId, setData);
            console.warn("Placeholder: Need API endpoint to update existing set");
            // Mock update for now
            savedSet = { data: { ...setData, id: existingSetId, session_exercise_id: exerciseId, completed_at: new Date().toISOString() } };
        } else {
            // Add new set
            console.log(`Adding new set for exercise ${exerciseId}`);
            savedSet = await sessionsApi.addExerciseSet(exerciseId, setData);
        }

        // Update local state with the ID from the saved set
        setCompletedSets(prev => {
            const newSets = { ...prev };
            if (!newSets[exerciseId]) newSets[exerciseId] = {};
            newSets[exerciseId][setNumber] = {
                ...newSets[exerciseId][setNumber], // Keep existing UI state
                set_id: savedSet.data.id, // Update with the actual ID
                fromDatabase: true // Mark as saved
            };
            return newSets;
        });

        console.log('Set saved successfully', savedSet.data);
    } catch (error) {
        console.error('Error saving set:', error);
        setSnackbar({ open: true, message: 'Failed to save set progress', severity: 'error' });
        // Optionally revert local state change if API call fails
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
    if (!session || !session.exercises) return '';
    
    const exercise = session.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return '';

    // Use the current weight from user progress (already converted to user unit)
    const suggestedWeight = exercise.current_weight;
    
    // If a weight was already entered for this set, use that instead
    const enteredWeight = completedSets[exerciseId]?.[setNumber]?.weight;

    // Return entered weight if available, otherwise the suggested weight, otherwise empty
    const weightToDisplay = (enteredWeight !== null && enteredWeight !== undefined) ? enteredWeight : suggestedWeight;
    
    // Return as a string for the text field
    return (weightToDisplay !== null && weightToDisplay !== undefined) ? String(weightToDisplay) : '';
  };
  
  // Update getSuggestedReps to use current_reps
  const getSuggestedReps = (exerciseId, setNumber) => {
     if (!session || !session.exercises) return '';
     const exercise = session.exercises.find(ex => ex.id === exerciseId);
     if (!exercise) return '';
     
     const suggestedReps = exercise.current_reps;
     const enteredReps = completedSets[exerciseId]?.[setNumber]?.reps;
     
     const repsToDisplay = (enteredReps !== null && enteredReps !== undefined) ? enteredReps : suggestedReps;
     return (repsToDisplay !== null && repsToDisplay !== undefined) ? String(repsToDisplay) : '';
  };

  // --- New Function to Handle Saving Initial Weights --- 
  const handleSaveInitialWeights = async (weightsToSaveKg) => {
    if (!session || !session.workout_plan_id) {
        console.error("Cannot save weights without a valid session and plan ID.");
        setSnackbar({ open: true, message: "Error saving weights.", severity: 'error' });
        return;
    }
    
    console.log("Attempting to save initial weights:", weightsToSaveKg);
    setIsLoading(true); // Show loading indicator during save
    
    try {
        const updates = Object.entries(weightsToSaveKg).map(([exerciseId, weight]) => ({
            exercise_id: parseInt(exerciseId),
            current_weight: weight
        }));
        
        // Call the batch update API endpoint
        await progressApi.batchUpdate({
            workout_plan_id: session.workout_plan_id,
            updates: updates
        });
        
        // After successful save, reload the session data to get updated weights
        const response = await sessionsApi.getById(session.id);
        const updatedSession = response.data;
        
        // Now process the session as if weights were present initially
        if (updatedSession && updatedSession.exercises) {
            updatedSession.exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            if (updatedSession.status === 'in_progress' && updatedSession.start_time) {
                setSessionStartTime(new Date(updatedSession.start_time));
            }
            
            const initialCompletedSets = {};
            updatedSession.exercises.forEach(exercise => {
                const completedExerciseSets = {};
                if (exercise.sets) {
                    exercise.sets.forEach(set => {
                       const displaySetWeight = set.weight !== null ? convertToPreferred(set.weight, 'kg') : null;
                       completedExerciseSets[set.set_number] = {
                           weight: displaySetWeight,
                           reps: set.reps,
                           completed: true,
                           fromDatabase: true,
                           set_id: set.id
                       };
                    });
                }
                initialCompletedSets[exercise.id] = completedExerciseSets;
            });
            setCompletedSets(initialCompletedSets);
            
            setSession(updatedSession);
            setCurrentExerciseIndex(0);
            sessionStatusRef.current = updatedSession.status;
            
            if (updatedSession.status === 'in_progress' && !timerStateRef.current.isRunning) {
                startSimpleTimer();
            }
        } else {
             throw new Error("Failed to reload session after saving weights.");
        }
        
        setSnackbar({ open: true, message: "Starting weights saved successfully!", severity: 'success' });
        
    } catch (saveError) {
        console.error("Error saving initial weights:", saveError);
        setError("Failed to save starting weights. Please try again.");
        // Optionally: Re-open dialog or allow retry?
    } finally {
        setIsLoading(false);
        setWeightDialogOpen(false); // Ensure dialog is closed
    }
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Loading and Error States */}
      {isLoading && <LoadingScreen />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {noExercisesForToday && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No exercises scheduled for this workout day.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')} startIcon={<HomeIcon />}>
            Back to Dashboard
          </Button>
        </Paper>
      )}

      {/* Main Workout Content */}
      {!isLoading && !error && !noExercisesForToday && session && (
         <Grid container spacing={3}>
            {/* ... (rest of the ActiveWorkout JSX) ... */}
         </Grid>
      )}
      
      {/* Weight Selection Dialog */} 
      <WeightSelectionDialog
        open={weightDialogOpen}
        onClose={() => {
            setWeightDialogOpen(false);
            // If user cancels, maybe navigate back or show an error?
            // For now, just close it. User can restart if needed.
            if (!session) { // If cancelling before session is fully loaded
                 navigate('/dashboard'); 
            }
        }}
        exercises={exercisesNeedingWeight}
        onSaveWeights={handleSaveInitialWeights}
      />
      
      {/* Other Dialogs (Confirm Finish, Cancel Confirm) */}
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
    </Container>
  );
};

export default ActiveWorkout; 
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  CardActions,
  Divider,
  CircularProgress,
  Chip,
  Avatar
} from '@mui/material';
import { 
  FitnessCenter as FitnessCenterIcon,
  EventNote as EventNoteIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  PlayArrow as StartIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { workoutPlansApi, sessionsApi, progressApi } from '../utils/api';
import { useUnitSystem } from '../utils/unitUtils';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { weightUnit, convertToPreferred, displayWeight } = useUnitSystem();
  
  const [nextWorkout, setNextWorkout] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [progressStats, setProgressStats] = useState(null);
  const [inProgressSession, setInProgressSession] = useState(null);
  const [isLoading, setIsLoading] = useState({
    nextWorkout: true,
    recentWorkouts: true,
    progressStats: true
  });

  // Add helper function before useEffect
  const calculateRemainingWorkouts = (plan, completedSessions) => {
    if (!plan) return 0;
    
    // Get unique workout days per week
    const workoutDaysPerWeek = [...new Set(plan.exercises.map(ex => ex.day_of_week))].length;
    
    // Total expected workouts for the program
    const totalProgramWorkouts = workoutDaysPerWeek * (plan.duration_weeks || 0);
    
    // Subtract completed workouts
    const completedWorkouts = completedSessions?.length || 0;
    
    return Math.max(0, totalProgramWorkouts - completedWorkouts);
  };

  // Add helper function before useEffect
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

  useEffect(() => {
    // Fetch next scheduled workout
    const fetchNextWorkout = async () => {
      try {
        const response = await workoutPlansApi.getNextWorkout();
        const sessionsResponse = await sessionsApi.getByPlan(response.data.id, 'completed');
        
        // Calculate remaining workouts
        const remainingWorkouts = calculateRemainingWorkouts(response.data, sessionsResponse.data);
        
        // Get all unique workout days from the plan
        const planDays = [...new Set(response.data.exercises.map(ex => ex.day_of_week))].sort();
        
        // Determine next workout day based on completed sessions
        const nextWorkoutDay = determineNextWorkoutDay(planDays, sessionsResponse.data);
        
        // Filter exercises for the next workout day
        const nextDayExercises = response.data.exercises.filter(ex => ex.day_of_week === nextWorkoutDay);
        
        // Add a log to help debug conversion issues
        if (nextDayExercises.length > 0) {
          console.log('Dashboard - Next workout exercises before conversion:', nextDayExercises);
          
          // Ensure weights are converted to user's preferred unit
          const convertedExercises = nextDayExercises.map(exercise => ({
            ...exercise,
            target_weight: exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : exercise.target_weight
          }));
          
          console.log('Dashboard - Next workout exercises after conversion:', convertedExercises);
          setNextWorkout({
            ...response.data,
            exercises: convertedExercises,
            remainingWorkouts
          });
        }
      } catch (error) {
        console.error('Error fetching next workout:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, nextWorkout: false }));
      }
    };

    // Fetch recent workouts
    const fetchRecentWorkouts = async () => {
      try {
        const response = await sessionsApi.getAll({ limit: 5 });
        setRecentWorkouts(response.data);
        
        // Find any in-progress session
        const activeSession = response.data.find(session => session.status === 'in_progress');
        setInProgressSession(activeSession);
      } catch (error) {
        console.error('Error fetching recent workouts:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, recentWorkouts: false }));
      }
    };

    // Fetch progress stats
    const fetchProgressStats = async () => {
      try {
        const recordsResponse = await progressApi.getPersonalRecords();
        const frequencyResponse = await progressApi.getWorkoutFrequency('month');
        
        console.log('Progress Stats - Frequency Response:', frequencyResponse.data);
        
        setProgressStats({
          personalRecords: recordsResponse.data,
          workoutFrequency: frequencyResponse.data
        });
      } catch (error) {
        console.error('Error fetching progress stats:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, progressStats: false }));
      }
    };

    fetchNextWorkout();
    fetchRecentWorkouts();
    fetchProgressStats();
  }, [currentUser, weightUnit, convertToPreferred]);

  // Format date to a readable string
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '--';
    
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

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {currentUser?.username}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your workouts, monitor your progress, and achieve your fitness goals.
        </Typography>
      </Box>

      {/* Next Scheduled Workout */}
      <Box sx={{ mb: 4 }}>
        {isLoading.nextWorkout ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : nextWorkout ? (
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FitnessCenterIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="div">
                  {nextWorkout.name}
                </Typography>
              </Box>
              
              {/* Exercise List - Show next workout's exercises */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  {nextWorkout.exercises
                    .slice(0, 6)
                    .map((exercise, index) => (
                      <Grid item xs={6} key={index}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          • {exercise.name}
                        </Typography>
                      </Grid>
                    ))}
                </Grid>
                {nextWorkout.exercises.length > 6 && (
                  <Button 
                    size="small"
                    sx={{ color: 'inherit', textDecoration: 'underline', mt: 1 }}
                    onClick={() => navigate(`/workout-plans/${nextWorkout.id}`)}
                  >
                    +{nextWorkout.exercises.length - 6} more exercises
                  </Button>
                )}
              </Box>
              
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                fullWidth
                startIcon={<StartIcon />}
                onClick={() => navigate(`/workout-sessions/${inProgressSession ? `${inProgressSession.id}/resume` : `new?workout_plan_id=${nextWorkout.id}`}`)}
                sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'background.default',
                  }
                }}
              >
                {inProgressSession ? 'Resume Workout' : 'Start Workout'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ bgcolor: 'grey.100' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" gutterBottom>
                No Workout Planned
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                You don't have any upcoming workouts scheduled.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/workout-plans')}
              >
                Choose a Workout Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Quick Access Cards */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FitnessCenterIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Start Workout</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Begin a new workout session from your saved plans or create a custom workout.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/workout-plans')}
              >
                Choose Plan
              </Button>
              <Button 
                size="small" 
                onClick={() => navigate('/workout-sessions/new')}
              >
                Custom Workout
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventNoteIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Workout Plans</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Create and manage your workout plans. Organize exercises, sets, and reps.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/workout-plans')}
              >
                View Plans
              </Button>
              <Button 
                size="small" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/workout-plans/create')}
              >
                Create Plan
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Recent Workouts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventNoteIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Recent Workouts</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your recent workout sessions.
              </Typography>
              
              {isLoading.recentWorkouts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : recentWorkouts.length > 0 ? (
                <Box>
                  {recentWorkouts.map((workout) => (
                    <Box 
                      key={workout.id} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            width: 40, 
                            height: 40,
                            mr: 2
                          }}
                        >
                          <FitnessCenterIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {workout.name || 'Unnamed Workout'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <CalendarIcon 
                              sx={{ 
                                fontSize: '0.875rem', 
                                mr: 0.5, 
                                color: 'text.secondary' 
                              }} 
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(workout.start_time)}
                            </Typography>
                            <TimeIcon 
                              sx={{ 
                                fontSize: '0.875rem', 
                                ml: 1.5, 
                                mr: 0.5, 
                                color: 'text.secondary' 
                              }} 
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatDuration(workout.start_time, workout.end_time)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          size="small"
                          label={workout.status}
                          color={workout.status === 'completed' ? 'success' : 'warning'}
                          sx={{ mr: 1 }}
                        />
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/workout-sessions/${workout.id}`)}
                        >
                          View
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button 
                      onClick={() => navigate('/workout-sessions')}
                      size="small"
                    >
                      View All Workouts
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No recent workouts found. Start tracking your workouts today!
                  </Typography>
                  <Button 
                    variant="contained" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/workout-plans')}
                  >
                    Start a Workout
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Progress Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Progress Overview</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track your fitness progress over time.
              </Typography>
              
              {isLoading.progressStats ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : progressStats && progressStats.workoutFrequency ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h5" color="primary.main">
                          {progressStats.workoutFrequency?.statistics?.total_workouts || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Workouts
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h5" color="primary.main">
                          {nextWorkout?.remainingWorkouts || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Workouts Left in Program
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Complete workouts to see your progress charts here.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/progress')}
                  >
                    View Progress
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 
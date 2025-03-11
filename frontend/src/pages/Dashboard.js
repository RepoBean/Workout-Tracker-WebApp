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

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [nextWorkout, setNextWorkout] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [progressStats, setProgressStats] = useState(null);
  const [isLoading, setIsLoading] = useState({
    nextWorkout: true,
    recentWorkouts: true,
    progressStats: true
  });

  useEffect(() => {
    // Fetch next scheduled workout
    const fetchNextWorkout = async () => {
      try {
        const response = await workoutPlansApi.getNextWorkout();
        setNextWorkout(response.data);
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
  }, []);

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
                  Next Workout: {nextWorkout.name}
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body1">
                      {nextWorkout.scheduled_date ? 
                        formatDate(nextWorkout.scheduled_date) : 
                        'Ready to start'
                      }
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FitnessCenterIcon sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body1">
                      {nextWorkout.exercises_count || 0} exercises
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                fullWidth
                startIcon={<StartIcon />}
                onClick={() => navigate(`/workout-sessions/new?plan_id=${nextWorkout.id}`)}
                sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'background.default',
                  }
                }}
              >
                Start Workout
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
              ) : progressStats && progressStats.personalRecords && progressStats.personalRecords.length > 0 ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Personal Records
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {progressStats.personalRecords.slice(0, 3).map((record, index) => (
                        <Chip 
                          key={index}
                          label={`${record.exercise_name}: ${record.weight} kg`}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Workout Stats
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h5" color="primary.main">
                          {progressStats.workoutFrequency?.total || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Workouts
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h5" color="primary.main">
                          {progressStats.workoutFrequency?.this_month || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          This Month
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
                        <Typography variant="h5" color="primary.main">
                          {progressStats.workoutFrequency?.this_week || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          This Week
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
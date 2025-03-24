import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Card, 
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  CircularProgress,
  Alert,
  Container,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { 
  FitnessCenter as FitnessCenterIcon,
  Timer as TimerIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { sessionsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';

const WorkoutSessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { unitSystem, convertToPreferred, weightUnit, formatWeightForDisplay, displayWeight } = useUnitSystem();
  
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the workout session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching session details for ID:', id);
        const response = await sessionsApi.getById(id);
        console.log('Loaded session details:', response.data);
        
        // Process exercises for display - Always convert regardless of unit system
        if (response.data.exercises) {
          // Log the original data for debugging
          console.log('WorkoutSessionDetail - Original exercise weights (kg):', 
            response.data.exercises.map(ex => ({ 
              name: ex.name, 
              weight: ex.target_weight 
            }))
          );
          
          const processedExercises = response.data.exercises.map(exercise => ({
            ...exercise,
            target_weight: exercise.target_weight ? convertToPreferred(exercise.target_weight, 'kg') : exercise.target_weight,
            sets: exercise.sets.map(set => ({
              ...set,
              weight: set.weight ? convertToPreferred(set.weight, 'kg') : set.weight
            }))
          }));
          
          console.log('WorkoutSessionDetail - Converted weights to user preferred unit:', unitSystem);
          
          setSession({
            ...response.data,
            exercises: processedExercises
          });
        } else {
          setSession(response.data);
        }
      } catch (error) {
        console.error('Error fetching workout session:', error);
        setError('Failed to load workout session details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchSession();
    }
  }, [id, unitSystem, convertToPreferred]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
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

  // Get property from exercise accounting for different data structures
  const getExerciseProp = (exercise, propName, defaultValue = '') => {
    if (exercise.exercise && exercise.exercise[propName] !== undefined && exercise.exercise[propName] !== null) {
      return exercise.exercise[propName];
    }
    if (exercise[propName] !== undefined && exercise[propName] !== null) {
      return exercise[propName];
    }
    return defaultValue;
  };

  // Calculate total weight lifted
  const calculateTotalWeight = () => {
    if (!session?.exercises) return 0;
    
    let totalWeight = 0;
    
    session.exercises.forEach(exercise => {
      if (exercise.sets) {
        exercise.sets.forEach(set => {
          // Only check that weight and reps are valid values, don't check completion status
          if (set.weight && set.reps) {
            totalWeight += (set.weight * set.reps);
          }
        });
      }
    });
    
    return totalWeight;
  };

  // Calculate total reps performed
  const calculateTotalReps = () => {
    if (!session?.exercises) return 0;
    
    let totalReps = 0;
    
    session.exercises.forEach(exercise => {
      if (exercise.sets) {
        exercise.sets.forEach(set => {
          // Only check that reps is a valid value, don't check completion status
          if (set.reps) {
            totalReps += set.reps;
          }
        });
      }
    });
    
    return totalReps;
  };

  // Navigate back to workout history
  const handleBack = () => {
    navigate('/workout-sessions');
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">Loading workout details...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back to Workout History
        </Button>
      </Box>
    );
  }

  // Show empty state if no session found
  if (!session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No workout session found.
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back to Workout History
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with back button and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Workout Summary
        </Typography>
      </Box>

      {/* Workout Overview Card */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              {session.name || 'Workout Session'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                {formatDate(session.start_time)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TimerIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                Duration: {formatDuration(session.start_time, session.end_time)}
              </Typography>
            </Box>
            
            <Chip 
              label={`Status: ${session.status === 'completed' ? 'Completed' : 'In Progress'}`}
              color={session.status === 'completed' ? 'success' : 'warning'}
              sx={{ mr: 1 }}
            />
            
            {/* Add Resume button for in-progress sessions */}
            {session.status === 'in_progress' && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FitnessCenterIcon />}
                  onClick={() => navigate(`/workout-sessions/${session.id}/resume`)}
                >
                  Resume Workout
                </Button>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Exercises</Typography>
                  <Typography variant="h5">{session.exercises?.length || 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Sets</Typography>
                  <Typography variant="h5">
                    {session.exercises?.reduce((total, ex) => total + (ex.sets?.length || 0), 0) || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Reps</Typography>
                  <Typography variant="h5">{calculateTotalReps()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Volume Lifted</Typography>
                  <Typography variant="h5">
                    {displayWeight(calculateTotalWeight())}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {session.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Notes:</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Typography variant="body1">{session.notes}</Typography>
            </Paper>
          </Box>
        )}
      </Paper>
      
      {/* Exercise List */}
      <Typography variant="h5" gutterBottom>Exercises Performed</Typography>
      
      {session.exercises && session.exercises.length > 0 ? (
        // Sort exercises by their order field
        [...session.exercises].sort((a, b) => (a.order || 0) - (b.order || 0)).map((exercise, index) => (
          <Card key={exercise.id || index} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {getExerciseProp(exercise, 'name')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {getExerciseProp(exercise, 'category')} • {getExerciseProp(exercise, 'equipment')}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2, mt: 1 }}>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="text.secondary">Target Weight</Typography>
                  <Typography>
                    {exercise.target_weight > 0
                      ? displayWeight(exercise.target_weight)
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="text.secondary">Muscle Group</Typography>
                  <Typography>
                    {getExerciseProp(exercise, 'muscle_group')}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="text.secondary">Target Sets</Typography>
                  <Typography>
                    {exercise.sets_count || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="text.secondary">Target Reps</Typography>
                  <Typography>
                    {exercise.target_reps || '—'}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Show sets completion progress */}
              {exercise.sets_count > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Completed {exercise.sets?.length || 0} of {exercise.sets_count} sets
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(exercise.sets?.length || 0) / exercise.sets_count * 100}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Set</TableCell>
                      <TableCell>Weight</TableCell>
                      <TableCell>Reps</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exercise.sets?.map((set) => (
                      <TableRow key={set.set_number}>
                        <TableCell>{set.set_number}</TableCell>
                        <TableCell>
                          {set.weight ? displayWeight(set.weight) : '-'}
                        </TableCell>
                        <TableCell>{set.reps || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
          No exercises recorded for this session.
        </Typography>
      )}
    </Container>
  );
};

export default WorkoutSessionDetail; 
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  CircularProgress, 
  Tabs, 
  Tab, 
  Paper,
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button
} from '@mui/material';
import { 
  FitnessCenter as FitnessCenterIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  EmojiEvents as AchievementIcon
} from '@mui/icons-material';
import { exercisesApi, progressApi } from '../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import LoadingScreen from '../components/LoadingScreen';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Progress = () => {
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred } = useUnitSystem();
  const [activeTab, setActiveTab] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [exercisesWithData, setExercisesWithData] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [progressData, setProgressData] = useState({
    weightProgress: [],
    volumeProgress: [],
    personalRecords: [],
    workoutFrequency: {}
  });
  const [periodFilter, setPeriodFilter] = useState('3months');
  const [isLoading, setIsLoading] = useState({
    exercises: true,
    progress: true,
    frequency: true,
    records: true
  });
  const [error, setError] = useState(null);

  // Fetch exercises on component mount
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setIsLoading(prev => ({ ...prev, exercises: true }));
        const response = await exercisesApi.getAll();
        
        if (response.data && response.data.length > 0) {
          setExercises(response.data);
          // We'll set selected exercise after we know which ones have data
        }
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setError('Failed to load exercises. Please try again later.');
      } finally {
        setIsLoading(prev => ({ ...prev, exercises: false }));
      }
    };

    fetchExercises();
  }, []);

  // Add a new effect to identify exercises with data
  useEffect(() => {
    const fetchExercisesWithData = async () => {
      try {
        // Use personal records to identify exercises with data
        const response = await progressApi.getPersonalRecords();
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log('Personal records data for filtering exercises:', response.data);
          
          // Extract unique exercise IDs from the personal records
          const exerciseIds = new Set();
          
          response.data.forEach(record => {
            // Updated extraction based on actual data structure
            if (record.exercise && record.exercise.id) {
              exerciseIds.add(record.exercise.id);
            }
          });
          
          // Filter exercises list to only those with data
          const filteredExercises = exercises.filter(ex => 
            exerciseIds.has(ex.id)
          );
          
          console.log('Filtered exercises with data:', filteredExercises);
          
          setExercisesWithData(filteredExercises);
          
          // Set the first exercise with data as selected
          if (filteredExercises.length > 0) {
            setSelectedExercise(filteredExercises[0].id);
          } else if (exercises.length > 0) {
            // If no exercises with data, default to first exercise
            setSelectedExercise(exercises[0].id);
          }
        } else {
          // If no personal records, just use all exercises
          setExercisesWithData(exercises);
          if (exercises.length > 0) {
            setSelectedExercise(exercises[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching exercises with data:', error);
        // Fall back to all exercises
        setExercisesWithData(exercises);
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0].id);
        }
      }
    };

    if (exercises.length > 0) {
      fetchExercisesWithData();
    }
  }, [exercises]);

  // Fetch workout frequency data with improved error handling
  useEffect(() => {
    const fetchFrequencyData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, frequency: true }));
        const response = await progressApi.getWorkoutFrequency(periodFilter);
        
        console.log("Workout frequency data:", response.data); // Debug to see the actual data
        
        if (!response.data) {
          console.error('No workout frequency data received');
          return;
        }
        
        setProgressData(prev => ({
          ...prev,
          workoutFrequency: response.data
        }));
      } catch (error) {
        console.error('Error fetching workout frequency:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, frequency: false }));
      }
    };

    fetchFrequencyData();
  }, [periodFilter]);

  // Fetch personal records with improved error handling
  useEffect(() => {
    const fetchPersonalRecords = async () => {
      try {
        setIsLoading(prev => ({ ...prev, records: true }));
        const response = await progressApi.getPersonalRecords();
        
        console.log("Personal records data:", response.data); // Debug to see the actual data
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('Invalid personal records data format:', response.data);
          setProgressData(prev => ({
            ...prev,
            personalRecords: []
          }));
          return;
        }
        
        // Transform the data to match the expected format for display
        let records = response.data.map(record => {
          // Check if all required data exists
          if (record.exercise && record.max_weight && record.max_reps) {
            return {
              exercise_name: record.exercise.name,
              exercise_id: record.exercise.id,
              weight: record.max_weight.weight,
              reps: record.max_reps.reps,
              date: record.max_weight.date || record.max_reps.date
            };
          }
          return null;
        }).filter(Boolean); // Remove any null entries
        
        console.log("Transformed personal records:", records);
        
        // Convert weights if needed
        if (weightUnit === 'lb' && records.length > 0) {
          records = records.map(record => ({
            ...record,
            weight: convertToPreferred(record.weight, 'kg')
          }));
        }
        
        setProgressData(prev => ({
          ...prev,
          personalRecords: records
        }));
      } catch (error) {
        console.error('Error fetching personal records:', error);
        setError('Failed to load personal records');
      } finally {
        setIsLoading(prev => ({ ...prev, records: false }));
      }
    };

    fetchPersonalRecords();
  }, [weightUnit, convertToPreferred]);

  // Fetch progress data when selected exercise changes
  useEffect(() => {
    if (!selectedExercise) return;

    const fetchProgressData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, progress: true }));
        const response = await progressApi.getExerciseProgress(selectedExercise);
        
        const apiData = response.data;
        
        // Process data from API response - extract data points and dates
        const dataPoints = apiData.data || [];
        
        // Create separate arrays for dates and values
        const dates = dataPoints.map(item => item.date);
        const weightValues = dataPoints.map(item => item.value);
        
        // Convert weights to preferred unit if using imperial
        const convertedWeights = weightUnit === 'lb' 
          ? weightValues.map(weight => convertToPreferred(weight, 'kg'))
          : weightValues;

        // Create formatted weight progress data for the charts
        const formattedWeightProgress = dataPoints.map((item, index) => ({
          date: item.date,
          weight: convertedWeights[index]
        }));
        
        // Format volume data (for now using the same data points)
        // In the future, you might want to make a separate API call for volume data
        const formattedVolumeProgress = dataPoints.map(item => ({
          date: item.date,
          volume: item.value // This should be changed to actual volume data when available
        }));
        
        setProgressData(prev => ({
          ...prev,
          weightProgress: formattedWeightProgress,
          volumeProgress: formattedVolumeProgress,
          weights: convertedWeights,
          dates: dates
        }));
      } catch (error) {
        console.error('Error fetching exercise progress:', error);
        setError('Failed to load exercise progress data');
      } finally {
        setIsLoading(prev => ({ ...prev, progress: false }));
      }
    };

    fetchProgressData();
  }, [selectedExercise, weightUnit, convertToPreferred]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle exercise change
  const handleExerciseChange = (event) => {
    setSelectedExercise(event.target.value);
  };

  // Handle period filter change
  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Render weight progress chart
  const renderWeightProgressChart = () => {
    if (isLoading.progress) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!progressData.weightProgress || progressData.weightProgress.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No weight progress data available for this exercise yet.
          </Typography>
        </Box>
      );
    }

    const data = {
      labels: progressData.dates?.map(date => formatDate(date)) || [],
      datasets: [
        {
          label: `Weight (${weightUnit})`,
          data: progressData.weights || [],
          fill: false,
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          tension: 0.1
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Weight Progress Over Time'
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const index = tooltipItems[0].dataIndex;
              return formatDate(progressData.dates[index]);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: `Weight (${weightUnit})`
          }
        }
      }
    };

    return (
      <Box sx={{ height: '300px' }}>
        <Line data={data} options={options} />
      </Box>
    );
  };

  // Render volume progress chart
  const renderVolumeProgressChart = () => {
    if (isLoading.progress) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!progressData.volumeProgress || progressData.volumeProgress.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No volume progress data available for this exercise yet.
          </Typography>
        </Box>
      );
    }

    const data = {
      labels: progressData.dates?.map(date => formatDate(date)) || [],
      datasets: [
        {
          label: 'Volume (weight × reps)',
          data: progressData.volumeProgress.map(item => item.volume),
          fill: false,
          backgroundColor: 'rgba(153,102,255,0.4)',
          borderColor: 'rgba(153,102,255,1)',
          tension: 0.1
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Volume Progress Over Time'
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const index = tooltipItems[0].dataIndex;
              return formatDate(progressData.dates[index]);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Volume'
          }
        }
      }
    };

    return (
      <Box sx={{ height: '300px' }}>
        <Line data={data} options={options} />
      </Box>
    );
  };

  // Render workout frequency chart
  const renderWorkoutFrequencyChart = () => {
    if (isLoading.frequency) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!progressData.workoutFrequency || !progressData.workoutFrequency.days) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No workout frequency data available yet.
          </Typography>
        </Box>
      );
    }

    const days = progressData.workoutFrequency.days || {};
    const labels = Object.keys(days);
    const counts = Object.values(days);

    const data = {
      labels,
      datasets: [
        {
          label: 'Workout Count',
          data: counts,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Workout Frequency by Day'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };

    return (
      <Box sx={{ height: '300px' }}>
        <Bar data={data} options={options} />
      </Box>
    );
  };

  // Render personal records
  const renderPersonalRecords = () => {
    if (isLoading.records) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!progressData.personalRecords || progressData.personalRecords.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No personal records available yet. Keep training to set new records!
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Exercise</TableCell>
              <TableCell align="right">Weight ({weightUnit})</TableCell>
              <TableCell align="right">Reps</TableCell>
              <TableCell align="right">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {progressData.personalRecords.map((record, index) => (
              <TableRow key={index} hover>
                <TableCell component="th" scope="row">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AchievementIcon 
                      color="primary" 
                      fontSize="small" 
                      sx={{ mr: 1 }} 
                    />
                    {record.exercise_name}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {Math.round(record.weight)} {weightUnit}
                  </Typography>
                </TableCell>
                <TableCell align="right">{record.reps}</TableCell>
                <TableCell align="right">{formatDate(record.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render workout summary statistics
  const renderWorkoutSummary = () => {
    if (isLoading.frequency) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
          <CircularProgress />
        </Box>
      );
    }

    // Update how we extract total, this_week, and this_month from the data
    const { statistics } = progressData.workoutFrequency || {};
    const total = statistics ? statistics.total_workouts : 0;
    const this_month = statistics ? statistics.total_workouts : 0; // Using total_workouts since we're fetching monthly data

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Paper 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Workouts
            </Typography>
            <Typography variant="h4" color="primary.main">
              {total || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              borderLeft: '4px solid',
              borderColor: 'success.main'
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              This Month
            </Typography>
            <Typography variant="h4" color="success.main">
              {this_month || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Update the Select component in the Exercise Progress section to use exercisesWithData
  const renderExerciseSelector = () => {
    if (isLoading.exercises) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <FormControl fullWidth>
        <InputLabel id="exercise-select-label">Select Exercise</InputLabel>
        <Select
          labelId="exercise-select-label"
          id="exercise-select"
          value={selectedExercise}
          label="Select Exercise"
          onChange={handleExerciseChange}
        >
          {exercisesWithData.length > 0 ? (
            exercisesWithData.map((exercise) => (
              <MenuItem key={exercise.id} value={exercise.id}>
                {exercise.name}
              </MenuItem>
            ))
          ) : (
            exercises.map((exercise) => (
              <MenuItem key={exercise.id} value={exercise.id}>
                {exercise.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    );
  };

  // If everything is loading, show a full page loader
  const isEverythingLoading = 
    isLoading.exercises && 
    isLoading.progress && 
    isLoading.frequency && 
    isLoading.records;

  if (isEverythingLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">
          Loading your progress data...
        </Typography>
      </Box>
    );
  }

  // If there's a critical error
  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Progress Tracking
      </Typography>

      {/* Workout Summary */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <FitnessCenterIcon sx={{ mr: 1 }} />
          Workout Summary
        </Typography>
        {renderWorkoutSummary()}
      </Box>

      {/* Personal Records */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AchievementIcon sx={{ mr: 1 }} />
          Personal Records
        </Typography>
        {renderPersonalRecords()}
      </Box>

      {/* Workout Frequency */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarIcon sx={{ mr: 1 }} />
            Workout Frequency
          </Typography>
          
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel id="period-filter-label">Time Period</InputLabel>
            <Select
              labelId="period-filter-label"
              id="period-filter"
              value={periodFilter}
              label="Time Period"
              onChange={handlePeriodChange}
            >
              <MenuItem value="week">Past Week</MenuItem>
              <MenuItem value="month">Past Month</MenuItem>
              <MenuItem value="3months">Past 3 Months</MenuItem>
              <MenuItem value="year">Past Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Paper sx={{ p: 2 }}>
          {renderWorkoutFrequencyChart()}
        </Paper>
      </Box>

      {/* Exercise Progress */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 1 }} />
          Exercise Progress
        </Typography>

        <Box sx={{ mb: 3 }}>
          {renderExerciseSelector()}
        </Box>

        <Paper>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Weight Progress" />
            <Tab label="Volume Progress" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            {activeTab === 0 && renderWeightProgressChart()}
            {activeTab === 1 && renderVolumeProgressChart()}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Progress; 
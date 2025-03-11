import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
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
  Divider,
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
  const [activeTab, setActiveTab] = useState(0);
  const [exercises, setExercises] = useState([]);
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
          setSelectedExercise(response.data[0].id);
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

  // Fetch workout frequency data
  useEffect(() => {
    const fetchFrequencyData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, frequency: true }));
        const response = await progressApi.getWorkoutFrequency(periodFilter);
        
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

  // Fetch personal records
  useEffect(() => {
    const fetchPersonalRecords = async () => {
      try {
        setIsLoading(prev => ({ ...prev, records: true }));
        const response = await progressApi.getPersonalRecords();
        
        setProgressData(prev => ({
          ...prev,
          personalRecords: response.data
        }));
      } catch (error) {
        console.error('Error fetching personal records:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, records: false }));
      }
    };

    fetchPersonalRecords();
  }, []);

  // Fetch progress data when selected exercise changes
  useEffect(() => {
    if (!selectedExercise) return;

    const fetchProgressData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, progress: true }));
        const response = await progressApi.getExerciseProgress(selectedExercise);
        
        setProgressData(prev => ({
          ...prev,
          weightProgress: response.data.weight_progress || [],
          volumeProgress: response.data.volume_progress || []
        }));
      } catch (error) {
        console.error('Error fetching exercise progress:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, progress: false }));
      }
    };

    fetchProgressData();
  }, [selectedExercise]);

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
      labels: progressData.weightProgress.map(item => formatDate(item.date)),
      datasets: [
        {
          label: 'Weight (kg)',
          data: progressData.weightProgress.map(item => item.weight),
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
              return formatDate(progressData.weightProgress[index].date);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Weight (kg)'
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
      labels: progressData.volumeProgress.map(item => formatDate(item.date)),
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
              <TableCell align="right">Weight (kg)</TableCell>
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
                    {record.weight}
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

    const { total, this_week, this_month } = progressData.workoutFrequency || {};

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
          <Paper 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              borderLeft: '4px solid',
              borderColor: 'secondary.main'
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              This Week
            </Typography>
            <Typography variant="h4" color="secondary.main">
              {this_week || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
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
          <FormControl fullWidth>
            <InputLabel id="exercise-select-label">Select Exercise</InputLabel>
            <Select
              labelId="exercise-select-label"
              id="exercise-select"
              value={selectedExercise}
              label="Select Exercise"
              onChange={handleExerciseChange}
            >
              {exercises.map((exercise) => (
                <MenuItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
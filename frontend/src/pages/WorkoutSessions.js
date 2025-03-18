import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  TablePagination
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { sessionsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';

const WorkoutSessions = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, unitSystem, displayWeight } = useUnitSystem();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchWorkoutSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Set status filter based on active tab
      const params = {};
      if (tabValue === 1) {
        params.status = 'completed';
      } else if (tabValue === 2) {
        params.status = 'in_progress';
      }
      
      const response = await sessionsApi.getAll(params);
      
      // Log the original response for debugging
      console.log('WorkoutSessions - Original data from API:', response.data);
      
      // Always convert weights regardless of unit system
      const convertedSessions = response.data.map(session => ({
        ...session,
        total_weight: session.total_weight ? convertToPreferred(session.total_weight, 'kg') : 0
      }));
      
      console.log('WorkoutSessions - Converted weights to user preferred unit:', unitSystem);
      setSessions(convertedSessions);
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tabValue, unitSystem, convertToPreferred]);
  
  useEffect(() => {
    fetchWorkoutSessions();
  }, [fetchWorkoutSessions]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStartWorkout = () => {
    navigate('/workout-plans');
  };

  const handleViewSession = (sessionId) => {
    navigate(`/workout-sessions/${sessionId}`);
  };

  const handleDeleteClick = (session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      await sessionsApi.delete(sessionToDelete.id);
      setSessions(sessions.filter(session => session.id !== sessionToDelete.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting workout session:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format the date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format the duration for display
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'In Progress';
    
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'planned':
        return 'info';
      default:
        return 'default';
    }
  };

  const getDisplayRows = () => {
    return sessions
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workout History</Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<FitnessCenterIcon />}
          onClick={handleStartWorkout}
        >
          Start New Workout
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="All Sessions" />
          <Tab label="Completed" />
          <Tab label="In Progress" />
        </Tabs>
      </Paper>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress />
        </Box>
      ) : sessions.length > 0 ? (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Workout</TableCell>
                  <TableCell>Exercises</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Total Weight</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getDisplayRows().map((session) => (
                  <TableRow 
                    key={session.id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => handleViewSession(session.id)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        {formatDate(session.start_time)}
                      </Box>
                    </TableCell>
                    <TableCell>{session.name || 'Unnamed Workout'}</TableCell>
                    <TableCell>{session.exercises?.length || 0} exercises</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TimerIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        {formatDuration(session.start_time, session.end_time)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {session.total_weight ? displayWeight(session.total_weight) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={session.status} 
                        color={getStatusColor(session.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSession(session.id);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(session);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sessions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FitnessCenterIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Workout Sessions Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Start your fitness journey by completing your first workout!
            </Typography>
            <Button 
              variant="contained"
              onClick={handleStartWorkout}
            >
              Start Your First Workout
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workout Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this workout session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSession} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkoutSessions; 
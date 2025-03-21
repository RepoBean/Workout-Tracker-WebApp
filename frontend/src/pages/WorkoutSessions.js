import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TablePagination,
  Grid,
  styled
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon
} from '@mui/icons-material';
import { sessionsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useUnitSystem } from '../utils/unitUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';

// Calendar grid container to ensure proper layout
const CalendarGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: theme.spacing(1),
  width: '100%',
  marginBottom: theme.spacing(2)
}));

// Calendar header for day names
const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  width: '100%',
  marginBottom: theme.spacing(1)
}));

// Styled calendar day cell
const CalendarDay = styled(Box)(({ theme, isToday, hasWorkout, isCurrentMonth, isSelected }) => ({
  width: '100%',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  position: 'relative',
  cursor: hasWorkout ? 'pointer' : 'default',
  fontWeight: isToday ? 'bold' : 'normal',
  color: !isCurrentMonth ? theme.palette.text.disabled : 
         isToday ? theme.palette.primary.main : 
         theme.palette.text.primary,
  backgroundColor: isSelected ? theme.palette.primary.main : 
                   hasWorkout ? theme.palette.action.selected : 
                   'transparent',
  '&:hover': {
    backgroundColor: hasWorkout ? 
      (isSelected ? theme.palette.primary.dark : theme.palette.action.hover) : 
      'transparent',
    color: isSelected ? theme.palette.common.white : undefined,
  },
  color: isSelected ? theme.palette.common.white : undefined,
}));

// Calendar day container to maintain consistent layout
const CalendarDayContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5),
  position: 'relative'
}));

// Calendar day workout indicator
const WorkoutIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main
}));

const WorkoutSessions = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { weightUnit, convertToPreferred, unitSystem, displayWeight } = useUnitSystem();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [workoutDays, setWorkoutDays] = useState({});

  const fetchWorkoutSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all sessions without status filtering
      const response = await sessionsApi.getAll();
      
      // Log the original response for debugging
      console.log('WorkoutSessions - Original data from API:', response.data);
      
      // Always convert weights regardless of unit system
      const convertedSessions = response.data.map(session => ({
        ...session,
        total_weight: session.total_weight ? convertToPreferred(session.total_weight, 'kg') : 0
      }));
      
      console.log('WorkoutSessions - Converted weights to user preferred unit:', unitSystem);
      setSessions(convertedSessions);
      
      // Create lookup of workout days with improved date handling
      const workoutDaysMap = {};
      convertedSessions.forEach(session => {
        if (session.start_time) {
          // Handle date formatting more carefully to account for timezone issues
          const sessionDate = new Date(session.start_time);
          const dateStr = format(sessionDate, 'yyyy-MM-dd');
          
          console.log(`Debug - Processing session:`, {
            id: session.id,
            original_date: session.start_time,
            parsed_date: sessionDate,
            formatted_date: dateStr
          });
          
          if (!workoutDaysMap[dateStr]) {
            workoutDaysMap[dateStr] = [];
          }
          workoutDaysMap[dateStr].push(session);
        }
      });
      
      console.log('Debug - Workout days map:', workoutDaysMap);
      setWorkoutDays(workoutDaysMap);
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unitSystem, convertToPreferred]);
  
  useEffect(() => {
    fetchWorkoutSessions();
  }, [fetchWorkoutSessions]);

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
      
      // Refresh calendar data
      fetchWorkoutSessions();
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

  // Get the display sessions (filtered by selected date if applicable)
  const getDisplayRows = () => {
    let filteredSessions = sessions;
    
    // If a date is selected, filter to show only that day's workouts
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log(`Debug - Filtering sessions for date: ${dateStr}`);
      
      filteredSessions = sessions.filter(session => {
        if (!session.start_time) return false;
        const sessionDate = new Date(session.start_time);
        const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');
        const matches = sessionDateStr === dateStr;
        
        console.log(`Debug - Session ${session.id} date ${sessionDateStr} matches filter ${dateStr}: ${matches}`);
        return matches;
      });
    }
    
    return filteredSessions
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };
  
  // Calendar navigation
  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };
  
  const handleDateClick = (day) => {
    // Format day to match our workout days format (YYYY-MM-DD)
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // Only allow selecting days with workouts
    if (workoutDays[dateStr] && workoutDays[dateStr].length > 0) {
      // If user clicks the same date, toggle it off
      if (selectedDate && isSameDay(selectedDate, day)) {
        setSelectedDate(null);
      } else {
        setSelectedDate(day);
        
        // If there's exactly one workout on this day, navigate directly to it
        if (workoutDays[dateStr].length === 1) {
          handleViewSession(workoutDays[dateStr][0].id);
        }
      }
    }
  };
  
  // Generate days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Generate days from start to end of month
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);
  
  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  
  // Check if a day has workouts
  const dayHasWorkout = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    console.log(`Debug - Checking workouts for ${dateStr}:`, !!workoutDays[dateStr]);
    return workoutDays[dateStr] && workoutDays[dateStr].length > 0;
  };
  
  // Get workout count for a day
  const getWorkoutCount = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const count = workoutDays[dateStr] ? workoutDays[dateStr].length : 0;
    console.log(`Debug - Workout count for ${dateStr}:`, count);
    return count;
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

      {/* Calendar Month View */}
      <Paper sx={{ width: '100%', p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handlePrevMonth}>
            <PrevIcon />
          </IconButton>
          <Typography variant="h6">
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={handleNextMonth}>
            <NextIcon />
          </IconButton>
        </Box>
        
        {/* Calendar header for day names */}
        <CalendarHeader>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Typography 
              key={day} 
              align="center" 
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              {day}
            </Typography>
          ))}
        </CalendarHeader>
        
        {/* Calendar grid */}
        <CalendarGrid>
          {/* Empty cells for days before the start of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <CalendarDayContainer key={`empty-start-${index}`} />
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasWorkout = dayHasWorkout(day);
            const isToday = isSameDay(new Date(), day);
            const isSelected = selectedDate && isSameDay(selectedDate, day);
            
            return (
              <CalendarDayContainer key={dateStr}>
                <CalendarDay
                  isToday={isToday}
                  hasWorkout={hasWorkout}
                  isCurrentMonth={isSameMonth(day, currentMonth)}
                  isSelected={isSelected}
                  onClick={() => handleDateClick(day)}
                >
                  {format(day, 'd')}
                </CalendarDay>
                {hasWorkout && <WorkoutIndicator />}
              </CalendarDayContainer>
            );
          })}
        </CalendarGrid>
        
        {selectedDate && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {getWorkoutCount(selectedDate)} workout{getWorkoutCount(selectedDate) !== 1 ? 's' : ''} on {format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Table View */}
      <Paper sx={{ width: '100%', p: 2, mb: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Workout</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getDisplayRows().map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDate(session.start_time)}</TableCell>
                  <TableCell>{session.name}</TableCell>
                  <TableCell>{formatDuration(session.start_time, session.end_time)}</TableCell>
                  <TableCell>{displayWeight(session.total_weight)}</TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleViewSession(session.id)}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(session)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={selectedDate ? 
            // If date selected, count only workouts for that day
            sessions.filter(s => {
              if (!s.start_time) return false;
              const sessionDate = new Date(s.start_time);
              return format(sessionDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            }).length : 
            sessions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete Workout Session"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this workout session?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteSession} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkoutSessions;
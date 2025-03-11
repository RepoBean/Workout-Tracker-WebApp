import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActions,
  Grid, 
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  FileCopy as CopyIcon,
  Share as ShareIcon,
  FileUpload as UploadIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { workoutPlansApi } from '../utils/api';

const WorkoutPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState(null);

  // Get workout plans on mount
  useEffect(() => {
    fetchWorkoutPlans();
  }, []);

  // Filter plans when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlans(plans);
    } else {
      const filtered = plans.filter(plan => 
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredPlans(filtered);
    }
  }, [searchTerm, plans]);

  // Fetch workout plans
  const fetchWorkoutPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await workoutPlansApi.getAll();
      setPlans(response.data);
      setFilteredPlans(response.data);
    } catch (error) {
      console.error('Error fetching workout plans:', error);
      setError('Failed to load workout plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening menu for plan actions
  const handleMenuOpen = (event, plan) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlan(plan);
  };

  // Handle closing menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle creating a new plan
  const handleCreatePlan = () => {
    navigate('/workout-plans/create');
  };

  // Handle viewing plan details
  const handleViewPlan = (planId) => {
    navigate(`/workout-plans/${planId}`);
  };

  // Handle editing a plan
  const handleEditPlan = () => {
    if (selectedPlan) {
      navigate(`/workout-plans/${selectedPlan.id}/edit`);
    }
    handleMenuClose();
  };

  // Open delete confirmation dialog
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // Delete a plan
  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    
    try {
      await workoutPlansApi.delete(selectedPlan.id);
      
      setPlans(plans.filter(plan => plan.id !== selectedPlan.id));
      setSnackbar({
        open: true,
        message: 'Workout plan deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete workout plan',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Start a workout from a plan
  const handleStartWorkout = () => {
    if (selectedPlan) {
      navigate(`/workout-sessions/new?plan_id=${selectedPlan.id}`);
    }
    handleMenuClose();
  };

  // Set a plan as active
  const handleSetActive = async () => {
    if (!selectedPlan) return;
    
    try {
      await workoutPlansApi.update(selectedPlan.id, { is_active: true });
      
      // Update plans to reflect the change
      setPlans(plans.map(plan => ({
        ...plan,
        is_active: plan.id === selectedPlan.id
      })));
      
      setSnackbar({
        open: true,
        message: 'Workout plan set as active',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error setting active plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to set plan as active',
        severity: 'error'
      });
    }
    
    handleMenuClose();
  };

  // Handle plan export
  const handleExportPlan = async () => {
    if (!selectedPlan) return;
    
    try {
      const response = await workoutPlansApi.export(selectedPlan.id);
      
      // Create a download link for the exported file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedPlan.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbar({
        open: true,
        message: 'Workout plan exported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting workout plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export workout plan',
        severity: 'error'
      });
    }
    
    handleMenuClose();
  };

  // Open upload dialog
  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  // Handle file selection
  const handleFileChange = (event) => {
    setUploadFile(event.target.files[0]);
  };

  // Handle plan import
  const handleImportPlan = async () => {
    if (!uploadFile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      await workoutPlansApi.import(formData);
      
      fetchWorkoutPlans();
      setUploadDialogOpen(false);
      setUploadFile(null);
      
      setSnackbar({
        open: true,
        message: 'Workout plan imported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error importing workout plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to import workout plan',
        severity: 'error'
      });
    }
  };

  // Handle search term change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // If there's a loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // If there's an error
  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained"
          onClick={fetchWorkoutPlans}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Workout Plans</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleUploadClick}
          >
            Import Plan
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreatePlan}
          >
            Create Plan
          </Button>
        </Box>
      </Box>
      
      {/* Search bar */}
      <Box sx={{ mb: 4 }}>
        <TextField 
          fullWidth
          placeholder="Search workout plans..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>
      
      {/* Workout Plans Grid */}
      {filteredPlans.length > 0 ? (
        <Grid container spacing={3}>
          {filteredPlans.map(plan => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {plan.name}
                    </Typography>
                    <IconButton 
                      size="small"
                      onClick={(e) => handleMenuOpen(e, plan)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>
                  
                  {plan.is_active && (
                    <Chip
                      size="small"
                      color="primary"
                      icon={<CheckIcon />}
                      label="Active Plan"
                      sx={{ mb: 2 }}
                    />
                  )}
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {plan.description || 'No description provided'}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FitnessCenterIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {plan.exercises_count || 0} exercises
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => handleViewPlan(plan.id)}
                  >
                    View Details
                  </Button>
                  <Button 
                    size="small"
                    color="primary"
                    startIcon={<StartIcon />}
                    onClick={() => {
                      setSelectedPlan(plan);
                      handleStartWorkout();
                    }}
                  >
                    Start Workout
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FitnessCenterIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Workout Plans Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm.trim() !== '' 
              ? 'No workout plans match your search. Try a different search term or create a new plan.'
              : 'You don\'t have any workout plans yet. Create your first plan to get started!'}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreatePlan}
          >
            Create a Workout Plan
          </Button>
        </Paper>
      )}
      
      {/* Plan Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditPlan}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleStartWorkout}>
          <ListItemIcon>
            <StartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Start Workout</ListItemText>
        </MenuItem>
        
        {selectedPlan && !selectedPlan.is_active && (
          <MenuItem onClick={handleSetActive}>
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Set as Active</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleExportPlan}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workout Plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this workout plan? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePlan} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Upload/Import Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
      >
        <DialogTitle>Import Workout Plan</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a JSON file with your workout plan details.
          </DialogContentText>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Select File
              <input
                type="file"
                accept=".json"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            
            {uploadFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {uploadFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleImportPlan} 
            variant="contained" 
            color="primary"
            disabled={!uploadFile}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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

export default WorkoutPlans; 
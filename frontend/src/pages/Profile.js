import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  TextField,
  Avatar,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Paper,
  CircularProgress,
  Tab,
  Tabs,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ListItemIcon,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Person as PersonIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  PhotoCamera as PhotoCameraIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  DeleteForever as DeleteIcon,
  SupervisorAccount as AdminIcon,
  PersonOff as RemoveAdminIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../utils/api';
import { useUnitSystem } from '../utils/unitUtils';
import { useAppTheme } from '../contexts/ThemeContext';

// Tab panel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Profile = () => {
  const { currentUser, updateProfile, logout, isAdmin } = useAuth();
  const { unitSystem, toggleUnitSystem } = useUnitSystem();
  const { darkMode, toggleDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    bio: ''
  });
  
  // Settings state
  const [settings, setSettings] = useState({
    darkMode: false,
    unitSystem: 'metric', // metric or imperial
    language: 'en', // en, es, fr, etc.
  });

  // State for Admin User List
  const [adminUserList, setAdminUserList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  // State for Admin action confirmation dialogs
  const [userToDelete, setUserToDelete] = useState(null); // Store user object for delete confirm
  const [userToModifyRole, setUserToModifyRole] = useState(null); // Store user object for role confirm
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false); // Loading for role/delete actions

  // Fetch User List for Admin Tab
  const fetchAdminUserList = useCallback(async () => {
    if (tabValue === 3 && isAdmin()) { // Only fetch if Admin tab is active and user is admin
      setAdminLoading(true);
      setAdminError(null);
      try {
        // Use the existing /api/users endpoint (assuming userApi has a function for it)
        // If not, we need to add one to utils/api.js
        // Let's assume userApi.getAllUsers() exists for now
        const response = await userApi.getAllUsers(); // Make sure this exists!
        setAdminUserList(response.data || []);
      } catch (err) {
        console.error("Error fetching user list:", err);
        setAdminError(err.response?.data?.detail || 'Failed to load users. Ensure you have admin privileges.');
      } finally {
        setAdminLoading(false);
      }
    }
  }, [tabValue, isAdmin]); // Dependencies: fetch when tab changes or admin status potentially changes

  useEffect(() => {
    fetchAdminUserList();
  }, [fetchAdminUserList]); // Run fetch logic when the callback changes

  // Load user data on mount
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        username: currentUser.username || '',
        email: currentUser.email || '',
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        bio: currentUser.bio || ''
      });
      
      // Load user settings if available
      if (currentUser.settings) {
        setSettings({
          ...currentUser.settings,
          darkMode: darkMode
        });
      } else {
        setSettings(prevSettings => ({
          ...prevSettings,
          darkMode: darkMode
        }));
      }
    }
  }, [currentUser, darkMode]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle profile changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  // Handle settings changes
  const handleSettingsChange = (e) => {
    const { name, value, checked } = e.target;
    const newValue = e.target.type === 'checkbox' ? checked : value;
    
    // Update local settings state
    setSettings({
      ...settings,
      [name]: newValue
    });
    
    // Special handling for darkMode to update ThemeContext immediately
    if (name === 'darkMode') {
      toggleDarkMode();
    }
    
    // Special handling for unit system to update UnitSystemContext immediately
    if (name === 'unitSystem' && newValue !== unitSystem) {
      toggleUnitSystem();
    }
  };

  // Handle password change form
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.updateProfile(profileData);
      
      // Update the auth context with new user data
      updateProfile(response.data);
      
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const response = await userApi.updateSettings(settings);
      
      // Update the global user context with the new user data
      updateProfile(response.data);
      
      setSnackbar({
        open: true,
        message: 'Settings updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update settings',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate password change
  const validatePasswordChange = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!validatePasswordChange()) {
      return;
    }
    
    try {
      setLoading(true);
      await userApi.updateProfile({
        current_password: passwordData.currentPassword,
        password: passwordData.newPassword
      });
      
      // Clear form after successful change
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSnackbar({
        open: true,
        message: 'Password changed successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to change password',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await userApi.deleteAccount();
      
      // Log the user out
      logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete account',
        severity: 'error'
      });
      setConfirmDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Admin Actions
  const handleOpenRoleConfirm = (user) => {
    setUserToModifyRole(user);
    setRoleConfirmOpen(true);
  };

  const handleCloseRoleConfirm = () => {
    setUserToModifyRole(null);
    setRoleConfirmOpen(false);
  };

  const handleOpenDeleteConfirm = (user) => {
    setUserToDelete(user);
    setDeleteUserConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setUserToDelete(null);
    setDeleteUserConfirmOpen(false);
  };

  // Confirmation Handlers (Implement logic later)
  const handleConfirmRoleChange = async () => {
    if (!userToModifyRole) return;
    setAdminActionLoading(true);
    console.log("Confirming role change for:", userToModifyRole);
    // --- API call logic here --- 
    // await userApi.updateUserRole(userToModifyRole.id, !userToModifyRole.is_admin);
    // --- Update state, show snackbar, close dialog --- 
    setAdminActionLoading(false);
    handleCloseRoleConfirm();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setAdminActionLoading(true);
    // console.log("Confirming deletion for:", userToDelete); // Keep or remove logging as needed
    try {
      // Call the API to delete the user
      await userApi.deleteUser(userToDelete.id);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `User '${userToDelete.username}' deleted successfully.`, 
        severity: 'success'
      });
      
      // Refresh the user list to reflect the deletion
      fetchAdminUserList(); 
      
    } catch (err) {
      console.error("Error deleting user:", err);
      // Show error message
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to delete user.',
        severity: 'error'
      });
    } finally {
      // Stop loading and close the dialog regardless of success/error
      setAdminActionLoading(false);
      handleCloseDeleteConfirm();
    }
  };

  // Render loading state
  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile & Settings
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<SettingsIcon />} label="Settings" />
          <Tab icon={<SecurityIcon />} label="Security" />
          {isAdmin() && (
            <Tab icon={<AdminPanelSettingsIcon />} label="Admin" />
          )}
        </Tabs>
      </Paper>

      {/* Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: 'primary.main',
                  fontSize: '3rem',
                  mr: 3
                }}
              >
                {currentUser.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h5">
                  {currentUser.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Member since {new Date(currentUser.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="About Me"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  margin="normal"
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={loading}
              >
                Save Profile
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={handleSettingsChange}
                      name="darkMode"
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Unit System"
                  name="unitSystem"
                  value={settings.unitSystem}
                  onChange={handleSettingsChange}
                  margin="normal"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="metric">Metric (kg, cm)</option>
                  <option value="imperial">Imperial (lbs, in)</option>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Language"
                  name="language"
                  value={settings.language}
                  onChange={handleSettingsChange}
                  margin="normal"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </TextField>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={loading}
              >
                Save Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  error={!!passwordErrors.currentPassword}
                  helperText={passwordErrors.currentPassword}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleChangePassword}
                disabled={loading}
              >
                Change Password
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="error">
              Danger Zone
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Once you delete your account, there is no going back. Please be certain.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmDialogOpen(true)}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Admin Tab */}
      {isAdmin() && (
        <TabPanel value={tabValue} index={3}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Management
              </Typography>
              <Divider sx={{ my: 2 }} />

              {adminLoading && <CircularProgress />}
              {adminError && <Alert severity="error">{adminError}</Alert>}

              {!adminLoading && !adminError && (
                <TableContainer component={Paper} elevation={1}>
                  <Table sx={{ minWidth: 650 }} aria-label="user management table">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
                        <TableCell>ID</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Admin Status</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {adminUserList.map((user) => (
                        <TableRow
                          key={user.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {user.id}
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_admin ? 'Admin' : 'User'}
                              color={user.is_admin ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={user.is_admin ? "Remove Admin" : "Make Admin"}>
                              <span>
                                <IconButton 
                                  aria-label="toggle admin role" 
                                  color={user.is_admin ? "warning" : "success"}
                                  onClick={() => handleOpenRoleConfirm(user)}
                                  disabled={user.id === currentUser.id}
                                >
                                  {user.is_admin ? <RemoveAdminIcon /> : <AdminIcon />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <span>
                                <IconButton 
                                  aria-label="delete user" 
                                  color="error"
                                  onClick={() => handleOpenDeleteConfirm(user)}
                                  disabled={user.id === currentUser.id}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      )}

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" disabled={loading}>
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={roleConfirmOpen} onClose={handleCloseRoleConfirm}>
        <DialogTitle>Confirm Role Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {userToModifyRole?.is_admin ? 'remove admin privileges from' : 'grant admin privileges to'} <strong>{userToModifyRole?.username}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleConfirm} disabled={adminActionLoading}>Cancel</Button>
          <Button 
            onClick={handleConfirmRoleChange} 
            color={userToModifyRole?.is_admin ? "warning" : "success"} 
            disabled={adminActionLoading}
            variant="contained"
          >
            {adminActionLoading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle color="error">Confirm User Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you absolutely sure you want to delete the user <strong>{userToDelete?.username}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={adminActionLoading}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            disabled={adminActionLoading}
            variant="contained"
          >
            {adminActionLoading ? <CircularProgress size={24} color="error"/> : 'Delete User'}
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

export default Profile; 
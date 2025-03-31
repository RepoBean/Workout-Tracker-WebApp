import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkoutPlans from './pages/WorkoutPlans';
import WorkoutPlanDetail from './pages/WorkoutPlanDetail';
import CreateWorkoutPlan from './pages/CreateWorkoutPlan';
import EditWorkoutPlan from './pages/EditWorkoutPlan';
import WorkoutSessions from './pages/WorkoutSessions';
import ActiveWorkout from './pages/ActiveWorkout';
import WorkoutSessionDetail from './pages/WorkoutSessionDetail';
import Exercises from './pages/Exercises';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import OnboardingGuide from './components/OnboardingGuide';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</Box>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Admin route component
const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</Box>;
  }
  
  if (!currentUser || !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  const { currentUser, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && currentUser && !currentUser.has_completed_onboarding) {
      console.log('Triggering onboarding guide for user:', currentUser.username);
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [currentUser, loading]);

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={currentUser ? <Navigate to="/dashboard" /> : <Register />} />
        </Route>
        
        {/* Protected routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/workout-plans" element={
            <ProtectedRoute>
              <WorkoutPlans />
            </ProtectedRoute>
          } />
          
          <Route path="/workout-plans/create" element={
            <ProtectedRoute>
              <CreateWorkoutPlan />
            </ProtectedRoute>
          } />
          
          <Route path="/workout-plans/:id" element={
            <ProtectedRoute>
              <WorkoutPlanDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/workout-plans/:id/edit" element={
            <ProtectedRoute>
              <EditWorkoutPlan />
            </ProtectedRoute>
          } />
          
          <Route path="/workout-sessions" element={
            <ProtectedRoute>
              <WorkoutSessions />
            </ProtectedRoute>
          } />
          
          {/* New route for active workouts */}
          <Route path="/workout-sessions/new" element={
            <ProtectedRoute>
              <ActiveWorkout />
            </ProtectedRoute>
          } />
          
          {/* New route for resuming in-progress workouts */}
          <Route path="/workout-sessions/:id/resume" element={
            <ProtectedRoute>
              <ActiveWorkout />
            </ProtectedRoute>
          } />
          
          {/* Modified route for viewing workout history */}
          <Route path="/workout-sessions/:id" element={
            <ProtectedRoute>
              <WorkoutSessionDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/exercises" element={
            <ProtectedRoute>
              <Exercises />
            </ProtectedRoute>
          } />
          
          <Route path="/progress" element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      {showOnboarding && currentUser && (
        <OnboardingGuide 
          user={currentUser}
          open={showOnboarding} 
          onClose={() => setShowOnboarding(false)} 
        />
      )}
    </>
  );
}

export default App; 
import axios from 'axios';

// Create API instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 
    `http://${window.location.hostname}:8000`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if not already on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Workout plans API
export const workoutPlansApi = {
  getAll: () => api.get('/api/plans'),
  getById: (id) => {
    console.log(`DEBUG - API: Fetching workout plan with ID ${id}`);
    return api.get(`/api/plans/${id}`).then(response => {
      console.log(`DEBUG - API: Received plan data:`, response.data);
      return response;
    });
  },
  create: (planData) => {
    console.log(`DEBUG - API: Creating workout plan with data:`, planData);
    return api.post('/api/plans', planData);
  },
  update: (id, planData) => {
    console.log(`DEBUG - API: Updating workout plan ${id} with data:`, planData);
    return api.put(`/api/plans/${id}`, planData);
  },
  delete: (id) => api.delete(`/api/plans/${id}`),
  getExercises: (id) => api.get(`/api/plans/${id}/exercises`),
  addExercise: (id, exerciseData) => {
    console.log(`DEBUG - API: Adding exercise to plan ${id} with data:`, exerciseData);
    return api.post(`/api/plans/${id}/exercises`, exerciseData);
  },
  updateExercise: (planId, exerciseId, exerciseData) => {
    console.log(`DEBUG - API: Updating exercise ${exerciseId} in plan ${planId} with data:`, exerciseData);
    return api.put(`/api/plans/${planId}/exercises/${exerciseId}`, exerciseData);
  },
  deleteExercise: (planId, exerciseId) => 
    api.delete(`/api/plans/${planId}/exercises/${exerciseId}`),
  export: (id) => api.get(`/api/plans/${id}/export`, { responseType: 'blob' }),
  import: (formData, weightUnit = "kg") => {
    // Add weight unit to form data if provided
    if (weightUnit) {
      formData.append('weight_unit', weightUnit);
    }
    
    return api.post('/api/plans/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getNextWorkout: () => api.get('/api/plans/next'),
  activate: (id) => api.post(`/api/plans/${id}/activate`),
};

// Workout sessions API
export const sessionsApi = {
  getAll: (params) => api.get('/api/sessions', { params }),
  getById: (id) => api.get(`/api/sessions/${id}`),
  create: (sessionData) => api.post('/api/sessions', sessionData),
  update: (id, sessionData) => api.patch(`/api/sessions/${id}`, sessionData),
  delete: (id) => api.delete(`/api/sessions/${id}`),
  getExercises: (id) => api.get(`/api/sessions/${id}/exercises`),
  addExercise: (id, exerciseData) => api.post(`/api/sessions/${id}/exercises`, exerciseData),
  updateExercise: (sessionId, exerciseId, exerciseData) => 
    api.put(`/api/sessions/${sessionId}/exercises/${exerciseId}`, exerciseData),
  deleteExercise: (sessionId, exerciseId) => 
    api.delete(`/api/sessions/${sessionId}/exercises/${exerciseId}`),
  addSet: (sessionId, exerciseId, setData) => 
    api.post(`/api/sessions/${sessionId}/exercises/${exerciseId}/sets`, setData),
  updateSet: (sessionId, exerciseId, setId, setData) => 
    api.put(`/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, setData),
  deleteSet: (sessionId, exerciseId, setId) => 
    api.delete(`/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`),
  getByPlan: (planId, status) => {
    let url = `/api/sessions/plan/${planId}`;
    if (status) url += `?status=${status}`;
    return api.get(url);
  },
};

// Exercises API
export const exercisesApi = {
  getAll: () => api.get('/api/exercises'),
  getById: (id) => api.get(`/api/exercises/${id}`),
  create: (exerciseData) => api.post('/api/exercises', exerciseData),
  update: (id, exerciseData) => api.put(`/api/exercises/${id}`, exerciseData),
  delete: (id) => api.delete(`/api/exercises/${id}`),
  export: () => api.get('/api/exercises/export'),
  import: (formData) => api.post('/api/exercises/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Progress API
export const progressApi = {
  getExerciseProgress: (exerciseId) => api.get(`/api/progress/exercises/${exerciseId}`),
  getWorkoutFrequency: (period) => api.get('/api/progress/frequency', { params: { period } }),
  getVolumeProgress: (exerciseId) => api.get(`/api/progress/volume/${exerciseId}`),
  getPersonalRecords: () => api.get('/api/progress/records'),
};

// User API
export const userApi = {
  getAllUsers: () => api.get('/api/users'),
  getCurrentUser: () => api.get('/api/users/me'),
  updateProfile: (userData) => api.patch('/api/users/me', userData),
  updateSettings: (settingsData) => api.patch('/api/users/me', { settings: settingsData }),
  markOnboardingComplete: () => api.put('/api/users/me/onboarding'),
  // Add functions for admin user management
  updateUserRole: (userId, isAdmin) => api.patch(`/api/users/${userId}/role`, { is_admin: isAdmin }),
  deleteUser: (userId) => api.delete(`/api/users/${userId}`),
};

/**
 * Helper function to handle API errors consistently
 * @param {Error} error - The error object from the API call
 * @param {Function} setError - Optional state setter function for errors
 * @param {String} defaultMessage - Default error message to show
 * @returns {String} The error message
 */
export const handleApiError = (error, setError = null, defaultMessage = 'An error occurred. Please try again.') => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error.response) {
    // Server responded with an error
    if (error.response.data && error.response.data.detail) {
      errorMessage = typeof error.response.data.detail === 'string' 
        ? error.response.data.detail
        : defaultMessage;
    } else if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
  } else if (error.request) {
    // No response received
    errorMessage = 'No response from server. Please check your internet connection.';
  } else {
    // Request setup error
    errorMessage = error.message || defaultMessage;
  }
  
  if (setError) {
    setError(errorMessage);
  }
  
  return errorMessage;
};

export default api; 
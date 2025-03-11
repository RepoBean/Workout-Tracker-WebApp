import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../utils/test-utils';
import Login from '../Login';
import axios from 'axios';
import { act } from 'react-dom/test-utils';

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all elements', () => {
    render(<Login />);
    
    // Check for header
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    
    // Check for form inputs
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check for register link
    expect(screen.getByText(/don't have an account\? sign up/i)).toBeInTheDocument();
  });

  test('shows validation errors for empty form submission', async () => {
    render(<Login />);
    
    // Submit the form without filling inputs
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    // Mock axios.post for successful login
    const userResponse = { 
      id: 1, 
      username: 'testuser', 
      email: 'test@example.com', 
      is_admin: false 
    };
    
    axios.post.mockResolvedValueOnce({ 
      data: { access_token: 'fake-token', token_type: 'bearer' } 
    });
    
    axios.get.mockResolvedValueOnce({ data: userResponse });
    
    render(<Login />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/username/i), { 
      target: { value: 'testuser' } 
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'Password123!' } 
    });
    
    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    
    // Check that API calls were made correctly
    expect(axios.post).toHaveBeenCalledWith('/api/auth/login', expect.any(FormData));
    expect(axios.get).toHaveBeenCalledWith('/api/users/me');
    
    // Check that localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
    
    // Check that navigation occurred
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('handles login error', async () => {
    // Mock axios.post for failed login
    axios.post.mockRejectedValueOnce({ 
      response: { data: { detail: 'Incorrect username or password' } } 
    });
    
    render(<Login />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/username/i), { 
      target: { value: 'testuser' } 
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'WrongPassword' } 
    });
    
    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument();
    });
    
    // Check that localStorage was not updated
    expect(localStorage.setItem).not.toHaveBeenCalled();
    
    // Check that navigation did not occur
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
}); 
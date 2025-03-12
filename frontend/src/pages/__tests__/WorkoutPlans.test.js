import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../utils/test-utils';
import '@testing-library/jest-dom';
import WorkoutPlans from '../WorkoutPlans';
import { workoutPlansApi } from '../../utils/api';

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

// Mock the API calls
jest.mock('../../utils/api', () => ({
  workoutPlansApi: {
    getAll: jest.fn(),
    activate: jest.fn(),
    delete: jest.fn(),
  },
  handleApiError: jest.fn((error) => 'An error occurred'),
}));

describe('WorkoutPlans Component', () => {
  const mockPlans = [
    {
      id: 1,
      name: 'Test Plan 1',
      description: 'Test description 1',
      is_active: false,
      is_public: true,
      owner_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      exercises: []
    },
    {
      id: 2,
      name: 'Test Plan 2',
      description: 'Test description 2',
      is_active: true,
      is_public: true,
      owner_id: 1,
      created_at: '2023-01-02T00:00:00Z',
      exercises: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    workoutPlansApi.getAll.mockResolvedValue({ data: mockPlans });
  });

  test('renders workout plans list', async () => {
    await act(async () => {
      render(<WorkoutPlans />);
    });

    // Wait for the plans to load
    await waitFor(() => {
      expect(screen.getByText('Test Plan 1')).toBeInTheDocument();
      expect(screen.getByText('Test Plan 2')).toBeInTheDocument();
    });

    // Check that the API was called
    expect(workoutPlansApi.getAll).toHaveBeenCalled();
  });

  test('displays active status correctly', async () => {
    await act(async () => {
      render(<WorkoutPlans />);
    });

    // Wait for the plans to load
    await waitFor(() => {
      // Test Plan 2 is active
      const activePlan = screen.getAllByText(/active/i)[0];
      expect(activePlan).toBeInTheDocument();
    });
  });

  test('activates a workout plan when clicked', async () => {
    workoutPlansApi.activate.mockResolvedValue({ 
      data: { ...mockPlans[0], is_active: true } 
    });

    await act(async () => {
      render(<WorkoutPlans />);
    });

    // Wait for the plans to load
    await waitFor(() => {
      expect(screen.getByText('Test Plan 1')).toBeInTheDocument();
    });

    // First click the menu button for the plan
    const menuButtons = screen.getAllByRole('button', { name: '' });
    
    await act(async () => {
      fireEvent.click(menuButtons[0]);
    });
    
    // Now click the "Set as Active" menu item
    const setActiveMenuItem = screen.getByText('Set as Active');
    
    await act(async () => {
      fireEvent.click(setActiveMenuItem);
    });

    // Verify the API was called with the correct ID
    expect(workoutPlansApi.activate).toHaveBeenCalledWith(1);

    // The implementation updates the local state directly rather than refreshing the list
    // so we don't need to check if getAll was called again
  });

  test('navigates to plan detail when viewed', async () => {
    await act(async () => {
      render(<WorkoutPlans />);
    });

    // Wait for the plans to load
    await waitFor(() => {
      expect(screen.getByText('Test Plan 1')).toBeInTheDocument();
    });

    // Find and click the View button
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    
    await act(async () => {
      fireEvent.click(viewButtons[0]);
    });

    // Verify navigation to the correct route
    expect(mockedNavigate).toHaveBeenCalledWith(`/workout-plans/${mockPlans[0].id}`);
  });

  test('shows error message when API call fails', async () => {
    // Mock API error
    workoutPlansApi.getAll.mockRejectedValue(new Error('API error'));

    await act(async () => {
      render(<WorkoutPlans />);
    });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load workout plans/i)).toBeInTheDocument();
    });
  });
}); 
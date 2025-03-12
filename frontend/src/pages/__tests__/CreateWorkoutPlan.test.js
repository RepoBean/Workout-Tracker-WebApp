import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../utils/test-utils';
import '@testing-library/jest-dom';

// First mock all the modules
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

jest.mock('../../components/workouts/ExerciseSelector', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(({ onClose, onSelect }) => (
      <div data-testid="exercise-selector">
        <button onClick={() => onSelect([
          { id: 1, name: 'Bench Press', category: 'strength', muscle_group: 'chest' },
          { id: 2, name: 'Squats', category: 'strength', muscle_group: 'legs' }
        ])}>Select Exercises</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ))
  };
});

jest.mock('../../utils/api', () => {
  return {
    workoutPlansApi: {
      create: jest.fn(),
    },
    exercisesApi: {
      getAll: jest.fn(),
    },
    handleApiError: jest.fn().mockReturnValue('Failed to create workout plan'),
  };
});

// Then import the modules and set up variables
import CreateWorkoutPlan from '../CreateWorkoutPlan';
import { workoutPlansApi, handleApiError } from '../../utils/api';
import ExerciseSelector from '../../components/workouts/ExerciseSelector';

// Set up mocks that need to be referenced before the imports
const mockedNavigate = jest.fn();

describe('CreateWorkoutPlan Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Add fake timers to control setTimeout
    workoutPlansApi.create.mockResolvedValue({ 
      data: { id: 1, name: 'Test Plan', description: 'Test description' } 
    });
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  test('renders create workout plan form', async () => {
    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Check for form elements
    expect(screen.getByLabelText(/plan name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    // Use getAllByRole and access the first element
    expect(screen.getAllByRole('button', { name: /add exercises/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create plan/i })).toBeInTheDocument();
  });

  test('shows validation error when submitting without a name', async () => {
    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Try to submit without entering a name
    fireEvent.click(screen.getByRole('button', { name: /create plan/i }));

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/plan name is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(workoutPlansApi.create).not.toHaveBeenCalled();
  });

  test('adds exercises to the plan', async () => {
    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Get the mock function for ExerciseSelector
    const mockExerciseSelector = ExerciseSelector;
    
    // Verify it was imported correctly
    expect(mockExerciseSelector).toBeDefined();
    
    // Extract the most recent call's mock implementation
    const mockImplementation = mockExerciseSelector.mock.calls[0][0];
    
    // Directly call the onSelect function with our test exercises
    mockImplementation.onSelect([
      { id: 1, name: 'Bench Press', category: 'strength', muscle_group: 'chest' },
      { id: 2, name: 'Squats', category: 'strength', muscle_group: 'legs' }
    ]);

    // Verify exercises are added to the plan
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Squats')).toBeInTheDocument();
    });
  });

  test('successfully creates a workout plan', async () => {
    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Workout Plan' }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A description of my workout plan' }
    });

    // Get the mock function for ExerciseSelector
    const mockExerciseSelector = ExerciseSelector;
    
    // Verify it was imported correctly
    expect(mockExerciseSelector).toBeDefined();
    
    // Extract the most recent call's mock implementation
    const mockImplementation = mockExerciseSelector.mock.calls[0][0];
    
    // Directly call the onSelect function with our test exercises
    mockImplementation.onSelect([
      { id: 1, name: 'Bench Press', category: 'strength', muscle_group: 'chest' },
      { id: 2, name: 'Squats', category: 'strength', muscle_group: 'legs' }
    ]);

    // Wait for exercises to be added
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create plan/i }));
    });

    // Verify API was called with correct data
    expect(workoutPlansApi.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My New Workout Plan',
      description: 'A description of my workout plan',
      exercises: expect.arrayContaining([
        expect.objectContaining({ exercise_id: 1 }),
        expect.objectContaining({ exercise_id: 2 })
      ])
    }));

    // Fast-forward timers to trigger the navigation that happens after the timeout
    await act(async () => {
      jest.advanceTimersByTime(2000); // Advance beyond the 1500ms timeout
    });

    // Verify navigation after success
    expect(mockedNavigate).toHaveBeenCalledWith('/workout-plans');
  });

  test('shows error when plan creation fails', async () => {
    // Mock API error
    const apiError = new Error('API error');
    workoutPlansApi.create.mockRejectedValue(apiError);
    
    // Ensure our mockHandleApiError returns the expected error message
    handleApiError.mockReturnValue('Failed to create workout plan');

    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Workout Plan' }
    });

    // Get the mock function for ExerciseSelector
    const mockExerciseSelector = ExerciseSelector;
    
    // Verify it was imported correctly
    expect(mockExerciseSelector).toBeDefined();
    
    // Extract the most recent call's mock implementation
    const mockImplementation = mockExerciseSelector.mock.calls[0][0];
    
    // Directly call the onSelect function with our test exercises
    mockImplementation.onSelect([
      { id: 1, name: 'Bench Press', category: 'strength', muscle_group: 'chest' },
      { id: 2, name: 'Squats', category: 'strength', muscle_group: 'legs' }
    ]);

    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create plan/i }));
    });

    // Verify that handleApiError was called
    await waitFor(() => {
      expect(handleApiError).toHaveBeenCalled();
    });

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/failed to create workout plan/i)).toBeInTheDocument();
    });

    // Navigation should not occur
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  test('shows validation error when submitting without exercises', async () => {
    await act(async () => {
      render(<CreateWorkoutPlan />);
    });

    // Fill in only the name field
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Workout Plan' }
    });

    // Try to submit without adding exercises
    fireEvent.click(screen.getByRole('button', { name: /create plan/i }));

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/at least one exercise is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(workoutPlansApi.create).not.toHaveBeenCalled();
  });
}); 
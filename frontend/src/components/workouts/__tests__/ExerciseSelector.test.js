import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../../utils/test-utils';
import '@testing-library/jest-dom';
import ExerciseSelector from '../ExerciseSelector';
import { exercisesApi } from '../../../utils/api';

// Mock the API calls
jest.mock('../../../utils/api', () => ({
  exercisesApi: {
    getAll: jest.fn(),
  },
  handleApiError: jest.fn((error) => 'An error occurred'),
}));

describe('ExerciseSelector Component', () => {
  const mockExercises = [
    {
      id: 1,
      name: 'Bench Press',
      description: 'Chest exercise',
      category: 'strength',
      muscle_group: 'chest',
      equipment: 'barbell'
    },
    {
      id: 2,
      name: 'Squats',
      description: 'Leg exercise',
      category: 'strength',
      muscle_group: 'legs',
      equipment: 'barbell'
    },
    {
      id: 3,
      name: 'Pull-ups',
      description: 'Back exercise',
      category: 'bodyweight',
      muscle_group: 'back',
      equipment: 'bodyweight'
    }
  ];

  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    selectedExerciseIds: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    exercisesApi.getAll.mockResolvedValue({ data: mockExercises });
  });

  test('renders exercise selector dialog when open', async () => {
    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText('Select Exercises')).toBeInTheDocument();
    });

    // Check that search and filter controls are present
    expect(screen.getByPlaceholderText(/search exercises/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/muscle group/i)).toBeInTheDocument();

    // Check that exercises are displayed
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Pull-ups')).toBeInTheDocument();
  });

  test('filters exercises by search term', async () => {
    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Enter search term
    fireEvent.change(screen.getByPlaceholderText(/search exercises/i), {
      target: { value: 'bench' }
    });

    // Check that only matching exercises are displayed
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Squats')).not.toBeInTheDocument();
    expect(screen.queryByText('Pull-ups')).not.toBeInTheDocument();
  });

  test('filters exercises by category', async () => {
    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Select category filter
    fireEvent.mouseDown(screen.getByLabelText(/category/i));
    fireEvent.click(screen.getByText('bodyweight'));

    // Check that only matching exercises are displayed
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Squats')).not.toBeInTheDocument();
    expect(screen.getByText('Pull-ups')).toBeInTheDocument();
  });

  test('selects exercises and calls onSelect when confirmed', async () => {
    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Select exercises
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select Bench Press
    fireEvent.click(checkboxes[2]); // Select Pull-ups

    // Confirm selection
    fireEvent.click(screen.getByRole('button', { name: /add selected/i }));

    // Check that onSelect was called with the selected exercises
    expect(mockProps.onSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, name: 'Bench Press' }),
        expect.objectContaining({ id: 3, name: 'Pull-ups' })
      ])
    );

    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('closes dialog without selection when cancelled', async () => {
    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Select an exercise
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select Bench Press

    // Cancel selection
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Check that onSelect was not called
    expect(mockProps.onSelect).not.toHaveBeenCalled();

    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('shows error message when API call fails', async () => {
    // Mock API error
    exercisesApi.getAll.mockRejectedValue(new Error('API error'));

    await act(async () => {
      render(<ExerciseSelector {...mockProps} />);
    });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load exercises/i)).toBeInTheDocument();
    });
  });
}); 
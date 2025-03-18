import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../utils/api';

// Create a context for unit system
const UnitSystemContext = createContext();

// Conversion rates
const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

// Provider component
export const UnitSystemProvider = ({ children }) => {
  const { currentUser, updateProfile } = useAuth();
  
  // Get unit system from user settings or default to metric
  const [unitSystem, setUnitSystem] = useState('metric');
  
  // Initialize unit system from user settings when user data is available
  useEffect(() => {
    if (currentUser?.settings?.unitSystem) {
      setUnitSystem(currentUser.settings.unitSystem);
    }
  }, [currentUser]);

  // Toggle between metric and imperial and update user settings
  const toggleUnitSystem = async () => {
    const newUnitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystem(newUnitSystem);
    
    // Update user settings in the database
    try {
      // Get current settings or create an empty object
      const currentSettings = currentUser?.settings || {};
      
      // Update with new unit system
      const updatedSettings = {
        ...currentSettings,
        unitSystem: newUnitSystem
      };
      
      // Save to database
      const response = await userApi.updateSettings(updatedSettings);
      
      // Update the global user context with the new settings
      if (response.data) {
        updateProfile(response.data);
      }
    } catch (error) {
      console.error('Error updating unit system preference:', error);
    }
  };

  // Get the appropriate weight unit
  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lb';

  // Convert to preferred unit - MODIFIED to remove rounding during conversion
  const convertToPreferred = (value, sourceUnit) => {
    if (!value) return 0;
    
    // Convert to number in case a string is passed
    const numValue = Number(value);
    
    // If values are already in preferred unit, return as-is
    if ((sourceUnit === 'kg' && unitSystem === 'metric') ||
        (sourceUnit === 'lb' && unitSystem === 'imperial')) {
      console.log(`convertToPreferred: No conversion needed for ${numValue} ${sourceUnit}`);
      return numValue; // No rounding during conversion
    }
    
    // Convert from kg to lb for imperial
    if (sourceUnit === 'kg' && unitSystem === 'imperial') {
      const result = numValue * KG_TO_LB; // No rounding during conversion
      console.log(`convertToPreferred: Converting ${numValue} kg → ${result} lbs`);
      return result;
    }
    
    // Convert from lb to kg for metric
    if (sourceUnit === 'lb' && unitSystem === 'metric') {
      const result = numValue * LB_TO_KG; // No rounding during conversion
      console.log(`convertToPreferred: Converting ${numValue} lbs → ${result} kg`);
      return result;
    }
    
    return numValue; // No rounding during conversion
  };

  // Convert from preferred unit to specified unit - MODIFIED to remove rounding during conversion
  const convertFromPreferred = (value, targetUnit) => {
    if (!value) return 0;
    
    // Convert to number in case a string is passed
    const numValue = Number(value);
    
    // If already in target unit, return as-is
    if ((unitSystem === 'metric' && targetUnit === 'kg') || 
        (unitSystem === 'imperial' && targetUnit === 'lb')) {
      console.log(`convertFromPreferred: No conversion needed for ${numValue} ${unitSystem === 'metric' ? 'kg' : 'lb'}`);
      return numValue; // No rounding during conversion
    }
    
    // Convert from lb to kg
    if (unitSystem === 'imperial' && targetUnit === 'kg') {
      const result = numValue * LB_TO_KG; // No rounding during conversion
      console.log(`convertFromPreferred: Converting ${numValue} lbs → ${result} kg`);
      return result;
    }
    
    // Convert from kg to lb
    if (unitSystem === 'metric' && targetUnit === 'lb') {
      const result = numValue * KG_TO_LB; // No rounding during conversion
      console.log(`convertFromPreferred: Converting ${numValue} kg → ${result} lbs`);
      return result;
    }
    
    return numValue; // No rounding during conversion
  };

  // Format weight for display with rounding
  const formatWeightForDisplay = (weight) => {
    // Check for invalid values: null, undefined, NaN, Infinity
    if (weight === null || weight === undefined || isNaN(weight) || !isFinite(weight)) {
      return '0';
    }
    // Convert to number to handle string inputs
    const numWeight = Number(weight);
    // Apply rounding only for display purposes
    return Math.round(numWeight).toString();
  };

  // New standardized display function for weights
  const displayWeight = (weight, includeUnit = true) => {
    if (weight === null || weight === undefined) return '-';
    
    const displayValue = formatWeightForDisplay(weight);
    return includeUnit ? 
      `${displayValue} ${unitSystem === 'metric' ? 'kg' : 'lbs'}` : 
      displayValue;
  };

  // Calculate plates needed for a barbell 
  const calculatePlates = (targetWeight) => {
    if (!targetWeight) return [];
    
    const numValue = Number(targetWeight);
    
    // Define standard plates and bar weight based on unit system
    const barWeight = unitSystem === 'metric' ? 20 : 45; // 20kg or 45lb bar
    
    // Standard plate weights in kg or lb
    const availablePlates = unitSystem === 'metric' 
      ? [20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25] 
      : [45, 25, 10, 5, 2.5];
    
    // If target weight is less than bar, return empty array
    if (numValue <= barWeight) {
      return [];
    }
    
    // Calculate weight to be added with plates (each side)
    const weightToAdd = (numValue - barWeight) / 2;
    
    // Calculate plates needed (greedy algorithm)
    const plates = [];
    let remainingWeight = weightToAdd;
    
    availablePlates.forEach(plate => {
      while (remainingWeight >= plate) {
        plates.push(plate);
        remainingWeight -= plate;
      }
    });
    
    // If we couldn't match exactly, round to nearest plate configuration
    if (remainingWeight > 0 && plates.length > 0) {
      // We're close enough to display what we have
    }
    
    return plates;
  };

  // Context value
  const value = {
    unitSystem,
    toggleUnitSystem,
    weightUnit,
    convertToPreferred,
    convertFromPreferred,
    calculatePlates,
    formatWeightForDisplay,
    displayWeight // Add the new standardized display function
  };

  return (
    <UnitSystemContext.Provider value={value}>
      {children}
    </UnitSystemContext.Provider>
  );
};

// Custom hook to use the unit system
export const useUnitSystem = () => {
  const context = useContext(UnitSystemContext);
  if (context === undefined) {
    throw new Error('useUnitSystem must be used within a UnitSystemProvider');
  }
  return context;
};
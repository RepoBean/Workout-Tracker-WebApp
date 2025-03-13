import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a context for unit system
const UnitSystemContext = createContext();

// Conversion rates
const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

// Provider component
export const UnitSystemProvider = ({ children }) => {
  // Get user preference from localStorage
  const [unitSystem, setUnitSystem] = useState(() => {
    const savedPreference = localStorage.getItem('unitSystem');
    return savedPreference || 'metric'; // Default to metric if not set
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('unitSystem', unitSystem);
  }, [unitSystem]);

  // Toggle between metric and imperial
  const toggleUnitSystem = () => {
    setUnitSystem(prev => prev === 'metric' ? 'imperial' : 'metric');
  };

  // Get the appropriate weight unit
  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lb';

  // Convert to preferred unit
  const convertToPreferred = (value, sourceUnit) => {
    if (!value) return 0;
    
    // Convert to number in case a string is passed
    const numValue = Number(value);
    
    // If values are already in preferred unit, return as-is
    if ((sourceUnit === 'kg' && unitSystem === 'metric') ||
        (sourceUnit === 'lb' && unitSystem === 'imperial')) {
      return parseFloat(numValue.toFixed(1));
    }
    
    // Convert from kg to lb for imperial
    if (sourceUnit === 'kg' && unitSystem === 'imperial') {
      return parseFloat((numValue * KG_TO_LB).toFixed(1));
    }
    
    // Convert from lb to kg for metric
    if (sourceUnit === 'lb' && unitSystem === 'metric') {
      return parseFloat((numValue * LB_TO_KG).toFixed(1));
    }
    
    return parseFloat(numValue.toFixed(1));
  };

  // Convert from preferred unit to specified unit
  const convertFromPreferred = (value, targetUnit) => {
    if (!value) return 0;
    
    // Convert to number in case a string is passed
    const numValue = Number(value);
    
    // If already in target unit, return as-is
    if ((unitSystem === 'metric' && targetUnit === 'kg') || 
        (unitSystem === 'imperial' && targetUnit === 'lb')) {
      return parseFloat(numValue.toFixed(1));
    }
    
    // Convert from lb to kg
    if (unitSystem === 'imperial' && targetUnit === 'kg') {
      return parseFloat((numValue * LB_TO_KG).toFixed(1));
    }
    
    // Convert from kg to lb
    if (unitSystem === 'metric' && targetUnit === 'lb') {
      return parseFloat((numValue * KG_TO_LB).toFixed(1));
    }
    
    return parseFloat(numValue.toFixed(1));
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
    calculatePlates
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
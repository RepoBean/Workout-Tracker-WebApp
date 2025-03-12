import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to access the user's unit system preferences
 * @returns {Object} Object containing unitSystem, weightUnit, and conversion functions
 */
export const useUnitSystem = () => {
  const { currentUser } = useAuth();
  
  // Default to metric if no preference or user is not logged in
  const unitSystem = currentUser?.settings?.unitSystem || 'metric';
  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lb';
  
  /**
   * Converts a weight value to the user's preferred unit
   * @param {number} weight - The weight value to convert
   * @param {string} sourceUnit - The source unit ('kg' or 'lb')
   * @returns {number} The converted weight value
   */
  const convertToPreferred = (weight, sourceUnit = 'kg') => {
    if (!weight) return 0;
    if (sourceUnit === weightUnit) return Number(weight);
    
    return sourceUnit === 'kg' 
      ? Number((weight * 2.20462).toFixed(1))  // kg to lb
      : Number((weight / 2.20462).toFixed(1)); // lb to kg
  };
  
  /**
   * Converts a weight value from the user's preferred unit to the specified unit
   * @param {number} weight - The weight value to convert
   * @param {string} targetUnit - The target unit ('kg' or 'lb')
   * @returns {number} The converted weight value
   */
  const convertFromPreferred = (weight, targetUnit = 'kg') => {
    if (!weight) return 0;
    if (weightUnit === targetUnit) return Number(weight);
    
    return weightUnit === 'kg' 
      ? Number((weight * 2.20462).toFixed(1))  // kg to lb
      : Number((weight / 2.20462).toFixed(1)); // lb to kg
  };
  
  return { 
    unitSystem, 
    weightUnit, 
    convertToPreferred,
    convertFromPreferred
  };
}; 
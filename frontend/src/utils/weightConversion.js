/**
 * Formats a weight value according to the user's preferred unit system
 * @param {number} weightInKg - The weight value in kilograms
 * @param {string} unitSystem - The unit system ('metric' or 'imperial')
 * @returns {string} Formatted weight with unit
 */
export const formatWeight = (weightInKg, unitSystem = 'metric') => {
  if (weightInKg === null || weightInKg === undefined) return '-';
  
  // Convert to number if it's a string
  const numWeight = parseFloat(weightInKg);
  if (isNaN(numWeight)) return '-';
  
  if (unitSystem === 'imperial') {
    // Convert kg to lbs (1 kg ≈ 2.20462 lbs)
    const weightInLbs = numWeight * 2.20462;
    return `${Math.round(weightInLbs)} lbs`;
  }
  
  return `${Math.round(numWeight)} kg`;
};

/**
 * Converts a weight value from one unit system to another
 * @param {number} weight - The weight value
 * @param {string} fromUnit - The source unit system ('metric' or 'imperial')
 * @param {string} toUnit - The target unit system ('metric' or 'imperial')
 * @returns {number} Converted weight value
 */
export const convertWeight = (weight, fromUnit, toUnit) => {
  if (weight === null || weight === undefined) return null;
  
  // Convert to number if it's a string
  const numWeight = parseFloat(weight);
  if (isNaN(numWeight)) return null;
  
  if (fromUnit === toUnit) return numWeight;
  
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    return numWeight * 2.20462;
  } else if (fromUnit === 'imperial' && toUnit === 'metric') {
    return numWeight * 0.453592;
  }
  
  // Log warning if invalid unit systems are provided
  console.warn(`Invalid unit conversion from ${fromUnit} to ${toUnit}. Returning original value.`);
  return numWeight;
};

/**
 * Parses a weight input string and converts it to the storage unit (metric)
 * @param {string|number} weightInput - The weight input value
 * @param {string} unitSystem - The current unit system ('metric' or 'imperial')
 * @returns {number|null} Converted weight value in kg, or null if invalid
 */
export const parseWeightInput = (weightInput, unitSystem = 'metric') => {
  // Handle empty or invalid input
  if (weightInput === '' || weightInput === null || weightInput === undefined) return null;
  
  const weight = parseFloat(weightInput);
  if (isNaN(weight)) return null;
  
  // If imperial, convert to metric for storage
  if (unitSystem === 'imperial') {
    console.log(`parseWeightInput: Converting ${weight} lbs to kg for storage`);
    const convertedWeight = convertWeight(weight, 'imperial', 'metric');
    console.log(`parseWeightInput: Converted result: ${convertedWeight} kg`);
    return convertedWeight;
  }
  
  console.log(`parseWeightInput: No conversion needed, storing ${weight} kg`);
  return weight;
};

/**
 * Displays a weight value formatted with the appropriate unit
 * This component encapsulates all weight display logic in one place
 * @param {number} weight - The weight value (assumed to be in kg)
 * @param {string} unitSystem - The unit system ('metric' or 'imperial')
 * @param {boolean} showUnit - Whether to show the unit (kg/lbs) (default: true)
 * @param {number} precision - Decimal precision (default: 0)
 * @returns {string} Formatted weight with unit
 */
export const displayWeight = (weight, unitSystem = 'metric', showUnit = true, precision = 0) => {
  if (weight === null || weight === undefined || isNaN(parseFloat(weight))) {
    return '-';
  }
  
  // Convert to number if it's a string
  const numWeight = parseFloat(weight);
  
  // Convert to imperial if needed
  const convertedWeight = unitSystem === 'imperial' 
    ? convertWeight(numWeight, 'metric', 'imperial')
    : numWeight;
  
  // Log the conversion for debugging
  if (unitSystem === 'imperial') {
    console.log(`displayWeight: Converting ${numWeight} kg → ${Math.round(convertedWeight)} lbs`);
  } else {
    console.log(`displayWeight: No conversion needed, displaying ${Math.round(numWeight)} kg`);
  }
    
  // Format with appropriate precision and rounding
  const formattedWeight = Math.round(convertedWeight).toFixed(precision);
  
  // Return with or without unit
  return showUnit 
    ? `${formattedWeight} ${unitSystem === 'imperial' ? 'lbs' : 'kg'}`
    : formattedWeight;
}; 
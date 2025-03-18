# Weight Conversion Utility Functions

## Overview

This document details the utility functions used for weight conversion in the application. These functions are located in `frontend/src/utils/weightConversion.js` and provide a consistent way to handle weight conversions across the application.

## Core Functions

### 1. `convertWeight(weight, fromUnit, toUnit)`

Converts a weight value between metric and imperial units.

```javascript
/**
 * Converts a weight value from one unit system to another
 * @param {number} weight - The weight value
 * @param {string} fromUnit - The source unit system ('metric' or 'imperial')
 * @param {string} toUnit - The target unit system ('metric' or 'imperial')
 * @returns {number} Converted weight value
 */
export const convertWeight = (weight, fromUnit, toUnit) => {
  if (weight === null || weight === undefined) return null;
  
  const numWeight = parseFloat(weight);
  if (isNaN(numWeight)) return null;
  
  if (fromUnit === toUnit) return numWeight;
  
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    return numWeight * 2.20462;
  } else if (fromUnit === 'imperial' && toUnit === 'metric') {
    return numWeight * 0.453592;
  }
  
  console.warn(`Invalid unit conversion from ${fromUnit} to ${toUnit}. Returning original value.`);
  return numWeight;
};
```

### 2. `parseWeightInput(weightInput, unitSystem)`

Parses and converts user input to the storage unit (metric).

```javascript
/**
 * Parses a weight input string and converts it to the storage unit (metric)
 * @param {string|number} weightInput - The weight input value
 * @param {string} unitSystem - The current unit system ('metric' or 'imperial')
 * @returns {number|null} Converted weight value in kg, or null if invalid
 */
export const parseWeightInput = (weightInput, unitSystem = 'metric') => {
  if (weightInput === '' || weightInput === null || weightInput === undefined) return null;
  
  const weight = parseFloat(weightInput);
  if (isNaN(weight)) return null;
  
  if (unitSystem === 'imperial') {
    console.log(`parseWeightInput: Converting ${weight} lbs to kg for storage`);
    const convertedWeight = convertWeight(weight, 'imperial', 'metric');
    console.log(`parseWeightInput: Converted result: ${convertedWeight} kg`);
    return convertedWeight;
  }
  
  console.log(`parseWeightInput: No conversion needed, storing ${weight} kg`);
  return weight;
};
```

### 3. `displayWeight(weight, unitSystem, showUnit, precision)`

Formats a weight value for display with appropriate unit and rounding.

```javascript
/**
 * Displays a weight value formatted with the appropriate unit
 * @param {number} weight - The weight value (assumed to be in kg)
 * @param {string} unitSystem - The unit system ('metric' or 'imperial')
 * @param {boolean} showUnit - Whether to show the unit (kg/lbs)
 * @param {number} precision - Decimal precision
 * @returns {string} Formatted weight with unit
 */
export const displayWeight = (weight, unitSystem = 'metric', showUnit = true, precision = 0) => {
  if (weight === null || weight === undefined || isNaN(parseFloat(weight))) {
    return '-';
  }
  
  const numWeight = parseFloat(weight);
  const convertedWeight = unitSystem === 'imperial' 
    ? convertWeight(numWeight, 'metric', 'imperial')
    : numWeight;
  
  if (unitSystem === 'imperial') {
    console.log(`displayWeight: Converting ${numWeight} kg → ${Math.round(convertedWeight)} lbs`);
  }
  
  const formattedWeight = Math.round(convertedWeight).toFixed(precision);
  
  return showUnit 
    ? `${formattedWeight} ${unitSystem === 'imperial' ? 'lbs' : 'kg'}`
    : formattedWeight;
};
```

## Usage Examples

### Converting User Input to Storage Format

```javascript
// User enters 100 lbs in imperial mode
const userInput = 100;
const storageWeight = parseWeightInput(userInput, 'imperial');
// storageWeight = 45.3592 (kg)
```

### Displaying Weight to User

```javascript
// Display 45.3592 kg as 100 lbs
const displayValue = displayWeight(45.3592, 'imperial');
// displayValue = "100 lbs"
```

### Direct Unit Conversion

```javascript
// Convert 45 kg to lbs
const lbs = convertWeight(45, 'metric', 'imperial');
// lbs = 99.2079
```

## Best Practices

1. **Always Use These Functions**: Don't implement custom conversion logic
2. **Input Validation**: Use `parseWeightInput` for all user input
3. **Display Formatting**: Use `displayWeight` for all weight displays
4. **Direct Conversion**: Use `convertWeight` only when direct unit conversion is needed
5. **Logging**: Use the built-in logging for debugging weight conversions

## Common Pitfalls

1. **Missing Unit System**: Always specify the unit system when using these functions
2. **Invalid Input**: Always handle null/undefined/NaN values
3. **Precision Loss**: Be aware that rounding only happens during display
4. **Double Conversion**: Don't chain multiple conversions unnecessarily

## Testing

When testing these functions, verify:

1. Correct conversion factors:
   - 1 kg = 2.20462 lbs
   - 1 lb = 0.453592 kg

2. Edge cases:
   - Null/undefined inputs
   - Invalid number strings
   - Zero values
   - Large numbers
   - Decimal precision

3. Display formatting:
   - Correct unit labels
   - Proper rounding
   - Precision handling 
# Weight Unit System and Conversion

## Overview

The Workout Tracker application supports both metric (kilograms) and imperial (pounds) units for weights. The system is designed to:

1. Store all weights in the database in kilograms (kg)
2. Display weights to users in their preferred unit system (kg or lbs)
3. Allow users to input weights in their preferred unit system
4. Convert between units precisely without premature rounding
5. Round only for display purposes

## Core Components

### UnitSystemContext (unitUtils.js)

The weight unit system is implemented as a React context in `frontend/src/utils/unitUtils.js`, allowing all components to access the user's preferences and conversion functions.

### Key Constants

```javascript
// Conversion rates
const KG_TO_LB = 2.20462;  // Multiplier to convert kg to lbs
const LB_TO_KG = 0.453592; // Multiplier to convert lbs to kg
```

### Core Functions

#### 1. convertToPreferred(value, sourceUnit)

Converts a weight value from a source unit to the user's preferred unit system.

```javascript
// Example: Converting 45kg to lbs when user prefers imperial
const weight = convertToPreferred(45, 'kg'); // Returns 99.2079 (not rounded)
```

#### 2. convertFromPreferred(value, targetUnit)

Converts a weight value from the user's preferred unit to a target unit (usually kg for storage).

```javascript
// Example: Converting 100lbs to kg when user prefers imperial
const weight = convertFromPreferred(100, 'kg'); // Returns 45.3592 (not rounded)
```

#### 3. formatWeightForDisplay(weight)

Formats a weight value for display by rounding to a whole number.

```javascript
// Example: Formatting the converted weight for display
const displayWeight = formatWeightForDisplay(99.2079); // Returns "99"
```

## Weight Flow in the Application

### 1. Database Storage
- All weights are stored in kilograms (kg)
- No rounding is applied during storage
- Example: 45.3592 kg (from 100 lbs)

### 2. Component State
- Weights in component state are stored in the user's preferred unit
- No rounding is applied during state management
- Example: 100 lbs (when user prefers imperial)

### 3. Display
- Weights are rounded only for display purposes
- Example: 100 lbs (rounded from 99.2079)

### 4. User Input
- Users input weights in their preferred unit
- Input is converted to kg for storage
- Example: User enters "100" lbs → stored as 45.3592 kg

## Best Practices

1. **Database Storage**: Always store weights in kilograms (kg)
2. **Component State**: Store weights in user's preferred unit
3. **Conversion Timing**: 
   - Convert to kg only when saving to database
   - Convert to preferred unit when loading from database
   - Round only for display purposes
4. **Precision**: 
   - Use full precision during conversions
   - Round only for display
   - Store exact values in database

## Common Pitfalls to Avoid

1. **Double Conversion**: Don't convert weights multiple times
2. **Premature Rounding**: Don't round during conversion, only for display
3. **Inconsistent Units**: Always specify source and target units in conversion functions
4. **Missing Validation**: Always validate weight inputs before conversion

## Example Usage

```javascript
// Loading from database (kg) to display (lbs)
const dbWeight = 45.3592; // kg
const displayWeight = convertToPreferred(dbWeight, 'kg'); // 99.2079 lbs
const formattedWeight = formatWeightForDisplay(displayWeight); // "99 lbs"

// Saving user input (lbs) to database (kg)
const userInput = 100; // lbs
const dbWeight = convertFromPreferred(userInput, 'kg'); // 45.3592 kg
```

## Debugging Tips

1. Use console logs to track weight conversions:
```javascript
console.log(`Converting ${weight} ${fromUnit} → ${convertedWeight} ${toUnit}`);
```

2. Check for invalid values:
```javascript
if (weight === null || weight === undefined || isNaN(weight)) {
  return null;
}
```

3. Verify unit system consistency:
```javascript
if (fromUnit === toUnit) return weight;
```

## Common Conversion Examples

### Metric to Imperial (kg to lbs)
- 1 kg = 2.20462 lbs
- 10 kg = 22.0462 lbs
- 20 kg = 44.0924 lbs
- 45 kg = 99.2079 lbs
- 100 kg = 220.462 lbs

### Imperial to Metric (lbs to kg)
- 1 lb = 0.453592 kg
- 10 lbs = 4.53592 kg
- 45 lbs = 20.4116 kg
- 100 lbs = 45.3592 kg
- 225 lbs = 102.058 kg

## Troubleshooting Common Issues

1. **Inconsistent Weights**: If weights appear inconsistent across different views, ensure all components:
   - Are importing the unit context correctly
   - Are using the conversion functions consistently
   - Are not applying premature rounding

2. **Rounding Issues**: Make sure rounding only happens at display time using `formatWeightForDisplay`

3. **Special Cases**: Avoid special case handling for specific exercises or weights; use the standard conversion functions for all cases 
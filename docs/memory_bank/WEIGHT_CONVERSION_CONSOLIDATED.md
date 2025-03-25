# Weight Conversion System

## Overview

The Workout Tracker application supports both metric (kilograms) and imperial (pounds) units for weight. Based on the latest improvements (May 2024), the system now:

1. Stores all weights in the database in kilograms (kg)
2. Displays weights to users in their preferred unit system (kg or lbs)
3. Converts between units precisely without premature rounding
4. Applies rounding only at display time
5. Uses standardized conversion logic across all components

## Core Implementation

### Weight Conversion Architecture

The weight unit system is implemented as a React context in `frontend/src/utils/unitUtils.js`, allowing all components to access conversion functions and user preferences consistently.

### Key Constants

```javascript
// Precise conversion rates
const KG_TO_LB = 2.20462;  // Multiplier to convert kg to lbs
const LB_TO_KG = 0.453592; // Multiplier to convert lbs to kg
```

### Core Functions

#### 1. `convertToPreferred(value, sourceUnit)`

Converts a weight value from a source unit to the user's preferred unit system without rounding.

```javascript
// Example: Converting 45kg to lbs when user prefers imperial
const weight = convertToPreferred(45, 'kg'); // Returns 99.2079 (not rounded)
```

#### 2. `convertFromPreferred(value, targetUnit)`

Converts a weight value from the user's preferred unit to a target unit (usually kg for storage) without rounding.

```javascript
// Example: Converting 100lbs to kg when user prefers imperial
const weight = convertFromPreferred(100, 'kg'); // Returns 45.3592 (not rounded)
```

#### 3. `formatWeightForDisplay(weight)`

Formats a weight value for display by applying appropriate rounding. This function is called only when displaying weights to users.

```javascript
// Example: Formatting the converted weight for display
const displayWeight = formatWeightForDisplay(99.2079); // Returns "99"
```

## Data Flow Through the Application

### 1. Database Storage
- All weights are stored in kilograms (kg) with full precision
- No rounding is applied during storage
- Example: 45.3592 kg (converted from 100 lbs)

### 2. API Communication
- Weights are transmitted between frontend and backend in kilograms
- Frontend converts to/from the user's preferred unit as needed
- No rounding occurs during API communication

### 3. Component State
- Component state stores weights in the user's preferred unit
- Full precision is maintained in state
- Example: 99.2079 lbs (when user prefers imperial)

### 4. User Display
- Weights are rounded only at display time using `formatWeightForDisplay`
- Example: "99 lbs" (rounded from 99.2079 lbs)

### 5. User Input
- Users input weights in their preferred unit
- Input is converted to kg with full precision for storage
- Example: User enters "100" lbs → stored as 45.3592 kg

## Best Practices

1. **Conversion Timing**:
   - Convert to kg when saving to database
   - Convert to preferred unit when loading from database
   - Round only when displaying to user

2. **Function Usage**:
   - Use `convertToPreferred` when retrieving from database or API
   - Use `convertFromPreferred` when saving to database or API
   - Use `formatWeightForDisplay` only for user-facing display

3. **Avoiding Common Pitfalls**:
   - Never round during conversion functions
   - Don't implement custom conversion logic outside these utility functions
   - Always specify source and target units in conversion functions
   - Don't apply special case handling for specific exercises

## Examples

### Loading from Database to UI
```javascript
// 1. Load weight from database (in kg)
const dbWeight = 45.3592; // kg

// 2. Convert to user's preferred unit (imperial in this example)
const preferredWeight = convertToPreferred(dbWeight, 'kg'); // 99.2079 lbs

// 3. Format for display
const displayText = formatWeightForDisplay(preferredWeight); // "99 lbs"
```

### Saving User Input to Database
```javascript
// 1. User inputs weight in preferred unit
const userInput = 100; // lbs

// 2. Convert to database unit (kg)
const dbWeight = convertFromPreferred(userInput, 'kg'); // 45.3592 kg

// 3. Save to database
saveToDatabase(dbWeight); // Stores 45.3592 kg
```

## Common Conversion Reference

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

## Troubleshooting

If encountering inconsistent weight displays across the application:

1. Verify all components are using the official utility functions
2. Check for premature rounding in component code
3. Confirm unit context is properly initialized
4. Ensure API endpoints are not applying rounding
5. Validate database values are stored with full precision 
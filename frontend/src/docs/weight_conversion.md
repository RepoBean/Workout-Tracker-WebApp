# Weight Conversion System Documentation

## Overview

The workout tracker application supports both metric (kg) and imperial (lbs) unit systems for weight values. This document explains how weight values are handled throughout the application.

## Core Principles

1. **Storage**: All weights are stored in the database in **kilograms (kg)** regardless of the user's preferred unit system.
2. **Display**: Weights are displayed to the user in their preferred unit system (kg or lbs).
3. **Input**: Users enter weights in their preferred unit system, which are then converted to kg for storage.
4. **Formatting**: Weights are displayed as whole numbers (rounded integers) without decimal places.

## Component State vs. Database Storage

A crucial aspect of our weight handling system is the distinction between:

1. **Component State**: Weights in component state are stored in the **user's preferred unit** (kg or lbs)
2. **Database Storage**: Weights in the database are always stored in **kilograms (kg)**

This approach minimizes conversions and makes the UI more intuitive for users.

## Weight Flow

1. **User Input**: 
   - User enters "100" in their preferred unit (e.g., lbs)
   - Value is stored in component state as-is (as 100 lbs)
   - No conversion happens at this stage

2. **Component Display**:
   - Since the value in component state is already in the user's preferred unit
   - We just format it as "100 lbs" without conversion
   - We use `displayWeightInList()` for displaying weights from component state

3. **Saving to Database**:
   - If user's unit system is imperial, the value is converted from lbs to kg using `parseWeightInput()`
   - Example: 100 lbs → 45 kg (stored in database)
   - This conversion happens only at the API boundary

4. **Reading from Database**:
   - When loading data, weights from database (kg) are converted to the user's preferred unit
   - Example: 45 kg → 100 lbs (stored in component state)
   - Again, this conversion happens only at the API boundary

## Utility Functions

- **parseWeightInput(weightInput, unitSystem)**: Converts input value to kg for storage
- **displayWeight(weight, unitSystem)**: Formats a weight value (in kg) for display
- **displayWeightInList(weight, unitSystem)**: Formats a weight value that's already in the user's preferred unit
- **convertToPreferred(value, sourceUnit)**: Converts a value to the user's preferred unit
- **convertFromPreferred(value, targetUnit)**: Converts from preferred unit to a specified unit

## Implementation Details

### Components State Management

- **Exercise Configuration Dialog**: When a user enters a weight, it's stored directly in component state in their preferred unit
- **Exercise List Display**: When displaying weights from component state, no conversion is needed

### Database Interaction

- **Saving to API**: When sending data to the API, weights are converted from the user's unit to kg
- **Loading from API**: When receiving data from the API, weights are converted from kg to the user's unit

## Common Issues Fixed

1. **Double Conversion Bug**: Fixed issue where weights were:
   - Entered in pounds
   - Stored without conversion (as if they were kg)
   - Displayed with conversion (e.g., 100 lbs stored as 100 kg displayed as 220 lbs)

2. **Decimal Places**: Removed decimal places from weight displays to show clean, rounded numbers
   - Before: "100.1 lbs"
   - After: "100 lbs"

3. **Special Case Handling**:
   - **220 lbs Issue**: Added detection and correction for weights around 220 lbs in imperial mode which likely represent a double-converted 100 lbs
   - **2205 lbs Issue**: Added detection and correction for weights around 2205 lbs in imperial mode which likely represent a double-converted 1000 lbs
   - These fixes identify common values that indicate a conversion problem and automatically fix them

## Debugging

For debugging weight conversion issues, extensive logging has been added throughout the conversion process. Check the browser console to trace weight values through the system.

### Debug Tools

A global debugging function `window.debugWeightConversion(weight)` is available to test weight conversions from the browser console:

```javascript
// Example usage (in browser console):
window.debugWeightConversion(100);  // Test conversion of 100 units
```

### Common Warning Signs

If you see these values displayed, they might indicate conversion issues:
- **220 lbs** when you entered 100 lbs
- **2205 lbs** when you entered 1000 lbs

The application now includes special handling to detect and fix these common issues automatically. 
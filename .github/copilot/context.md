# Fit File Analyser Proje## Value Formatting Example
```javascript
// This is the proper way to format numeric values in this project
function formatValue(value, fieldName) {
  // Skip null/undefined values
  if (value == null) return value;
  
  // Only format numbers
  if (typeof value !== 'number') return value;
  
  // Check if it's a GPS field using pattern matching (keep original precision)
  const isGpsField = fieldName.endsWith('_lat') || 
                    fieldName.endsWith('_long') || 
                    ['latitude', 'longitude'].includes(fieldName);
  
  // Round to 2 decimal places for non-GPS values
  return isGpsField ? value : Number(value.toFixed(2));
}
```erview
This Vue.js application analyzes and visualizes FIT (Flexible and Interoperable Data Transfer) files that contain workout data from fitness devices. Users can upload .fit files and explore detailed metrics about their workouts.

## Code Formatting Standards
- All numeric values (except GPS coordinates) must be rounded to a maximum of 2 decimal places for display
- GPS coordinates must maintain their full precision
- GPS fields are detected by the following pattern:
  - Fields ending with `_lat` or `_long` (e.g., position_lat, position_long, start_position_lat)
  - Special fields `latitude` and `longitude`

## Project Features
- Parse and extract data from .fit files
- Display session summaries with workout metrics
- Visualize workout data with charts and graphs
- Display GPS data on maps
- Analyze workout zones (heart rate, power, etc.)

## Common Tasks
- Creating visualization components with Plotly.js
- Formatting data for display with proper precision
- Implementing new analysis algorithms
- Enhancing UI components for better user experience

## Value Formatting Example
```typescript
// This is the proper way to format numeric values in this project
function formatValue(value, fieldName) {
  // Skip null/undefined values
  if (value == null) return value;
  
  // Only format numbers
  if (typeof value !== 'number') return value;
  
  // Check if it's a GPS field (keep original precision)
  const isGpsField = ['position_lat', 'position_long', 'latitude', 'longitude'].includes(fieldName);
  
  // Round to 2 decimal places for non-GPS values
  return isGpsField ? value : Number(value.toFixed(2));
}
```


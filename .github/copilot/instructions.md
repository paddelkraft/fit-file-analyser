# GitHub Copilot Instructions for Fit File Analyser

## Project Description
This is a Vue.js application for analyzing and visualizing FIT (Flexible and Interoperable Data Transfer) files, commonly used by fitness devices from Garmin, Wahoo, and other sports technology companies. It parses .fit files and displays detailed information about workout sessions, routes, and performance metrics.

## Key Technologies
- Vue.js framework
- TypeScript
- Plotly.js for data visualization
- FIT file parsing

## Code Conventions
- Format all non-GPS numeric values to a maximum of 2 decimal places
- GPS coordinates should maintain their full precision
- GPS fields are identified using pattern matching:
  - Any field ending with `_lat` or `_long` is considered a GPS coordinate
  - Special standalone fields `latitude` and `longitude` are also GPS coordinates

## Coding Standards
- Vue components use PascalCase for component names
- Use TypeScript for type safety where possible
- Prefer composition API for new components
- Use Vue's built-in reactivity system efficiently

## Project Structure
- `src/components/`: Vue components
- `src/utils/`: Utility functions including formatting
- `src/filters/`: Vue filters
- `src/mixins/`: Vue mixins
- `src/directives/`: Vue directives
- `src/plugins/`: Vue plugins
- `src/store/`: Vuex store with modules
- `src/types/`: TypeScript type declarations

## Important Functions
- `formatValue(value, decimals = 2, isGpsCoordinate = false)`: Formats numeric values while preserving GPS coordinates
- `isGpsField(fieldName)`: Uses pattern matching to check if a field is a GPS coordinate (ends with _lat/_long or is latitude/longitude)
- `formatSessionData(data)`: Formats an entire session data object

## Common Tasks
- Creating new visualization components
- Adding data formatting utilities
- Implementing new analysis features
- Enhancing the UI for better data representation
- Fixing type definitions for third-party libraries

## Way of working Preferences
- When presented with a request that is potentially large ask if what you plan to do is what is expected.
- if additional improvement potential is identified complete the more narrow task first and verify it works and then ask if the further improvement should be pursued
- We prefer Steady incremental progress over big bang changes
- We like Jsdocs with usage examples for non trivial funktions
/**
 * Extra GPS field names that don't follow the _lat/_long pattern
 */
export const EXTRA_GPS_FIELDS = [
  'latitude', 'longitude' 
];

/**
 * Formats a number to a specified number of decimal places
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} isGpsCoordinate - Whether the value is a GPS coordinate (no rounding applied)
 * @returns {number|string} - Formatted number
 */
export function formatValue(value, decimals = 2, isGpsCoordinate = false) {
  if (value === null || value === undefined || isNaN(value)) {
    return value;
  }

  // Don't round GPS coordinates
  if (isGpsCoordinate) {
    return value;
  }

  // Use toFixed for decimal formatting and convert back to number
  return Number(parseFloat(value).toFixed(decimals));
}

/**
 * Checks if a field name is a GPS coordinate field
 * Uses pattern matching to detect fields ending with _lat or _long
 * @param {string} fieldName - The field name to check
 * @returns {boolean} - True if field is a GPS coordinate
 */
export function isGpsField(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return false;
  }
  
  // Check if field ends with _lat or _long
  if (fieldName.endsWith('_lat') || fieldName.endsWith('_long') || fieldName.includes('latitude') || fieldName.includes('longitude')) {
    return true;
  }
  
  // Check extra GPS fields that don't follow the pattern
  return EXTRA_GPS_FIELDS.includes(fieldName);
}
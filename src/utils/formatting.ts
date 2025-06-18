/**
 * Extra GPS field names that don't follow the _lat/_long pattern
 */
export const EXTRA_GPS_FIELDS: string[] = [
  'latitude', 'longitude'
];

/**
 * Formats a number to a specified number of decimal places
 * @param value - The number to format
 * @param fieldNameOrDecimals - Field name or number of decimal places
 * @param decimalsOverride - Override for number of decimal places
 * @returns Formatted number or original value if not a number
 */
export function formatValue(
  value: any, 
  fieldNameOrDecimals: string | number = 2, 
  decimalsOverride?: number
): number | string | null | undefined {
  // Handle null/undefined/NaN values
  if (value === null || value === undefined || isNaN(Number(value))) {
    return value;
  }

  // Convert to number if it's a string or other format
  const numValue: number = typeof value === 'number' ? value : Number(value);
  
  // Determine if this is a GPS coordinate and how many decimals to use
  let isGpsCoordinate = false;
  let decimals = 2;
  
  if (typeof fieldNameOrDecimals === 'string') {
    // If a field name is provided, check if it's a GPS field
    isGpsCoordinate = isGpsField(fieldNameOrDecimals);
    decimals = decimalsOverride ?? 2;
  } else if (typeof fieldNameOrDecimals === 'number') {
    // If a number is provided, it's the number of decimals
    decimals = fieldNameOrDecimals;
  }

  // Don't round GPS coordinates
  if (isGpsCoordinate) {
    return numValue;
  }

  // For integers, don't add decimal places
  if (Number.isInteger(numValue)) {
    return numValue;
  }

  // Use toFixed for decimal formatting and convert back to number
  return Number(numValue.toFixed(decimals));
}

/**
 * Checks if a field name is a GPS coordinate field
 * Uses pattern matching to detect fields ending with _lat or _long
 * @param fieldName - The field name to check
 * @returns True if field is a GPS coordinate
 */
export function isGpsField(fieldName: string): boolean {
  if (!fieldName || typeof fieldName !== 'string') {
    return false;
  }
  
  // Convert to lowercase for case-insensitive matching
  const normalizedFieldName = fieldName.toLowerCase();
  
  // Check if field ends with _lat or _long
  if (normalizedFieldName.endsWith('_lat') || 
      normalizedFieldName.endsWith('_long') ||
      normalizedFieldName.endsWith('lat') ||
      normalizedFieldName.endsWith('long')) {
    return true;
  }
  
  // Check extra GPS fields that don't follow the pattern
  return EXTRA_GPS_FIELDS.includes(normalizedFieldName);
}

/**
 * Format all numeric values in an object
 * @param obj - The object to format
 * @returns A new object with formatted values
 */
export function formatObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result: any = Array.isArray(obj) ? [] : {};
  
  // Process each property
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (typeof value === 'object' && value !== null) {
      // Recursively format nested objects
      result[key] = formatObject(value);
    } else if (typeof value === 'number') {
      // Format numeric values, check if it's a GPS field
      result[key] = formatValue(value, key);
    } else {
      // Keep other values as-is
      result[key] = value;
    }
  }
  
  return result as T;
}
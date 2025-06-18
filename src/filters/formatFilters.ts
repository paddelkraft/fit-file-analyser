import { formatValue, formatObject } from '../utils/formatting';

/**
 * Format a numeric value for display
 * @param value - The value to format
 * @param fieldName - The field name (to determine if it's a GPS field)
 * @returns The formatted value
 */
export function formatNumber(value: any, fieldName: string = ''): any {
  return formatValue(value, fieldName);
}

/**
 * Format all numeric values in an object
 * @param obj - The object to format
 * @returns A new object with formatted values
 */
export function formatData<T>(obj: T): T {
  return formatObject(obj);
}

/**
 * Register filters with Vue
 * @param VueInstance - The Vue instance
 */
export default function registerFilters(VueInstance: any): void {
  VueInstance.filter('formatNumber', formatNumber);
  VueInstance.filter('formatData', formatData);
}
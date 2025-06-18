import { formatValue, formatObject } from '../utils/formatting';
import Vue from 'vue';

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
 * Register all filters with Vue
 * @param Vue - The Vue instance
 */
export default function registerFilters(Vue: any): void {
  Vue.filter('formatNumber', formatNumber);
  Vue.filter('formatData', formatData);
}
import { formatValue, formatObject, isGpsField } from '../utils/formatting';
import Vue from 'vue';
import { ComponentOptions } from 'vue';

/**
 * Interface for the FormattingMixin methods
 */
export interface FormattingMethods {
  format(value: any, fieldNameOrDecimals?: string | number): any;
  formatAll<T>(obj: T): T;
  isGpsField(fieldName: string): boolean;
}

/**
 * Mixin for components that need to format numeric values
 */
export const FormattingMixin: ComponentOptions<Vue> & ThisType<Vue & FormattingMethods> = {
  methods: {
    /**
     * Format a numeric value based on field name or decimals
     * @param value - The value to format
     * @param fieldNameOrDecimals - Field name or decimals
     * @returns The formatted value
     */
    format(value: any, fieldNameOrDecimals: string | number = 2): any {
      return formatValue(value, fieldNameOrDecimals);
    },
    
    /**
     * Format all numeric values in an object
     * @param obj - The object to format
     * @returns A new object with all numeric values formatted
     */
    formatAll<T>(obj: T): T {
      return formatObject(obj);
    },
    
    /**
     * Check if a field name is for GPS coordinates
     * @param fieldName - The field name to check
     * @returns True if it's a GPS field
     */
    isGpsField(fieldName: string): boolean {
      return isGpsField(fieldName);
    }
  }
};
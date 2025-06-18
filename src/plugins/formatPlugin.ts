import { formatValue, formatObject } from '../utils/formatting';
import type { App } from 'vue';

// Format plugin for Vue 3
export default {
  install(app: App) {
    // Register global directive
    app.directive('format', {
      mounted(el, binding) {
        applyFormatting(el, binding);
      },
      updated(el, binding) {
        applyFormatting(el, binding);
      }
    });

    // Register global filters as properties on the global config
    app.config.globalProperties.$filters = {
      // Format a single value
      formatNumber(value: any, fieldName = '') {
        return formatValue(value, fieldName);
      },
      
      // Format an entire object
      formatData(obj: any) {
        return formatObject(obj);
      }
    };
  }
};

// Helper function to apply formatting
function applyFormatting(el: HTMLElement, binding: any) {
  const content = el.textContent?.trim() ?? '';
  
  // Skip if empty or not a number
  if (!content || isNaN(Number(content))) {
    return;
  }
  
  // Format the number
  const formattedValue = formatValue(Number(content), binding.value);
  
  // Update the element text
  if (formattedValue !== null && formattedValue !== undefined) {
    el.textContent = formattedValue.toString();
  }
}
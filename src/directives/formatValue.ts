import { formatValue } from '../utils/formatting';
import type { ObjectDirective } from 'vue';

/**
 * Vue directive for auto-formatting numeric values
 * Usage: v-format="'fieldName'" or v-format="2" (decimals)
 */
const formatDirective: ObjectDirective = {
  bind(el: HTMLElement, binding: any): void {
    applyFormatting(el, binding);
  },
  
  update(el: HTMLElement, binding: any): void {
    applyFormatting(el, binding);
  }
};

/**
 * Helper function to apply formatting
 * @param el - The DOM element
 * @param binding - Directive binding
 */
function applyFormatting(el: HTMLElement, binding: any): void {
  const content = el.textContent?.trim() ?? '';
  
  // Skip if empty or not a number
  if (!content || isNaN(Number(content))) {
    return;
  }
  
  // Format the number
  const formattedValue = formatValue(
    Number(content),
    binding.value
  );
  
  // Update the element
  el.textContent = formattedValue.toString();
}

export default formatDirective;
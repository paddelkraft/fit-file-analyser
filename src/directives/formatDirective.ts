import { formatValue } from '../utils/formatting';

/**
 * Vue directive for auto-formatting numeric values
 */
export default {
  // Vue 2 directive hooks
  inserted(el: HTMLElement, binding: any): void {
    applyFormatting(el, binding);
  },
  
  componentUpdated(el: HTMLElement, binding: any): void {
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
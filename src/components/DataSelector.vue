<template>
  <div class="data-selector">
    <div class="selector-header">
      <h3>Select Data to Display</h3>
    </div>
    
    <div class="checkbox-grid">
      <label
        v-for="attribute in availableAttributes" 
        :key="attribute"
        class="checkbox-label"
      >
        <input 
          type="checkbox" 
          :value="attribute" 
          :checked="selectedAttributes.includes(attribute)"
          @change="toggleAttribute(attribute)"
        />
        {{ formatAttributeName(attribute) }}
      </label>
    </div>      <div class="time-display-selector">
        <label for="time-display-select">Time Display:</label>
        <select id="time-display-select" :value="timeField" @change="timeFieldChanged($event)">
          <option value="timer_time">Timer Time</option>
          <option value="elapsed_time">Elapsed Time</option>
          <option value="timestamp">Timestamp</option>
        </select>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  activityData: any[];
  selectedAttributes: string[];
  timeField: string;
}

interface Emits {
  (e: 'update:selectedAttributes', value: string[]): void;
  (e: 'update:timeField', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Get all unique fields from all data points
const availableAttributes = computed(() => {
  if (!props.activityData || props.activityData.length === 0) return [];
  
  // Get all unique keys from all data points
  const allKeys = new Set<string>();
  props.activityData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => allKeys.add(key));
  });
  
  // Filter out time-related fields and null values
  return Array.from(allKeys)
    .filter(key => 
      !['timestamp', 'elapsed_time', 'timer_time', 'position_lat', 'position_long'].includes(key) &&
      props.activityData.some(point => point[key] !== null && point[key] !== undefined)
    )
    .sort();
});

// Format attribute name for display
const formatAttributeName = (attribute: string): string => {
  // First, replace underscores with spaces
  let formatted = attribute.replace(/_/g, ' ');
  // Then capitalize each word
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Toggle attribute selection
const toggleAttribute = (attribute: string) => {
  const newSelection = [...props.selectedAttributes];
  
  if (newSelection.includes(attribute)) {
    // Remove attribute
    const index = newSelection.indexOf(attribute);
    if (index !== -1) {
      newSelection.splice(index, 1);
    }
  } else {
    // Add attribute
    newSelection.push(attribute);
  }
  
  emit('update:selectedAttributes', newSelection);
};

// Update time field
const timeFieldChanged = (event: Event) => {
  const newValue = (event.target as HTMLSelectElement).value;
  emit('update:timeField', newValue);
};
</script>

<style scoped>
.data-selector {
  background-color: #f5f5f5;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 15px;
}

.selector-header {
  margin-bottom: 15px;
}

.selector-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.checkbox-label:hover {
  background-color: #e8e8e8;
}

.checkbox-label input {
  margin-right: 8px;
}

.time-display-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.time-display-selector select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
</style>
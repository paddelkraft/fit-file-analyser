<template>
  <div class="filter-controls">
    <h3>Data Filtering</h3>
    
    <div class="filter-toggle">
      <label class="switch-wrapper">
        <span class="label-text">Enable filtering:</span>
        <span class="switch">
          <input type="checkbox" id="filter-toggle" v-model="showFiltered">
          <span class="slider" aria-hidden="true"></span>
        </span>
        <span :class="{ 'active-mode': showFiltered }" class="filter-status">
          {{ showFiltered ? 'Filtered Data' : 'Original Data' }}
        </span>
      </label>
    </div>
    
    <div v-if="showFiltered" class="filter-options">
      <div class="filter-method">
        <label for="filter-method">Filter Method:</label>
        <select id="filter-method" v-model="selectedMethod">
          <option value="auto">Automatic</option>
          <option value="correlation">Correlation-based</option>
          <option value="kalman">Kalman Filter</option>
          <option value="movingAverage">Moving Average</option>
          <option value="threshold">Threshold Detection</option>
        </select>
      </div>
      
      <div v-if="stats" class="filter-stats">
        <p><strong>Corrections:</strong></p>
        <ul>
          <li v-for="(count, field) in stats.correctedPoints" :key="field">
            {{ formatFieldName(field) }}: <strong>{{ count }}</strong> points 
            ({{ stats.totalPoints ? Math.round((count / stats.totalPoints) * 100) : 0 }}%)
            <div v-if="stats.dropoutReduction && stats.dropoutReduction[field]" class="detail-stats">
              Dropouts reduced: {{ stats.dropoutReduction[field].reduction }}
              ({{ Math.round(stats.dropoutReduction[field].percentReduction || 0) }}%)
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  showFiltered: boolean;
  method: string;
  stats?: { 
    totalPoints: number;
    correctedPoints: Record<string, number>;
  };
}>();

const emit = defineEmits<{
  (e: 'update:showFiltered', value: boolean): void;
  (e: 'update:method', value: string): void;
}>();

const showFiltered = computed({
  get: () => props.showFiltered,
  set: (value) => emit('update:showFiltered', value)
});

const selectedMethod = computed({
  get: () => props.method,
  set: (value) => emit('update:method', value)
});

const formatFieldName = (field: string) => {
  return field
    .split(/[_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
</script>

<style scoped>
.filter-controls {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.switch-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.label-text {
  margin-right: 8px;
}

.filter-status {
  font-weight: normal;
}

.active-mode {
  font-weight: bold;
  color: #2196F3;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  margin-right: 8px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 24px;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.filter-options {
  border-top: 1px solid #ddd;
  padding-top: 10px;
}

.filter-method {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.filter-method label {
  margin-right: 10px;
}

.filter-method select {
  padding: 4px;
  border-radius: 4px;
}

.filter-stats {
  font-size: 0.9em;
}

.filter-stats ul {
  margin: 5px 0;
  padding-left: 20px;
}

.detail-stats {
  font-size: 0.9em;
  color: #666;
  margin-left: 12px;
  margin-top: 2px;
}
</style>
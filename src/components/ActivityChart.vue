<template>
  <div class="activity-chart">
    <div class="chart-controls" v-if="availableAttributes.length > 0">
      <h3>Select Data to Display</h3>
      <div class="attribute-selectors">
        <label v-for="attr in availableAttributes" :key="attr" class="attribute-checkbox">
          <input 
            type="checkbox" 
            :value="attr" 
            v-model="selectedAttributes"
            @change="updateChart"
          >
          {{ formatAttributeName(attr) }}
        </label>
      </div>
      <div class="time-selector">
        <label>Time Display:</label>
        <select v-model="selectedTimeField" @change="updateChart">
          <option value="timer_time">Timer Time</option>
          <option value="elapsed_time">Elapsed Time</option>
          <option value="timestamp">Timestamp</option>
        </select>
      </div>
    </div>

    <TimeSeriesMultiChart
      v-if="activityData.length > 0"
      :chartTitle="chartTitle"
      :data="chartConfig.data"
      :yAxes="chartConfig.yAxes"
      :xAxisTitle="chartConfig.xAxisTitle"
      :height="chartHeight"
      :config="chartConfig.config"
    />
    <div v-else class="no-data">
      No activity data available
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import TimeSeriesMultiChart from './TimeSeriesMultiChart.vue';
import { transformTimeSeriesData } from '../utils/plotlyMultiLineDataTransformer';

interface TimeSeriesDataPoint {
  timestamp: string;
  elapsed_time: number;
  timer_time: number;
  [key: string]: any; // Allow for other fields
}

const props = defineProps<{
  activityData: TimeSeriesDataPoint[];
  availableDataFields?: string[];
  chartTitle?: string;
  initialAttributes?: string[];
  chartHeight?: number;
}>();

// State
const selectedAttributes = ref<string[]>(props.initialAttributes || []);
const selectedTimeField = ref<string>('timer_time');
const chartConfig = ref(transformTimeSeriesData([], []));

// Computed properties
const availableAttributes = computed(() => {
  console.log('Available attributes:', props.availableDataFields);
  if (! props.availableDataFields){
    return [];
  } 
  
  return props.availableDataFields
});

// If no attributes are initially selected, select the first two available attributes
watch(availableAttributes, (newAttrs) => {
  if (selectedAttributes.value.length === 0 && newAttrs.length > 0) {
    selectedAttributes.value = newAttrs.slice(0, Math.min(2, newAttrs.length));
    updateChart();
  }
}, { immediate: true });

// Watch for changes in activity data
watch(() => props.activityData, (newData) => {
  if (newData.length > 0) {
    updateChart();
  }
}, { deep: true });


// Methods
const updateChart = () => {
  if (props.activityData.length === 0 || selectedAttributes.value.length === 0) return;
  
  // Define colors for attributes
  const axisConfigs = {};
  const colors = ['#FF5733', '#33A1FF', '#33FF57', '#D433FF', '#FFBD33', '#33FFF3', '#FF33C7'];
  
  selectedAttributes.value.forEach((attr, index) => {
    axisConfigs[attr] = {
      title: formatAttributeName(attr),
      color: colors[index % colors.length],
      side: index % 2 === 0 ? 'left' : 'right'
    };
  });
  
  chartConfig.value = transformTimeSeriesData(
    props.activityData,
    selectedAttributes.value,
    selectedTimeField.value,
    props.chartTitle || 'Activity Data',
    axisConfigs
  );
};

const formatAttributeName = (attribute: string): string => {
  return attribute
    .split(/[_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Initialize the chart when component is mounted
onMounted(() => {
  if (props.activityData.length > 0) {
    updateChart();
  }
});
</script>

<style scoped>
.activity-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 20px 0;
}

.chart-controls {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 5px;
}

.attribute-selectors {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.attribute-checkbox {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.attribute-checkbox:hover {
  background-color: #e8e8e8;
}

.time-selector {
  margin-top: 10px;
}

.time-selector select {
  margin-left: 10px;
  padding: 5px;
  border-radius: 4px;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 5px;
  color: #666;
}
</style>
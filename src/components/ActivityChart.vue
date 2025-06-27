<template>
  <div class="activity-chart">
    <DataSelector
      v-if="activityData.length > 0"
      :activityData="activityData"
      :selectedAttributes="selectedAttributes"
      :timeField="selectedTimeField"
      @update:selectedAttributes="selectedAttributes = $event"
      @update:timeField="selectedTimeField = $event"
    />

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
import { ref, onMounted, watch, defineAsyncComponent } from 'vue';
import { transformTimeSeriesData } from '../utils/TimeSeriesTransformer';

// Import components
const DataSelector = defineAsyncComponent(() =>
  import('./DataSelector.vue')
);

const TimeSeriesMultiChart = defineAsyncComponent(() => 
  import('./TimeSeriesMultiChart.vue')
);

interface TimeSeriesDataPoint {
  timestamp?: string;
  elapsed_time?: number;
  timer_time?: number;
  [key: string]: any; // Allow for other fields
}

const props = defineProps<{
  activityData: TimeSeriesDataPoint[];
  chartTitle?: string;
  initialAttributes?: string[];
  chartHeight?: number;
}>();

// State
const selectedAttributes = ref<string[]>(props.initialAttributes || []);
const selectedTimeField = ref<string>('timer_time');
const chartConfig = ref(transformTimeSeriesData([], []));

// Watch for changes in selected attributes or time field
watch([selectedAttributes, selectedTimeField], () => {
  updateChart();
});

// Watch for changes in activity data
watch(() => props.activityData, (newData) => {
  if (newData.length > 0) {
    // If no attributes are selected yet, select the first two
    if (selectedAttributes.value.length === 0) {
      // Find attributes that have non-null values in at least one data point
      const availableAttrs = findAvailableAttributes(newData);
      if (availableAttrs.length > 0) {
        selectedAttributes.value = availableAttrs.slice(0, Math.min(2, availableAttrs.length));
      }
    }
    updateChart();
  }
}, { deep: true, immediate: true });

// Helper function to find available attributes in data
function findAvailableAttributes(data: any[]): string[] {
  if (data.length === 0) return [];
  
  // Get all unique keys from all data points
  const allKeys = new Set<string>();
  data.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => allKeys.add(key));
  });
  
  // Filter out time-related fields and null values
  return Array.from(allKeys)
    .filter(key => 
      !['timestamp', 'elapsed_time', 'timer_time', 'position_lat', 'position_long'].includes(key) &&
      data.some(point => point[key] !== null && point[key] !== undefined)
    )
    .sort();
}

// Methods
const updateChart = () => {
  if (props.activityData.length === 0 || selectedAttributes.value.length === 0) return;
  
  // Define colors for attributes
  const axisConfigs = {};
  const colors = ['#FF5733', '#33A1FF', '#33FF57', '#D433FF', '#FFBD33', '#33FFF3', '#FF33C7'];
  
  selectedAttributes.value.forEach((attr, index) => {
    axisConfigs[attr] = {
      title: formatAttributeForDisplay(attr),
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

// Helper function to format attribute name for display
function formatAttributeForDisplay(attribute: string): string {
  // First, replace underscores with spaces
  let formatted = attribute.replace(/_/g, ' ');
  // Then capitalize each word
  return formatted
    .split(' ')
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
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  /* Allow scrolling if needed */
  overflow: visible;
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
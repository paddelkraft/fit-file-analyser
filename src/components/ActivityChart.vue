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
    
    <FilterControls
      v-if="activityData.length > 0"
      :showFiltered="showFilteredData"
      :method="filterMethod"
      :stats="filterStats"
      @update:showFiltered="showFilteredData = $event"
      @update:method="filterMethod = $event"
    />
    
    <!-- We're using only the built-in Plotly range slider for time selection -->

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
import { ref, onMounted, watch, computed, defineAsyncComponent } from 'vue';
import { transformTimeSeriesData } from '../utils/TimeSeriesTransformer';
import { useSensorDataFilter } from '../composables/useSensorDataFilter';

// Import components
const DataSelector = defineAsyncComponent(() =>
  import('./DataSelector.vue')
);

const TimeSeriesMultiChart = defineAsyncComponent(() => 
  import('./TimeSeriesMultiChart.vue')
);

const FilterControls = defineAsyncComponent(() =>
  import('./FilterControls.vue')
);

// Props
interface Props {
  activityData: any[];
  chartTitle?: string;
  chartHeight?: number;
  initialAttributes?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  activityData: () => [],
  chartTitle: '',
  chartHeight: 500,
  initialAttributes: () => ['heart_rate']
});

// Utility functions
const formatAttributeForDisplay = (attr: string): string => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// State
const selectedAttributes = ref<string[]>(props.initialAttributes || []);
const selectedTimeField = ref<string>('timer_time');
const chartConfig = ref(transformTimeSeriesData([], []));

// Sensor data filtering
const {
  showFilteredData,
  filterMethod,
  applyFilter,
  getFilterStats
} = useSensorDataFilter();

// Methods - Define functions before they're used in watchers
const updateChart = () => {
  try {
    if (!props.activityData || props.activityData.length === 0 || 
        !selectedAttributes.value || selectedAttributes.value.length === 0) return;
    
    // Use filtered or original data based on user preference
    const dataToUse = showFilteredData.value ? 
      filteredActivityData.value : props.activityData;
      
    // Debug log to confirm which data is being used
    console.log(`Using ${showFilteredData.value ? 'FILTERED' : 'ORIGINAL'} data for chart. Points:`, 
      dataToUse?.length || 0);
  
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
      dataToUse,
      selectedAttributes.value,
      selectedTimeField.value,
      props.chartTitle || 'Activity Data',
      axisConfigs
    );
  } catch (error: any) {
    console.error("Error updating chart:", error?.message ?? "Unknown error");
  }
};

// Filtered data - recalculate when data, show status, or filter method changes
const filteredActivityData = computed(() => {
  // Force recalculation by referencing filterMethod
  const currentMethod = filterMethod.value;
  console.log(`Computing filtered data using method: ${currentMethod}`);
  
  if (!showFilteredData.value) {
    return props.activityData;
  }
  
  // Apply filtering
  const filtered = applyFilter(props.activityData);
  
  // Extra confirmation logging
  const correctedPoints = filtered?.filter(point => 
    point?.stroke_rate_corrected || point?.watt_corrected
  )?.length || 0;
  
  console.log(`Filtered data has ${correctedPoints} corrected points out of ${filtered?.length || 0}`);
  
  return filtered;
});

// Filter stats
const filterStats = computed(() => {
  return getFilterStats(filteredActivityData.value);
});

// Watchers - now defined after the updateChart function
// Watch for changes in filter settings
watch([showFilteredData, filterMethod], () => {
  // Force a complete redraw when filter settings change
  chartConfig.value = transformTimeSeriesData([], []);
  setTimeout(() => {
    updateChart();
  }, 50); // Small delay to ensure chart redraws
}, { immediate: true });

// Watch for changes in activity data
watch(() => props.activityData, (newData) => {
  try {
    if (newData && newData.length > 0) {
      // Update chart with full data range
      updateChart();
    }
  } catch (error) {
    console.error("Error updating chart:", error);
  }
}, { immediate: true, deep: false }); // Changed to shallow watch for better performance

// Watch for changes in selected attributes or time field
watch([selectedAttributes, selectedTimeField], () => {
  updateChart();
});

onMounted(() => {
  updateChart();
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

/* Using the built-in Plotly range slider instead */

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
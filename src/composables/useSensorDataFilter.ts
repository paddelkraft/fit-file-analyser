import { ref, computed } from 'vue';
import * as sensorFilters from '../utils/SensorDataFilter';

export interface DataPoint {
  [key: string]: any;
}

export function useSensorDataFilter() {
  const showFilteredData = ref(true);
  const filterMethod = ref<'threshold' | 'movingAverage' | 'correlation' | 'kalman' | 'auto'>('auto');
  const filterFields = ref<string[]>(['stroke_rate', 'watt']);
  const referenceField = ref<string>('enhanced_speed');
  const originalData = ref<DataPoint[]>([]);
  
  // Apply filter to data
  const applyFilter = (data: DataPoint[]) => {
    if (!data || data.length === 0) {
      originalData.value = [];
      return data; // No data to filter
    }
    
    try {
      // Store original data for comparison
      originalData.value = JSON.parse(JSON.stringify(data));
      
      // Return original if filtering disabled
      if (!showFilteredData.value) {
        return data;
      }
      
      // Much more aggressive correction for watt and stroke_rate
      const options = {
        method: filterMethod.value,
        fields: filterFields.value,
        referenceField: referenceField.value,
        // Extremely aggressive thresholds to make filtering very obvious
        dropThreshold: 0.2,  // Detect 20% drops as anomalies
        windowSize: filterMethod.value === 'movingAverage' ? 15 : 30  // Larger window for better smoothing
      };
         // Apply the filter and return results
    const filteredData = sensorFilters.filterSensorData(data, options);
    
    // Debug to check if filtering is making a difference
    sensorFilters.debugFilterDifference(data, filteredData, filterFields.value);
    
    return filteredData;
    } catch (error) {
      console.error("Error applying filter:", error);
      return data; // Return original data if there was an error
    }
  };
  
  // Get stats about applied corrections and improvements
  const getFilterStats = (filteredData: DataPoint[]) => {
    try {
      if (!filteredData || filteredData.length === 0) {
        return { totalPoints: 0, correctedPoints: {} };
      }
      
      // Basic stats (backward compatible)
      const stats = {
        totalPoints: filteredData.length,
        correctedPoints: {} as Record<string, number>
      };
      
      // Count corrections for each field
      for (const field of filterFields.value) {
        stats.correctedPoints[field] = filteredData.filter(
          point => point && point[`${field}_corrected`] === true
        ).length;
      }
      
      // Calculate detailed metrics if we have original data
      if (originalData.value.length > 0 && originalData.value.length === filteredData.length) {
        try {
          const metrics = sensorFilters.calculateFilterImprovementMetrics(
            originalData.value, 
            filteredData,
            filterFields.value
          );
          
          // Add detailed metrics to stats
          Object.assign(stats, metrics);
        } catch (error: any) {
          console.warn('Could not calculate metrics:', error?.message ?? 'Unknown error');
        }
      }
      
      return stats;
    } catch (error: any) {
      console.error('Error getting filter stats:', error?.message ?? 'Unknown error');
      return { totalPoints: 0, correctedPoints: {} };
    }
  };
  
  return {
    showFilteredData,
    filterMethod,
    filterFields,
    referenceField,
    applyFilter,
    getFilterStats
  };
}
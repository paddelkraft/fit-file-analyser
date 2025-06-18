<template>
  <div class="summary-container">
    <h3>Session Summary</h3>
    <div v-if="Object.keys(summary).length > 0" class="summary-items">
      <div v-for="(value, key) in summary" :key="key" class="summary-item">
        <span class="summary-key">{{ formatKey(key) }}:</span>
        <span class="summary-value">{{ formatValue(value, key) }}</span>
      </div>
    </div>
    <div v-else class="no-data">
      No summary data available
    </div>
  </div>
</template>

<script>
export default {
  props: {
    summary: {
      type: Object,
      required: true
    }
  },
  created() {
    console.log('SummaryDisplay created with summary data:', this.summary);
    // Log data types for debugging

  },
  methods: {
    formatKey(key) {
      // Convert camelCase to Title Case with spaces
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    },
    formatValue(value, key) {
      // Handle null or undefined
      if (value === null || value === undefined) {
        return 'N/A';
      }
      
      // Format dates - check if it's a Date object or an ISO date string
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      
      if (typeof value === 'string') {
        // Try to parse date strings
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toLocaleString();
            }
          } catch (e) {
            // Not a valid date, continue with string handling
          }
        }
      }
      
      // Format numbers with appropriate units
      if (typeof value === 'number') {
        // Format different types of data appropriately
        if (this.isTimeProperty(key)) {
          return this.formatTime(value);
        } else if (this.isDistanceProperty(key)) {
          return this.formatDistance(value);
        } else if (this.isSpeedProperty(key)) {
          return this.formatSpeed(value);
        }
        
        // Default number formatting
        return value.toString();
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      // Handle arrays and objects
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      // Default case
      return value.toString();
    },
    
    // Helper methods for formatting values
    isTimeProperty(key) {
      return /time|duration|elapsed|timer/i.test(key);
    },
    
    isDistanceProperty(key) {
      return /distance|ascent|descent/i.test(key);
    },
    
    isSpeedProperty(key) {
      return /speed|pace/i.test(key);
    },
    
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    },
    
    formatDistance(meters) {
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
      } else {
        return `${meters.toFixed(0)} m`;
      }
    },
    
    formatSpeed(metersPerSecond) {
      // Convert to km/h
      const kmh = metersPerSecond * 3.6;
      return `${kmh.toFixed(1)} km/h`;
    }
  }
}
</script>

<style scoped>
.summary-container {
  margin: 20px 0;
  width: 100%;
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.summary-item {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
}

.summary-key {
  font-weight: bold;
  margin-right: 8px;
  min-width: 150px;
  color: #3498db;
}

.summary-value {
  flex: 1;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #3498db;
}
</style>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FilePicker from './components/FilePicker.vue'
import ZoneDistributionChart from './components/ZoneDistributionChart.vue'
import SummaryDisplay from './components/SummaryDisplay.vue'

import { parseFitData } from './utils/fitFileParser' 
import { TrainingSessionAnalyser } from './utils/trainingSessionAnalyser'
import { siven } from './utils/athlete'
import { type IZoneDistributionItem } from './utils/zones'

// Define reactive state variables
const isLoading = ref(false)
const errorMessage = ref('')
const parsedData = ref<any>(null)
const summary = ref<any>(null)
const heartRateDistribution = ref<IZoneDistributionItem[]>([])
const analyser = ref<TrainingSessionAnalyser | null>(null)

// Function to handle the file content
async function handleFileContent(content: ArrayBuffer | string, file: File) {
  console.log('File selected:', file.name);
  
  // Only process .fit files
  if (!file.name.toLowerCase().endsWith('.fit')) {
    errorMessage.value = 'Please select a valid FIT file';
    return;
  }
  
  isLoading.value = true;
  errorMessage.value = '';
  parsedData.value = null;
  summary.value = null;
  heartRateDistribution.value = [];
  analyser.value = null;
  
  try {
    console.log('Starting to parse FIT data');
    // Parse the FIT file
    const data = await parseFitData(content);
    parsedData.value = data;
    
    // Create a new TrainingSessionAnalyser with the parsed data and athlete
    analyser.value = new TrainingSessionAnalyser(data, siven);
    
    // Extract summary
    summary.value = analyser.value.getSessionSummary();
    console.log('Session Summary:', summary.value);
    // Get heart rate distribution using the analyser
    heartRateDistribution.value = analyser.value.getHeartRateDistribution();
    console.log('Heart Rate Distribution:', heartRateDistribution.value);
    
  } catch (error) {
    console.error('Error processing FIT file:', error);
    errorMessage.value = 'Failed to process FIT file: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    isLoading.value = false;
  }
}

// Initialize on component mount
onMounted(() => {
  console.log('App component mounted');
});
</script>

<template>
  <div class="app-container">
    <div class="header">
      <HelloWorld msg="FIT File Analyzer" />
    </div>
    
    <div class="main-content">
      <div class="file-picker-container">
        <h2>Select a FIT File</h2>
        <FilePicker 
          label="Choose FIT File" 
          accept=".fit" 
          readAs="arrayBuffer"
          @content-loaded="handleFileContent"
        />
        
        <div v-if="isLoading" class="loading">
          Parsing FIT file...
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
      
      <!-- Using the new ZoneDistributionChart component -->
      <ZoneDistributionChart 
        v-if="heartRateDistribution.length > 0 && !isLoading"
        :zone-data="heartRateDistribution"
        :title="`Heart Rate Zone Distribution (${siven.name})`"
        chart-id="heart-rate-chart"
      />
      
      <div class="collapsible-sections">
        <div v-if="summary && !isLoading" class="summary-container">
          <details>
             <summary-display :summary="summary" />
          </details>
        </div>
        
        <div v-if="parsedData && !isLoading" class="data-container">
          <details>
            <summary>Show Raw FIT Data</summary>
            <pre>{{ JSON.stringify(parsedData, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Global styles */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  color: #e0e0e0;
}

body {
  overflow-x: hidden;
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .app-container {
    padding: 0 10px;
  }
}
</style>

<style scoped>
.app-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .app-container {
    padding: 0 10px;
  }
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.file-picker-container {
  padding: 1.5rem;
  border: 1px solid #333;
  border-radius: 0.5rem;
  background-color: #242424;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.loading {
  margin-top: 1rem;
  padding: 0.75rem;
  color: #a0aec0;
  font-size: 0.875rem;
  background-color: #2d3748;
  border-radius: 0.25rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  color: #f56565;
  font-size: 0.875rem;
  background-color: rgba(229, 62, 62, 0.1);
  border-radius: 0.25rem;
}

h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 1rem;
}

.collapsible-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.summary-container,
.data-container {
  padding: 1.5rem;
  background-color: #242424;
  border-radius: 0.5rem;
  border: 1px solid #333;
  width: 100%;
  box-sizing: border-box;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.summary-item {
  padding: 0.75rem;
  background-color: #2d3748;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #a0aec0;
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}

details summary {
  cursor: pointer;
  font-weight: 600;
  padding: 0.5rem 0;
  color: #e2e8f0;
}

pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  max-height: 500px;
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 0.25rem;
  color: #a0aec0;
}
</style>
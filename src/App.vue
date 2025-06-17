<!-- filepath: /Users/s0001093/Dropbox/Magnus/garmin dev/Training Analysis/FitFileAnalyser/src/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FilePicker from './components/FilePicker.vue'
import { parseFitData, extractSummary } from './utils/fitFileParser' 
import { TrainingSessionAnalyser } from './utils/trainingSessionAnalyser'
import { siven } from './utils/athlete'
import { type IZoneDistributionItem } from './utils/zones'
// Add static import for Plotly
import * as Plotly from 'plotly.js-dist'

// Define reactive state variables
const isLoading = ref(false)
const errorMessage = ref('')
const parsedData = ref<any>(null)
const summary = ref<any>(null)
const heartRateDistribution = ref<IZoneDistributionItem[]>([])
const analyser = ref<TrainingSessionAnalyser | null>(null)

// Function to get color for zone visualization
function getZoneColor(zoneName: string): string {
  const zoneColors = {
    'Zone 1 - Recovery': '#4ade80', // Green
    'Zone 2 - Endurance': '#22d3ee', // Cyan
    'Zone 3 - Aerobic': '#fb923c', // Orange
    'Zone 4 - Threshold': '#ef4444', // Red
    'Zone 5 - VO2 Max': '#7c3aed', // Purple
    'Zone 5 - Anaerobic': '#7c3aed', // Purple
    'Zone 5 - Sprint': '#7c3aed' // Purple
  };
  
  return zoneColors[zoneName as keyof typeof zoneColors] || '#94a3b8'; // Default to slate
}

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
    // Log content type for debugging
    console.log('Content type:', content instanceof ArrayBuffer ? 'ArrayBuffer' : typeof content);
    console.log('Content length:', content instanceof ArrayBuffer ? content.byteLength : content.length);
    
    // Parse the FIT file
    const data = await parseFitData(content);
    parsedData.value = data;
    
    // Extract summary
    summary.value = extractSummary(data);
    
    // Create a new TrainingSessionAnalyser with the parsed data and athlete
    analyser.value = new TrainingSessionAnalyser(data, siven);
    
    // Get heart rate distribution using the analyser
    heartRateDistribution.value = analyser.value.getHeartRateDistribution();
    
    // Add color information to each zone for visualization
    heartRateDistribution.value = heartRateDistribution.value.map(zone => ({
      ...zone,
      color: getZoneColor(zone.zone.name)
    }));
    
    console.log('Heart Rate Distribution:', heartRateDistribution.value);
    
    // Draw heart rate distribution chart (after DOM update)
    setTimeout(() => {
      if (heartRateDistribution.value.length > 0) {
        drawHeartRateChart();
      }
    }, 100);
    
  } catch (error) {
    console.error('Error processing FIT file:', error);
    errorMessage.value = 'Failed to process FIT file: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    isLoading.value = false;
  }
}

// Function to draw heart rate chart
function drawHeartRateChart() {
  const chartElement = document.getElementById('heart-rate-chart');
  if (!chartElement || !heartRateDistribution.value.length) return;
  
  const zones = heartRateDistribution.value;
  
  // Prepare data for the chart with enhanced y-axis labels including duration
  const data = [{
    y: zones.map(z => `${z.zone.name} (${formatTime(z.duration)})`), // Add duration to labels
    x: zones.map(z => parseFloat(z.percentage.toFixed(1))), // Percentages on x-axis
    type: 'bar',
    orientation: 'h', // Horizontal orientation
    marker: {
      color: zones.map(z => getZoneColor(z.zone.name)),
    },
    text: zones.map(z => `${z.percentage.toFixed(1)}%`),
    textposition: 'auto',
    hoverinfo: 'text',
    hovertext: zones.map(z => 
      `${z.zone.name}<br>` +
      `Range: ${z.zone.min}-${z.zone.max} bpm<br>` +
      `Time: ${formatTime(z.duration)}<br>` +
      `${z.percentage.toFixed(1)}% of total`
    )
  }];
  
  // Chart layout - optimized for dark mode with light text
  const layout = {
    title: {
      text: `Heart Rate Zone Distribution (${siven.name})`,
      font: {
        color: '#e0e0e0',  // Light colored text for dark background
        size: 16
      }
    },
    font: {
      family: 'Arial, sans-serif',
      size: 12,
      color: '#e0e0e0'  // Light colored text for dark background
    },
    xaxis: {
      title: 'Percentage (%)',
      range: [0, Math.max(...zones.map(z => z.percentage)) * 1.1], // Dynamic range based on data
      ticksuffix: '%',
      color: '#e0e0e0',  // Light colored tick labels
      gridcolor: '#333333',
      tickfont: {
        color: '#e0e0e0'  // Light colored tick labels
      }
    },
    yaxis: {
      title: '',
      automargin: true,
      tickfont: {
        size: 11,
        color: '#e0e0e0'  // Light colored tick labels
      }
    },
    paper_bgcolor: '#242424',  // Dark background for the entire plot area
    plot_bgcolor: '#242424',   // Dark background for the plotting area
    margin: {
      l: 220,  // Increased left margin for longer zone labels with duration
      r: 30,
      b: 50,
      t: 80,
      pad: 4
    },
    autosize: true,
    responsive: true,
    showlegend: false
  };
  
  // Additional configuration options
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  // Create the chart with proper typing
  Plotly.newPlot('heart-rate-chart', data, layout, config);
}

// Format seconds to time string (HH:MM:SS)
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize on component mount
onMounted(() => {
  // No initialization needed yet
});
</script>

<!-- Keep the script section unchanged -->

<template>
  <div class="app-container">
    <!-- Main content area -->
    <div class="main-content">
      <!-- FilePicker component -->
      <div class="file-picker-container">
        <h2>Select a FIT File</h2>
        <FilePicker 
          label="Choose FIT File" 
          accept=".fit" 
          readAs="arrayBuffer"
          @content-loaded="handleFileContent"
        />
        
        <!-- Loading indicator -->
        <div v-if="isLoading" class="loading">
          Parsing FIT file...
        </div>
        
        <!-- Error message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
      
      <!-- Heart Rate Distribution Chart -->
      <div v-if="heartRateDistribution.length > 0 && !isLoading" class="chart-container">
        <h3>Heart Rate Zone Distribution</h3>
        
        <!-- Plotly chart container -->
        <div id="heart-rate-chart" style="width:100%; height:400px;"></div>
      </div>
      
      <!-- Collapsible sections -->
      <div class="collapsible-sections">
        <!-- Display session summary -->
        <div v-if="summary && !isLoading" class="summary-container">
          <details>
            <summary>Show Session Summary</summary>
            <div class="summary-grid">
              <div class="summary-item" v-if="summary.sport">
                <div class="label">Sport</div>
                <div class="value">{{ summary.sport }} {{ summary.subSport ? `(${summary.subSport})` : '' }}</div>
              </div>
              <!-- Rest of summary items remain unchanged -->
            </div>
          </details>
        </div>
        
        <!-- Display raw data -->
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
/* Add this style outside of the scoped style to affect the global layout */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  background-color: #1a1a1a;
}

#app {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
:root {
  color-scheme: dark;
}

/* Make app container use full width */
.app-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
  background-color: #1a1a1a;
  color: #e0e0e0;
  min-height: 100vh;
  box-sizing: border-box;
}

/* Updated main content to expand to full width */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

/* Make containers use full width */
.file-picker-container,
.chart-container, 
.summary-container, 
.data-container {
  padding: 1.5rem;
  background-color: #242424;
  border-radius: 0.5rem;
  border: 1px solid #333;
  width: 100%;
  box-sizing: border-box;
}

/* Center align h2 and h3 */
h2, h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 1rem;
}

/* Rest of the styles remain the same */
.header {
  margin-bottom: 2rem;
  text-align: center;
}

.logo-container {
  display: flex;
  justify-content: center;
}

.logo {
  height: 3em;
  padding: 1em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 1em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 1em #42b883aa);
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

.chart-container h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.collapsible-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
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
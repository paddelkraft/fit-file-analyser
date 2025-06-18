<script setup lang="ts">
import {  onMounted, computed, type PropType, watch } from 'vue';
import { type IZoneDistributionItem } from '../utils/zones';
//@ ts-ignore
import * as Plotly from 'plotly.js-dist'; // Using plotly.js-dist instead of plotly.js

// Define component props
const props = defineProps({
  zoneData: {
    type: Array as PropType<IZoneDistributionItem[]>,
    required: true
  },
  title: {
    type: String,
    default: 'Zone Distribution'
  },
  chartId: {
    type: String,
    default: 'zone-distribution-chart'
  }
});

// Generate a unique chart ID if not provided
const uniqueChartId = computed(() => {
  return props.chartId + '-' + Math.random().toString(36).substring(2, 9);
});

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

// Function to draw zone distribution chart
function drawChart() {
  const chartElement = document.getElementById(uniqueChartId.value);
  if (!chartElement || !props.zoneData.length) return;
  
  console.log('Drawing chart with data:', props.zoneData);
  
  const zones = props.zoneData;
  
  // Prepare data for the chart with enhanced y-axis labels including duration
  const data = [{
    y: zones.map(z => `${z.zone.name} (${formatTime(z.duration)})`),
    x: zones.map(z => parseFloat(z.percentage.toFixed(1))),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: zones.map(z => getZoneColor(z.zone.name)),
    },
    text: zones.map(z => `${z.percentage.toFixed(1)}%`),
    textposition: 'auto',
    hoverinfo: 'text',
    hovertext: zones.map(z => 
      `${z.zone.name}<br>` +
      `Range: ${z.zone.min}-${z.zone.max}<br>` +
      `Time: ${formatTime(z.duration)}<br>` +
      `${z.percentage.toFixed(1)}% of total`
    )
  }];
  
  // Chart layout - optimized for dark mode with light text
  const layout = {
    title: {
      text: props.title,
      font: {
        color: '#e0e0e0',
        size: 16
      }
    },
    font: {
      family: 'Arial, sans-serif',
      size: 12,
      color: '#e0e0e0'
    },
    xaxis: {
      title: 'Percentage (%)',
      range: [0, Math.max(...zones.map(z => z.percentage)) * 1.1],
      ticksuffix: '%',
      color: '#e0e0e0',
      gridcolor: '#333333',
      tickfont: {
        color: '#e0e0e0'
      }
    },
    yaxis: {
      title: '',
      automargin: true,
      tickfont: {
        size: 11,
        color: '#e0e0e0'
      }
    },
    paper_bgcolor: '#242424',
    plot_bgcolor: '#242424',
    margin: {
      l: 180,
      r: 50,
      b: 50,
      t: 50
    },
    autosize: true,
    width: null,  // Let it use the container width
    height: null, // Let it use the container height
    responsive: true,
    showlegend: false
  };
  
  // Additional configuration options
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  // When creating the plot, add the config parameter
  Plotly.newPlot(uniqueChartId.value, data, layout, config);
  
  // Add resize handler to ensure proper sizing
  setTimeout(() => {
    Plotly.Plots.resize(document.getElementById(uniqueChartId.value));
  }, 100);
}

// Draw chart when component is mounted
onMounted(() => {
  console.log('ZoneDistributionChart mounted with data:', props.zoneData);
  drawChart();
  
  // Add window resize event listener
  window.addEventListener('resize', () => {
    Plotly.Plots.resize(document.getElementById(uniqueChartId.value));
  });
});

// Watch for changes in zone data and redraw chart
watch(() => props.zoneData, () => {
  console.log('ZoneDistributionChart data changed:', props.zoneData);
  drawChart();
}, { deep: true });
</script>

<template>
  <div class="chart-container">
    <div :id="uniqueChartId" class="chart"></div>
  </div>
</template>

<style scoped>
.chart-container {
  width: 90%;
  height: 500px;
  margin: 0 auto;
  position: relative;
}

#zoneDistributionChart {
  width: 100% !important;
  height: 100% !important;
}
</style>
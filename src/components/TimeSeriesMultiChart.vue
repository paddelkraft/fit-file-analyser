<template>
  <div ref="chartContainer" class="multi-y-axis-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist';

interface ChartLineData {
  name: string;
  x: Array<string | number | Date>;
  y: Array<number>;
  text?: Array<string>; // Text values for hover display (e.g., formatted time)
  type?: 'scatter' | 'bar'; // Add other types as needed
  mode?: 'lines' | 'markers' | 'lines+markers';
  line?: any; // Line properties
  marker?: any; // Marker properties
  yaxis: string; // e.g., 'y', 'y2', 'y3'
  hovertemplate?: string;
  [key: string]: any; // Allow for other Plotly trace properties
}

interface YAxisConfig {
  id: string; // e.g., 'y', 'y2', 'y3'
  title: string;
  side: 'left' | 'right';
  overlaying?: string;
  position?: number;
  showgrid?: boolean;
  zeroline?: boolean;
  titlefont?: any;
  tickfont?: any;
  [key: string]: any; // Allow for other axis properties
}

interface ChartConfig {
  chartTitle?: string;
  data: ChartLineData[];
  yAxes: YAxisConfig[];
  xAxisTitle?: string;
  height?: number;
  width?: number;
  config?: any;
}

const props = defineProps<{
  chartTitle?: string;
  data?: ChartLineData[];
  yAxes?: YAxisConfig[];
  xAxisTitle?: string;
  height?: number;
  width?: number;
  config?: any;
}>();

const chartContainer = ref<HTMLDivElement | null>(null);
let chartInitialized = false;

const defaultLayout: any = {
  autosize: true,
  margin: {
    l: 60,
    r: 60,
    t: 60,
    b: 60,
  },
  hovermode: 'closest',
  xaxis: {
    automargin: true,
  },
};

const defaultPlotlyConfig: any = {
  responsive: true,
  displayModeBar: true,
};

const createPlot = () => {
  if (!chartContainer.value || !props.data || props.data.length === 0) {
    console.warn('Cannot create plot: container or data is missing');
    return;
  }

  try {
    const plotlyData = props.data.map(line => {
      // Safe copy of the line data with default values
      const trace: any = {
        x: line.x || [],
        y: line.y || [],
        type: line.type || 'scatter',
        mode: line.mode || 'lines',
        name: line.name || '',
        yaxis: line.yaxis || 'y',
      };

      // Only add line properties if they exist
      if (line.line) {
        trace.line = { ...line.line };
      }

      // Only add marker properties if they exist
      if (line.marker) {
        trace.marker = { ...line.marker };
      }

      // Add hovertemplate if it exists
      if (line.hovertemplate) {
        trace.hovertemplate = line.hovertemplate;
      }

      // Add any remaining properties
      for (const key in line) {
        if (!['x', 'y', 'type', 'mode', 'name', 'yaxis', 'line', 'marker', 'hovertemplate'].includes(key)) {
          trace[key] = line[key];
        }
      }

      return trace;
    });

    const plotlyLayout: any = {
      ...defaultLayout,
      // Increase the bottom margin to ensure X-axis labels are visible
      margin: {
        ...defaultLayout.margin,
        b: 80, // Increased bottom margin
      },
      xaxis: {
        ...defaultLayout.xaxis,
        title: props.xAxisTitle || '',
        // Configure visible X-axis with time formatting
        visible: true,
        showticklabels: true,
        automargin: true,
        tickmode: 'array',
        // Add custom tickvals and ticktext for time formatting
        tickvals: determineTickValues(plotlyData),
        ticktext: determineTickText(plotlyData),
        // Add hover formatting
        hoverformat: '%H:%M:%S',
        // Force bottom positioning of axis labels
        side: 'bottom',
        // Ensure text is positioned properly
        tickangle: 0,
        tickfont: {
          size: 10,
        },
      },
    };

    // Add chart title if provided
    if (props.chartTitle) {
      plotlyLayout.title = { text: props.chartTitle };
    }

    // Add height and width if provided
    if (props.height) {
      plotlyLayout.height = props.height;
    } else {
      // Set a default height that's large enough
      plotlyLayout.height = 600;
    }
    if (props.width) {
      plotlyLayout.width = props.width;
    }

    // Add y-axes configurations to layout
    if (props.yAxes && props.yAxes.length > 0) {
      props.yAxes.forEach((axis) => {
        if (!axis || !axis.id) {
          console.warn('Invalid y-axis configuration:', axis);
          return;
        }

        const yAxisKey = axis.id === 'y' ? 'yaxis' : `yaxis${axis.id.replace('y', '')}`;
        
        plotlyLayout[yAxisKey] = {
          title: {
            text: axis.title || '',
          },
          side: axis.side || 'left',
        };

        // Add optional axis properties
        if (axis.overlaying) plotlyLayout[yAxisKey].overlaying = axis.overlaying;
        if (axis.position !== undefined) plotlyLayout[yAxisKey].position = axis.position;
        if (axis.showgrid !== undefined) plotlyLayout[yAxisKey].showgrid = axis.showgrid;
        if (axis.zeroline !== undefined) plotlyLayout[yAxisKey].zeroline = axis.zeroline;
        
        // Add font properties if they exist
        if (axis.titlefont) plotlyLayout[yAxisKey].titlefont = axis.titlefont;
        if (axis.tickfont) plotlyLayout[yAxisKey].tickfont = axis.tickfont;

        // Add any other properties
        for (const key in axis) {
          if (!['id', 'title', 'side', 'overlaying', 'position', 'showgrid', 'zeroline', 'titlefont', 'tickfont'].includes(key)) {
            plotlyLayout[yAxisKey][key] = axis[key];
          }
        }
      });
    }

    const plotlyConfig = {
      ...defaultPlotlyConfig,
      ...(props.config || {}),
    };

    console.log('Generated chart data:', {
      chartData: plotlyData,
      yAxes: props.yAxes,
      xAxisTitle: props.xAxisTitle,
      chartTitle: props.chartTitle
    });

    if (!chartInitialized) {
      Plotly.newPlot(chartContainer.value, plotlyData, plotlyLayout, plotlyConfig);
      chartInitialized = true;
    } else {
      Plotly.react(chartContainer.value, plotlyData, plotlyLayout, plotlyConfig);
    }
  } catch (error) {
    console.error('Error creating plot:', error);
  }
};

// Utility function to format seconds into h:mm:ss
function formatSecondsToTime(seconds: number): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '0:00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to determine appropriate tick values based on data
function determineTickValues(data: any[]): number[] | undefined {
  if (!data || data.length === 0 || !data[0].x || data[0].x.length === 0) {
    return undefined;
  }
  
  // Check if x values are numeric (seconds)
  const firstX = data[0].x[0];
  if (typeof firstX !== 'number') {
    return undefined; // Not numeric, let Plotly handle it
  }
  
  // Get min and max x values
  let minX = Number.MAX_SAFE_INTEGER;
  let maxX = Number.MIN_SAFE_INTEGER;
  
  data.forEach(series => {
    if (Array.isArray(series.x)) {
      series.x.forEach((x: any) => {
        if (typeof x === 'number') {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      });
    }
  });
  
  // Generate evenly spaced tick values (more ticks for better visibility)
  const range = maxX - minX;
  const step = Math.max(1, Math.floor(range / 12)); // Increase the number of ticks
  const tickVals = [];
  
  for (let i = minX; i <= maxX; i += step) {
    tickVals.push(i);
  }
  
  // Ensure we have at least 5 ticks for visibility
  if (tickVals.length < 5) {
    // Use more fine-grained ticks
    const finerStep = Math.max(1, Math.floor(range / 5));
    tickVals.length = 0;
    for (let i = minX; i <= maxX; i += finerStep) {
      tickVals.push(i);
    }
  }
  
  return tickVals;
}

// Helper function to format tick labels
function determineTickText(data: any[]): string[] | undefined {
  const tickVals = determineTickValues(data);
  if (!tickVals) return undefined;
  
  return tickVals.map(seconds => formatSecondsToTime(seconds));
}

onMounted(() => {
  nextTick(createPlot);
});

onUnmounted(() => {
  if (chartContainer.value && chartInitialized) {
    try {
      Plotly.purge(chartContainer.value);
    } catch (error) {
      console.error('Error purging plot:', error);
    }
  }
});

watch(
  () => [props.data, props.yAxes, props.chartTitle, props.xAxisTitle, props.height, props.width, props.config],
  () => {
    nextTick(createPlot);
  },
  { deep: true }
);
</script>

<style scoped>
.multi-y-axis-chart {
  width: 100%;
  height: 600px; /* Increased height to ensure X-axis is visible */
  box-sizing: border-box;
}
</style>
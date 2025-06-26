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
      xaxis: {
        ...defaultLayout.xaxis,
        title: props.xAxisTitle || '',
      },
    };

    // Add chart title if provided
    if (props.chartTitle) {
      plotlyLayout.title = { text: props.chartTitle };
    }

    // Add height and width if provided
    if (props.height) {
      plotlyLayout.height = props.height;
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
  height: 500px; /* Default height, can be overridden by props */
}
</style>
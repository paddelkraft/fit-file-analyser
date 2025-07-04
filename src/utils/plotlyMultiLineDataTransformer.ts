import { ref } from 'vue';

interface TimeSeriesDataPoint {
  timestamp: string;
  elapsed_time: number;
  timer_time: number;
  position_lat?: number;
  position_long?: number;
  distance?: number;
  enhanced_speed?: number | null;
  heart_rate?: number | null;
  cadence?: number | null;
  fractional_cadence?: number | null;
  balance?: number | null;
  [key: string]: any; // Allow for other fields
}

interface ChartLineData {
  name: string;
  x: Array<string | number | Date>;
  y: Array<number>;
  type?: 'scatter' | 'bar';
  mode?: 'lines' | 'markers' | 'lines+markers';
  line?: any;
  marker?: any;
  yaxis: string;
  hovertemplate?: string;
}

interface YAxisConfig {
  id: string;
  title: string;
  side: 'left' | 'right';
  overlaying?: string;
  position?: number;
  showgrid?: boolean;
  zeroline?: boolean;
  range?: [number, number];
  automargin?: boolean;
  titlefont?: any;
  tickfont?: any;
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

interface AxisOptions {
  title: string;
  color: string;
  side: 'left' | 'right';
  position?: number;
}

// Default color palette for different metrics
const DEFAULT_COLORS = {
  heart_rate: '#FF5733', // Red
  enhanced_speed: '#33A1FF', // Blue
  cadence: '#33FF57', // Green
  balance: '#D433FF', // Purple
  distance: '#FFBD33', // Orange
  default: '#777777' // Gray (fallback)
};

/**
 * Transform time series data into the format required by TimeSeriesMultiChart
 * 
 * @param timeSeriesData - Array of time series data points
 * @param attributesToDisplay - Array of attribute names to display (keys from the data objects)
 * @param timeField - Field to use for the X-axis (defaults to 'timer_time')
 * @param chartTitle - Title for the chart
 * @param axisConfigs - Optional custom configurations for each axis
 * @returns A chart configuration object ready for use with TimeSeriesMultiChart
 */
export function transformTimeSeriesData(
  timeSeriesData: TimeSeriesDataPoint[],
  attributesToDisplay: string[] = ['heart_rate', 'enhanced_speed'],
  timeField: string = 'timer_time',
  chartTitle: string = 'Activity Data',
  axisConfigs: Record<string, AxisOptions> = {}
): ChartConfig {
  
  console.log('Transforming time series data for chart:', {
    timeSeriesData,
    attributesToDisplay,
    timeField,
    chartTitle,
    axisConfigs
  });

  // Ensure we have data
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return {
      chartTitle,
      data: [],
      yAxes: [],
      xAxisTitle: 'Time'
    };
  }

  // Extract the time values for x-axis
  const xValues = timeSeriesData.map(dataPoint => {
    if (timeField === 'timestamp') {
      return new Date(dataPoint[timeField]);
    } else if (timeField === 'elapsed_time' || timeField === 'timer_time') {
      return dataPoint[timeField] || 0; // Use 0 if null/undefined
    } else {
      return dataPoint[timeField] || 0; // Generic fallback, use 0 if null/undefined
    }
  });

  // Generate chart data and Y-axis configurations
  const chartData: ChartLineData[] = [];
  const yAxes: YAxisConfig[] = [];

  // Keep track of sides for automatic positioning
  let leftAxisCount = 0;
  let rightAxisCount = 0;

  attributesToDisplay.forEach((attribute, index) => {
    // Skip attributes that don't exist in the data
    if (!timeSeriesData.some(point => attribute in point)) {
      console.warn(`Attribute "${attribute}" not found in time series data`);
      return;
    }

    // Generate a unique Y-axis ID (y, y2, y3, etc.)
    const axisId = index === 0 ? 'y' : `y${index + 1}`;
    
    // Extract Y values for this attribute, converting null/undefined to 0
    const yValues = timeSeriesData.map(dataPoint => {
      const value = dataPoint[attribute];
      return value !== null && value !== undefined ? value : 0;
    });

    // Determine color and axis configuration
    const color = axisConfigs[attribute]?.color || 
                 DEFAULT_COLORS[attribute] || 
                 DEFAULT_COLORS.default;

    // Format attribute name for display (convert snake_case to Title Case)
    const displayName = attribute
      .split(/[_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Determine side and position
    const side = axisConfigs[attribute]?.side || (index % 2 === 0 ? 'left' : 'right');
    
    // Calculate position based on how many axes are on each side
    let position;
    if (axisConfigs[attribute]?.position) {
      position = axisConfigs[attribute].position;
    } else {
      if (side === 'left') {
        // Position left axes: closer to 0 means further left
        position = (leftAxisCount === 0) ? undefined : Math.max(0, 0.05 * leftAxisCount);
        leftAxisCount++;
      } else {
        // Position right axes: closer to 1 means further right
        position = 1 - (rightAxisCount === 0 ? 0.05 : 0.05 * (rightAxisCount + 1));
        rightAxisCount++;
      }
    }

    // Add chart line data
    chartData.push({
      name: displayName,
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      yaxis: axisId,
      line: { color, width: 2 },
      hovertemplate: `${displayName}: %{y}<br>Time: %{x}<extra></extra>`
    });

    // Add Y-axis configuration
    yAxes.push({
      id: axisId,
      title: axisConfigs[attribute]?.title || displayName,
      side,
      position,
      overlaying: index === 0 ? undefined : 'y',
      showgrid: index === 0, // Only show grid for first axis
      zeroline: index === 0,
      automargin: true,
      titlefont: { color },
      tickfont: { color }
    });
  });

  // Format X-axis title based on timeField
  let xAxisTitle = 'Time';
  if (timeField === 'timestamp') {
    xAxisTitle = 'Date & Time';
  } else if (timeField === 'elapsed_time') {
    xAxisTitle = 'Elapsed Time (s)';
  } else if (timeField === 'timer_time') {
    xAxisTitle = 'Timer Time (s)';
  }

  

  // Return the final chart configuration
  return {
    chartTitle,
    data: chartData,
    yAxes,
    xAxisTitle,
    height: 1000, // Default height
    config: {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    }
  };
}

/**
 * Creates a reactive chart configuration that can be passed directly to TimeSeriesMultiChart
 */
export function useTimeSeriesChart(
  initialData: TimeSeriesDataPoint[] = [],
  initialAttributes: string[] = ['heart_rate', 'enhanced_speed'],
  timeField: string = 'timer_time',
  chartTitle: string = 'Activity Data',
  axisConfigs: Record<string, AxisOptions> = {}
) {
  const chartConfig = ref(
    transformTimeSeriesData(initialData, initialAttributes, timeField, chartTitle, axisConfigs)
  );

  // Function to update the chart data
  const updateChartData = (
    newData: TimeSeriesDataPoint[],
    attributes?: string[],
    newTimeField?: string,
    newChartTitle?: string,
    newAxisConfigs?: Record<string, AxisOptions>
  ) => {
    chartConfig.value = transformTimeSeriesData(
      newData,
      attributes || initialAttributes,
      newTimeField || timeField,
      newChartTitle || chartTitle,
      newAxisConfigs || axisConfigs
    );
  };

  return {
    chartConfig,
    updateChartData
  };
}
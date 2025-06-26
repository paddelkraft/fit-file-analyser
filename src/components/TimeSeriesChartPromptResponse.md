I need a typescript vue component for a multi line multi y axis scale plotly.js chart

including a usage example.

and an input data example.

---

I will create a Vue 3 TypeScript component that wraps Plotly.js to display a multi-line, multi-Y-axis chart.

I will provide an example of the input data structure required for this component.

Finally, I will demonstrate how to use this component in a parent Vue component, passing the necessary data. Okay, let's create a Vue 3 TypeScript component for a multi-line, multi-Y-axis Plotly.js chart.


Kodavsnitt

    <template>
      <div ref="chartContainer" class="multi-y-axis-chart"></div>
    </template>
    
    <script setup lang="ts">
    import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
    import Plotly, { Data, Layout, Config } from 'plotly.js-dist';
    
    interface ChartLineData {
      name: string;
      x: Array<string | number | Date>;
      y: Array<number>;
      type?: 'scatter' | 'bar'; // Add other types as needed
      mode?: 'lines' | 'markers' | 'lines+markers';
      line?: Partial<Plotly.PlotlyHTMLElement['layout']['xaxis']>; // Correct type for line properties
      marker?: Partial<Plotly.PlotlyHTMLElement['layout']['yaxis']>; // Correct type for marker properties
      yaxis: string; // e.g., 'y', 'y2', 'y3'
      hovertemplate?: string;
      [key: string]: any; // Allow for other Plotly trace properties
    }
    
    interface YAxisConfig {
      id: string; // e.g., 'y', 'y2', 'y3'
      title: string;
      side: 'left' | 'right';
      overlaying?: 'y' | string; // 'y' for default primary y-axis, or 'y<n>' for another y-axis to overlay
      position?: number; // 0 to 1, position of the axis
      showgrid?: boolean;
      zeroline?: boolean;
      range?: [number, number];
      type?: 'linear' | 'log' | 'date' | 'category';
      automargin?: boolean;
      titlefont?: Partial<Plotly.Font>;
      tickfont?: Partial<Plotly.Font>;
      [key: string]: any; // Allow for other Plotly axis properties
    }
    
    const props = defineProps<{
      chartTitle?: string;
      data: ChartLineData[];
      yAxes: YAxisConfig[];
      xAxisTitle?: string;
      height?: number;
      width?: number;
      config?: Partial<Config>;
    }>();
    
    const chartContainer = ref<HTMLDivElement | null>(null);
    let chartInitialized = false;
    
    const defaultLayout: Partial<Layout> = {
      autosize: true,
      margin: {
        l: 60, // Left margin for y-axes
        r: 60, // Right margin for y-axes
        t: 60, // Top margin for title
        b: 60, // Bottom margin for x-axis
      },
      hovermode: 'closest',
      xaxis: {
        automargin: true,
        title: props.xAxisTitle,
      },
    };
    
    const defaultPlotlyConfig: Partial<Config> = {
      responsive: true,
      displayModeBar: true,
    };
    
    const createPlot = () => {
      if (chartContainer.value && props.data && props.data.length > 0) {
        const plotlyData: Data[] = props.data.map(line => ({
          x: line.x,
          y: line.y,
          type: line.type || 'scatter',
          mode: line.mode || 'lines',
          name: line.name,
          yaxis: line.yaxis,
          line: line.line,
          marker: line.marker,
          hovertemplate: line.hovertemplate,
          ...Object.fromEntries(Object.entries(line).filter(([key]) => !['name', 'x', 'y', 'type', 'mode', 'yaxis', 'line', 'marker', 'hovertemplate'].includes(key))) // Pass through other plotly trace properties
        }));
    
        const plotlyLayout: Partial<Layout> = {
          ...defaultLayout,
          title: props.chartTitle ? { text: props.chartTitle } : undefined,
          xaxis: {
            ...defaultLayout.xaxis,
            title: props.xAxisTitle,
          },
          height: props.height,
          width: props.width,
        };
    
        // Add y-axes configurations to layout
        props.yAxes.forEach((axis, index) => {
          const yAxisKey = axis.id === 'y' ? 'yaxis' : `yaxis${axis.id.replace('y', '')}`;
          plotlyLayout[yAxisKey] = {
            title: {
              text: axis.title,
              font: axis.titlefont,
            },
            side: axis.side,
            overlaying: axis.overlaying,
            position: axis.position,
            showgrid: axis.showgrid,
            zeroline: axis.zeroline,
            range: axis.range,
            type: axis.type,
            automargin: axis.automargin,
            tickfont: axis.tickfont,
            ...Object.fromEntries(Object.entries(axis).filter(([key]) => !['id', 'title', 'side', 'overlaying', 'position', 'showgrid', 'zeroline', 'range', 'type', 'automargin', 'titlefont', 'tickfont'].includes(key))) // Pass through other plotly axis properties
          };
        });
    
        const plotlyConfig: Partial<Config> = {
          ...defaultPlotlyConfig,
          ...props.config,
        };
    
        if (!chartInitialized) {
          Plotly.newPlot(chartContainer.value, plotlyData, plotlyLayout, plotlyConfig);
          chartInitialized = true;
        } else {
          Plotly.react(chartContainer.value, plotlyData, plotlyLayout, plotlyConfig);
        }
      }
    };
    
    onMounted(() => {
      nextTick(createPlot);
    });
    
    onUnmounted(() => {
      if (chartContainer.value) {
        Plotly.purge(chartContainer.value);
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

### Explanation of the Component

1.  **Imports**:
    
    *   `ref`, `onMounted`, `onUnmounted`, `watch`, `nextTick` from `vue` for reactivity and lifecycle hooks.
    *   `Plotly`, `Data`, `Layout`, `Config` from `plotly.js-dist` for Plotly types and functions.
2.  **Interfaces**:
    
    *   `ChartLineData`: Defines the structure for each line (trace) in your chart. Key properties include `x`, `y`, `name`, and `yaxis` (which links the trace to a specific Y-axis, e.g., 'y', 'y2', 'y3').
    *   `YAxisConfig`: Defines the configuration for each Y-axis. Important properties are `id` (e.g., 'y', 'y2'), `title`, `side` ('left' or 'right'), and `overlaying` (crucial for aligning multiple Y-axes).
3.  **Props**:
    
    *   `chartTitle`: Optional title for the entire chart.
    *   `data`: An array of `ChartLineData` objects, representing the lines to be plotted.
    *   `yAxes`: An array of `YAxisConfig` objects, defining each Y-axis. The order in this array will generally determine the order of "overlaying" behavior if not explicitly set by `position`.
    *   `xAxisTitle`: Optional title for the X-axis.
    *   `height`, `width`: Optional dimensions for the chart container.
    *   `config`: Optional Plotly configuration object to control interactivity (e.g., `displayModeBar`).
4.  **`chartContainer` ref**: A `ref` to the `div` element where the Plotly chart will be rendered.
    
5.  **`createPlot` function**:
    
    *   Transforms the incoming `props.data` into `Plotly.Data[]` format. It maps the `yaxis` property from your `ChartLineData` to the `yaxis` property in Plotly's trace object.
    *   Constructs the `plotlyLayout`. This is where the magic for multiple Y-axes happens.
        *   It iterates through `props.yAxes`. For each `YAxisConfig`, it creates a corresponding Y-axis entry in the `plotlyLayout`.
        *   The `overlaying` property is key: if `overlaying: 'y'`, it means this axis will overlay the primary 'y' axis. You can also specify `overlaying: 'y2'` for an axis to overlay 'y2', and so on.
        *   `side`: Determines if the axis appears on the 'left' or 'right'.
        *   `position`: Controls the horizontal position of the axis (0 for far left, 1 for far right). You'll need to adjust `margin.l` and `margin.r` in the `defaultLayout` if you have many axes or specific positioning requirements.
    *   Uses `Plotly.newPlot` for the initial rendering and `Plotly.react` for subsequent updates to efficiently redraw the chart when props change.
6.  **Lifecycle Hooks**:
    
    *   `onMounted`: Calls `createPlot` once the component is mounted. `nextTick` ensures the DOM element is available.
    *   `onUnmounted`: Calls `Plotly.purge` to clean up the Plotly chart instance and prevent memory leaks.
7.  **`watch`**:
    
    *   Watches all relevant props (`data`, `yAxes`, `chartTitle`, `xAxisTitle`, `height`, `width`, `config`).
    *   When any of these props change, `createPlot` is called again to update the chart. `deep: true` is important for `data` and `yAxes` as they are arrays of objects.
8.  **Styling**:
    
    *   A basic `height` is provided for the chart container. It's often good practice to define a default or ensure the parent container provides dimensions.

* * *

### Input Data Example

Here's an example of the input data you would pass to the `MultiYAxisChart` component. Notice how each `data` item specifies which `yaxis` it belongs to, and each `yAxes` item defines the properties of that `yaxis`.

TypeScript

    // Example of input data for MultiYAxisChart
    interface ChartData {
      chartTitle: string;
      data: {
        name: string;
        x: (string | number | Date)[];
        y: number[];
        type?: 'scatter' | 'bar';
        mode?: 'lines' | 'markers' | 'lines+markers';
        line?: Partial<Plotly.PlotlyHTMLElement['layout']['xaxis']>;
        marker?: Partial<Plotly.PlotlyHTMLElement['layout']['yaxis']>;
        yaxis: string;
        hovertemplate?: string;
      }[];
      yAxes: {
        id: string;
        title: string;
        side: 'left' | 'right';
        overlaying?: 'y' | string;
        position?: number;
        showgrid?: boolean;
        zeroline?: boolean;
        range?: [number, number];
        type?: 'linear' | 'log' | 'date' | 'category';
        automargin?: boolean;
        titlefont?: Partial<Plotly.Font>;
        tickfont?: Partial<Plotly.Font>;
      }[];
      xAxisTitle?: string;
      height?: number;
      width?: number;
      config?: Partial<Plotly.Config>;
    }
    
    const myChartData: ChartData = {
      chartTitle: 'Multi-line, Multi-Y-Axis Chart Example',
      xAxisTitle: 'Date',
      data: [
        {
          name: 'Temperature (°C)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [20, 22, 19, 23, 21],
          yaxis: 'y', // Uses the default primary y-axis
          line: { color: 'blue' },
          hovertemplate: 'Date: %{x}<br>Temperature: %{y}°C<extra></extra>',
        },
        {
          name: 'Humidity (%)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [60, 65, 58, 70, 62],
          yaxis: 'y2', // Uses the second y-axis
          line: { color: 'red' },
          hovertemplate: 'Date: %{x}<br>Humidity: %{y}%<extra></extra>',
        },
        {
          name: 'Pressure (hPa)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [1010, 1012, 1008, 1015, 1011],
          yaxis: 'y3', // Uses the third y-axis
          line: { color: 'green' },
          hovertemplate: 'Date: %{x}<br>Pressure: %{y} hPa<extra></extra>',
        },
      ],
      yAxes: [
        {
          id: 'y',
          title: 'Temperature',
          side: 'left',
          showgrid: true,
          titlefont: { color: 'blue' },
          tickfont: { color: 'blue' },
          range: [15, 25],
        },
        {
          id: 'y2',
          title: 'Humidity',
          side: 'right',
          overlaying: 'y', // Overlays on the primary 'y' axis
          position: 0.95, // Position on the right side
          showgrid: false, // Don't show grid lines for this axis
          titlefont: { color: 'red' },
          tickfont: { color: 'red' },
          range: [50, 75],
        },
        {
          id: 'y3',
          title: 'Pressure',
          side: 'right',
          overlaying: 'y', // Overlays on the primary 'y' axis
          position: 1.05, // Further right
          showgrid: false,
          titlefont: { color: 'green' },
          tickfont: { color: 'green' },
          range: [1000, 1020],
        },
      ],
      height: 600, // Optional: set a specific height
      config: {
        displayModeBar: true, // Show the Plotly mode bar (zoom, pan, etc.)
      }
    };

### Usage Example

Now, let's see how you would use this `MultiYAxisChart` component in another Vue component (e.g., `App.vue`).

**`src/App.vue`**

Kodavsnitt

    <template>
      <div id="app">
        <h1>My Dashboard Chart</h1>
        <MultiYAxisChart
          :chartTitle="chartData.chartTitle"
          :data="chartData.data"
          :yAxes="chartData.yAxes"
          :xAxisTitle="chartData.xAxisTitle"
          :height="chartData.height"
          :config="chartData.config"
        />
    
        <button @click="updateChartData">Update Chart Data</button>
      </div>
    </template>
    
    <script setup lang="ts">
    import { ref } from 'vue';
    import MultiYAxisChart from './components/MultiYAxisChart.vue';
    import type { Data, Layout, Config } from 'plotly.js-dist'; // Import Plotly types for better intellisense
    
    // Define the shape of your chart data, matching the component's props
    interface ChartLineData {
      name: string;
      x: Array<string | number | Date>;
      y: Array<number>;
      type?: 'scatter' | 'bar';
      mode?: 'lines' | 'markers' | 'lines+markers';
      line?: Partial<Layout['xaxis']>;
      marker?: Partial<Layout['yaxis']>;
      yaxis: string;
      hovertemplate?: string;
      [key: string]: any;
    }
    
    interface YAxisConfig {
      id: string;
      title: string;
      side: 'left' | 'right';
      overlaying?: 'y' | string;
      position?: number;
      showgrid?: boolean;
      zeroline?: boolean;
      range?: [number, number];
      type?: 'linear' | 'log' | 'date' | 'category';
      automargin?: boolean;
      titlefont?: Partial<Plotly.Font>;
      tickfont?: Partial<Plotly.Font>;
      [key: string]: any;
    }
    
    interface ChartProps {
      chartTitle?: string;
      data: ChartLineData[];
      yAxes: YAxisConfig[];
      xAxisTitle?: string;
      height?: number;
      width?: number;
      config?: Partial<Config>;
    }
    
    
    const chartData = ref<ChartProps>({
      chartTitle: 'Environmental Readings Over Time',
      xAxisTitle: 'Date',
      data: [
        {
          name: 'Temperature (°C)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [20, 22, 19, 23, 21],
          yaxis: 'y', // Corresponds to y-axis 'y'
          line: { color: '#1f77b4' }, // Plotly default blue
          hovertemplate: 'Date: %{x}<br>Temp: %{y}°C<extra></extra>',
        },
        {
          name: 'Humidity (%)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [60, 65, 58, 70, 62],
          yaxis: 'y2', // Corresponds to y-axis 'y2'
          line: { color: '#ff7f0e' }, // Plotly default orange
          hovertemplate: 'Date: %{x}<br>Humidity: %{y}%<extra></extra>',
        },
        {
          name: 'Pressure (hPa)',
          x: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
          y: [1010, 1012, 1008, 1015, 1011],
          yaxis: 'y3', // Corresponds to y-axis 'y3'
          line: { color: '#2ca02c' }, // Plotly default green
          hovertemplate: 'Date: %{x}<br>Pressure: %{y} hPa<extra></extra>',
        },
      ],
      yAxes: [
        {
          id: 'y',
          title: 'Temperature (°C)',
          side: 'left',
          showgrid: true,
          zeroline: true,
          automargin: true,
          titlefont: { color: '#1f77b4' },
          tickfont: { color: '#1f77b4' },
          range: [15, 25],
        },
        {
          id: 'y2',
          title: 'Humidity (%)',
          side: 'right',
          overlaying: 'y', // Crucial for overlaying on the primary 'y' axis
          position: 0.95, // Adjust position for multiple right-side axes
          showgrid: false,
          zeroline: false,
          automargin: true,
          titlefont: { color: '#ff7f0e' },
          tickfont: { color: '#ff7f0e' },
          range: [50, 75],
        },
        {
          id: 'y3',
          title: 'Pressure (hPa)',
          side: 'right',
          overlaying: 'y', // Overlaying on the primary 'y' axis
          position: 1.05, // Further to the right
          showgrid: false,
          zeroline: false,
          automargin: true,
          titlefont: { color: '#2ca02c' },
          tickfont: { color: '#2ca02c' },
          range: [1000, 1020],
        },
      ],
      height: 600,
      config: {
        displayModeBar: true,
        displaylogo: false, // Hide Plotly logo
      }
    });
    
    // Example of updating chart data dynamically
    const updateChartData = () => {
      const newDate = new Date();
      const lastDate = chartData.value.data[0].x[chartData.value.data[0].x.length - 1] as string;
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const formattedNextDate = nextDate.toISOString().split('T')[0];
    
      // Add a new data point for each series
      chartData.value.data[0].x.push(formattedNextDate);
      chartData.value.data[0].y.push(Math.floor(Math.random() * 10) + 18); // Random temperature
    
      chartData.value.data[1].x.push(formattedNextDate);
      chartData.value.data[1].y.push(Math.floor(Math.random() * 20) + 55); // Random humidity
    
      chartData.value.data[2].x.push(formattedNextDate);
      chartData.value.data[2].y.push(Math.floor(Math.random() * 15) + 1005); // Random pressure
    
      // Keep only the last 10 data points to avoid an ever-growing chart
      const maxPoints = 10;
      chartData.value.data.forEach(series => {
        if (series.x.length > maxPoints) {
          series.x = series.x.slice(-maxPoints);
          series.y = series.y.slice(-maxPoints);
        }
      });
    
      // Trigger reactivity by creating a new object for `data` array
      chartData.value.data = [...chartData.value.data];
    };
    </script>
    
    <style>
    #app {
      font-family: Avenir, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-align: center;
      color: #2c3e50;
      margin-top: 60px;
    }
    
    .multi-y-axis-chart {
      border: 1px solid #ccc;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
      margin: 20px auto;
      max-width: 90%;
    }
    </style>

### To Run This Example:

1.  **Create a Vue 3 Project**: If you don't have one, you can create it using Vue CLI or Vite:
    
    Bash
    
        # Using Vite (recommended for new projects)
        npm create vue@latest my-vue-chart-app
        cd my-vue-chart-app
        npm install
        
        # Or using Vue CLI
        npm install -g @vue/cli
        vue create my-vue-chart-app
        cd my-vue-chart-app
    
2.  **Install Dependencies**:
    
    Bash
    
        npm install plotly.js-dist
        npm install -D @types/plotly.js
    
3.  **Place the Component**: Save the `MultiYAxisChart.vue` code in `src/components/MultiYAxisChart.vue`.
    
4.  **Update `App.vue`**: Replace the content of `src/App.vue` with the usage example provided above.
    
5.  **Run the Development Server**:
    
    Bash
    
        npm run dev # or npm run serve if using Vue CLI
    

You should now see a multi-line chart with three Y-axes, one for Temperature, one for Humidity, and one for Pressure. The "Update Chart Data" button will add new data points and demonstrate the reactivity of the chart.

---


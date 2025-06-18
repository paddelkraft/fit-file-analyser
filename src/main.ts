/* Fit File Analyzer - Main Entry Point */

// Vue core
import { createApp } from 'vue'
import App from './App.vue'

// Register our formatting plugin
import FormatPlugin from './plugins/formatPlugin';

// Create and configure the Vue application
const app = createApp(App);

// Register plugins
app.use(FormatPlugin);

// Mount the app
app.mount('#app');

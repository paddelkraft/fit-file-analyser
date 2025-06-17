<!-- filepath: /Users/s0001093/Dropbox/Magnus/garmin dev/Training Analysis/FitFileAnalyser/src/components/FilePicker.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'file-selected': [file: File]
  'content-loaded': [content: ArrayBuffer | string, file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')

// Define props for customization
const props = withDefaults(defineProps<{
  label?: string
  accept?: string
  readAs?: 'text' | 'arrayBuffer' | 'dataURL'
  maxSizeMB?: number
}>(), {
  label: 'Select File',
  accept: '*/*',
  readAs: 'arrayBuffer',
  maxSizeMB: 10
})

// Trigger file input click
function openFilePicker() {
  fileInput.value?.click()
}

// Handle file selection
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  
  if (!input.files || input.files.length === 0) {
    selectedFile.value = null
    return
  }
  
  const file = input.files[0]
  selectedFile.value = file
  
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > props.maxSizeMB) {
    errorMessage.value = `File size exceeds maximum allowed (${props.maxSizeMB}MB)`
    return
  }
  
  errorMessage.value = ''
  emit('file-selected', file)
  
  // Read file content
  readFile(file)
}

// Read file content based on readAs prop
function readFile(file: File) {
  isLoading.value = true
  const reader = new FileReader()
  
  reader.onload = () => {
    isLoading.value = false
    if (reader.result) {
      emit('content-loaded', reader.result, file)
    }
  }
  
  reader.onerror = () => {
    isLoading.value = false
    errorMessage.value = 'Error reading file'
  }
  
  // Use the appropriate read method based on props
  if (props.readAs === 'text') {
    reader.readAsText(file)
  } else if (props.readAs === 'dataURL') {
    reader.readAsDataURL(file)
  } else {
    reader.readAsArrayBuffer(file)
  }
}
</script>

<template>
  <div class="file-picker">
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      @change="handleFileChange"
      class="file-input"
    />
    
    <div class="file-picker-ui">
      <button 
        type="button" 
        @click="openFilePicker"
        :disabled="isLoading"
        class="picker-button"
      >
        {{ label }}
      </button>
      
      <div v-if="selectedFile" class="file-info">
        <span class="file-name">{{ selectedFile.name }}</span>
        <span class="file-size">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
      </div>
      
      <div v-if="isLoading" class="loading">
        Loading...
      </div>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-picker {
  margin: 1rem 0;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.file-picker-ui {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker-button {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.picker-button:hover {
  background-color: #2563eb;
}

.picker-button:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.file-name {
  font-weight: 500;
}

.file-size {
  color: #6b7280;
}

.loading {
  color: #6b7280;
  font-size: 0.875rem;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}
</style>
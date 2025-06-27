<template>
  <div class="time-range-slider">
    <div class="slider-header">
      <span class="min-value">{{ formatTime(minValue) }}</span>
      <span class="max-value">{{ formatTime(maxValue) }}</span>
    </div>
    <div 
      ref="sliderContainer" 
      class="slider-container"
      @mousedown="onSliderClick"
    >
      <div class="slider-track"></div>
      <div 
        class="slider-range" 
        :style="{ left: `${leftHandlePosition}%`, width: `${rangeWidth}%` }"
      ></div>
      <div 
        class="slider-handle left-handle" 
        :style="{ left: `${leftHandlePosition}%` }"
        @mousedown.stop="startDrag('left', $event)"
      ></div>
      <div 
        class="slider-handle right-handle" 
        :style="{ left: `${rightHandlePosition}%` }"
        @mousedown.stop="startDrag('right', $event)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { formatSecondsToTime } from '../utils/TimeSeriesTransformer';

interface Props {
  minBound?: number;
  maxBound?: number;
  modelValue?: [number, number];
}

interface Emits {
  (e: 'update:modelValue', value: [number, number]): void;
  (e: 'change', value: [number, number]): void;
}

const props = withDefaults(defineProps<Props>(), {
  minBound: 0,
  maxBound: 100,
  modelValue: () => [0, 100]
});

const emit = defineEmits<Emits>();

const sliderContainer = ref<HTMLDivElement | null>(null);
const activeHandle = ref<'left' | 'right' | null>(null);
const minValue = ref(props.modelValue[0]);
const maxValue = ref(props.modelValue[1]);

// Handle percentage positions
const leftHandlePosition = computed(() => 
  ((minValue.value - props.minBound) / (props.maxBound - props.minBound)) * 100
);

const rightHandlePosition = computed(() => 
  ((maxValue.value - props.minBound) / (props.maxBound - props.minBound)) * 100
);

const rangeWidth = computed(() => rightHandlePosition.value - leftHandlePosition.value);

// Format time display
const formatTime = (seconds: number): string => {
  return formatSecondsToTime(seconds);
};

// Watch for external changes
watch(() => props.modelValue, ([newMin, newMax]) => {
  if (newMin !== minValue.value) minValue.value = newMin;
  if (newMax !== maxValue.value) maxValue.value = newMax;
}, { deep: true });

// Start dragging a handle
const startDrag = (handle: 'left' | 'right', event: MouseEvent) => {
  event.preventDefault();
  activeHandle.value = handle;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

// Calculate position during drag
const onDrag = (event: MouseEvent) => {
  if (!activeHandle.value || !sliderContainer.value) return;

  const rect = sliderContainer.value.getBoundingClientRect();
  const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  
  // Calculate new value based on bounds
  const newValue = props.minBound + position * (props.maxBound - props.minBound);
  
  if (activeHandle.value === 'left') {
    // Ensure left handle doesn't go past right handle
    minValue.value = Math.min(newValue, maxValue.value - 1);
  } else {
    // Ensure right handle doesn't go before left handle
    maxValue.value = Math.max(newValue, minValue.value + 1);
  }

  // Emit updated value
  emit('update:modelValue', [minValue.value, maxValue.value]);
};

// Handle direct clicks on the slider track
const onSliderClick = (event: MouseEvent) => {
  if (!sliderContainer.value) return;
  
  // Don't process if we're already dragging a handle
  if (activeHandle.value) return;
  
  const rect = sliderContainer.value.getBoundingClientRect();
  const clickPosition = (event.clientX - rect.left) / rect.width;
  const clickValue = props.minBound + clickPosition * (props.maxBound - props.minBound);
  
  // Determine which handle to move based on which is closer
  const leftDistance = Math.abs(clickValue - minValue.value);
  const rightDistance = Math.abs(clickValue - maxValue.value);
  
  if (leftDistance <= rightDistance) {
    minValue.value = clickValue;
  } else {
    maxValue.value = clickValue;
  }
  
  emit('update:modelValue', [minValue.value, maxValue.value]);
};

// Stop dragging
const stopDrag = () => {
  if (activeHandle.value) {
    // Emit change event when drag ends
    emit('change', [minValue.value, maxValue.value]);
    activeHandle.value = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
};

// Cleanup event listeners
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped>
.time-range-slider {
  width: 100%;
  padding: 10px 0;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.slider-container {
  position: relative;
  height: 20px;
  cursor: pointer;
}

.slider-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 4px;
  background-color: #ddd;
  transform: translateY(-50%);
  border-radius: 2px;
}

.slider-range {
  position: absolute;
  top: 50%;
  height: 4px;
  background-color: #4a8af4;
  transform: translateY(-50%);
  border-radius: 2px;
}

.slider-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background-color: white;
  border: 2px solid #4a8af4;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.slider-handle:hover {
  background-color: #f2f6ff;
}

.slider-handle:active {
  cursor: grabbing;
  background-color: #e6eeff;
}
</style>
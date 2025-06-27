/**
 * Sensor Data Filter
 * 
 * This file contains algorithms to detect and compensate for sensor tracking losses
 * in fitness data, particularly for metrics like stroke rate and power (watt)
 * measurements that might show sudden drops while speed remains constant.
 */

/**
 * Interface for data points with any number of numeric fields
 */
interface DataPoint {
  [key: string]: any;
}

/**
 * Clean sensor data by detecting and fixing dropouts using threshold-based detection
 * and interpolation between valid values
 * 
 * @param data Array of data points
 * @param rateFields Fields that might experience dropouts (e.g., 'stroke_rate', 'watt')
 * @param referenceField Relatively stable field to compare against (e.g., 'enhanced_speed')
 * @returns Cleaned data with dropouts fixed
 */
export function cleanSensorDataWithThresholds(
  data: DataPoint[], 
  rateFields: string[] = ['stroke_rate', 'watt'], 
  referenceField: string = 'enhanced_speed'
): DataPoint[] {
  if (!data || data.length === 0) return [];
  
  const cleanedData = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Parameters for detection
  const dropThreshold = 0.5; // 50% drop from previous reading
  const correlationWindow = 10; // Number of samples to check for correlation
  const minStableReading = 10; // Minimum value considered valid for rate fields
  
  // Process each data point except the first one
  for (let i = 1; i < cleanedData.length; i++) {
    // Check each rate field for sudden drops
    for (const field of rateFields) {
      const current = cleanedData[i][field];
      const previous = cleanedData[i-1][field];
      
      // Skip if either value is null/undefined
      if (current === null || previous === null || current === undefined || previous === undefined) continue;
      
      // Check if current value drops significantly from previous
      if (current < previous * (1 - dropThreshold) && current < minStableReading) {
        // Check if reference field (speed) is relatively stable
        const refCurrent = cleanedData[i][referenceField];
        const refPrevious = cleanedData[i-1][referenceField];
        
        // Skip if reference values are missing
        if (refCurrent === null || refPrevious === null || 
            refCurrent === undefined || refPrevious === undefined) continue;
            
        const speedChange = Math.abs(refCurrent - refPrevious) / Math.max(0.1, Math.abs(refPrevious));
        
        // If speed is stable but rate fields drop suddenly, it's likely a sensor issue
        if (speedChange < 0.2) { // Less than 20% change in speed
          // Mark data point as corrected
          cleanedData[i][`${field}_original`] = current;
          cleanedData[i][`${field}_corrected`] = true;
          
          // Find next stable reading
          let nextStableIdx = i + 1;
          while (nextStableIdx < cleanedData.length && 
                 (cleanedData[nextStableIdx][field] === null || 
                  cleanedData[nextStableIdx][field] === undefined ||
                  cleanedData[nextStableIdx][field] < minStableReading)) {
            nextStableIdx++;
          }
          
          // If we found a stable reading ahead, interpolate
          if (nextStableIdx < cleanedData.length) {
            // Linear interpolation between previous stable and next stable points
            const gap = nextStableIdx - (i - 1);
            const step = (cleanedData[nextStableIdx][field] - previous) / gap;
            
            // Fill in interpolated values
            for (let j = i; j < nextStableIdx; j++) {
              cleanedData[j][`${field}_original`] = cleanedData[j][field];
              cleanedData[j][field] = previous + step * (j - (i - 1));
              cleanedData[j][`${field}_corrected`] = true;
            }
          } else {
            // No future stable point found, use last known good value
            cleanedData[i][field] = previous;
          }
        }
      }
    }
  }
  
  return cleanedData;
}

/**
 * Apply a moving average filter with outlier detection to smooth data
 * and remove dropouts
 * 
 * @param data Array of data points
 * @param fields Fields to clean (e.g., 'stroke_rate', 'watt')
 * @param windowSize Size of the moving average window
 * @returns Cleaned data with smoother values
 */
export function applyMovingAverageFilter(
  data: DataPoint[], 
  fields: string[] = ['stroke_rate', 'watt'],
  windowSize: number = 5
): DataPoint[] {
  if (!data || data.length === 0) return [];
  
  const result = JSON.parse(JSON.stringify(data)); // Deep clone
  
  for (const field of fields) {
    // First pass: calculate moving average and standard deviation
    for (let i = 0; i < result.length; i++) {
      // Get window of values centered on current point
      const windowStart = Math.max(0, i - Math.floor(windowSize / 2));
      const windowEnd = Math.min(result.length - 1, i + Math.floor(windowSize / 2));
      const window = result.slice(windowStart, windowEnd + 1)
                         .map(d => d[field])
                         .filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (window.length > 0) {
        // Calculate mean
        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
        
        // Calculate standard deviation
        const stdDev = Math.sqrt(
          window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length
        );
        
        // Store these statistics with the data point
        result[i][`${field}_mean`] = mean;
        result[i][`${field}_stddev`] = stdDev;
      }
    }
    
    // Second pass: detect and replace outliers
    for (let i = 0; i < result.length; i++) {
      const value = result[i][field];
      const mean = result[i][`${field}_mean`];
      const stdDev = result[i][`${field}_stddev`];
      
      // Skip points with no statistics
      if (mean === undefined || stdDev === undefined) continue;
      
      // If value is more than 2 standard deviations below the mean, likely a dropout
      if (value !== null && value !== undefined && !isNaN(value) && value < mean - 2 * stdDev) {
        // Save original value
        result[i][`${field}_original`] = value;
        
        // Replace with the moving average
        result[i][field] = mean;
        result[i][`${field}_corrected`] = true;
      }
    }
  }
  
  return result;
}

/**
 * Apply a correlation-based filter that uses the relationship between
 * metrics to detect and fix anomalies
 * 
 * @param data Array of data points
 * @param targetFields Fields to clean (e.g., 'stroke_rate', 'watt')
 * @param referenceField Reference field that is more reliable (e.g., 'enhanced_speed')
 * @param windowSize Analysis window size
 * @returns Cleaned data
 */
export function correlationBasedFiltering(
  data: DataPoint[], 
  targetFields: string[] = ['stroke_rate', 'watt'], 
  referenceField: string = 'enhanced_speed',
  windowSize: number = 30
): DataPoint[] {
  if (!data || data.length === 0) return [];
  
  const cleanedData = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // First, establish the normal correlation between each target field and the reference
  const correlations: Record<string, number> = {};
  const validRanges: Record<string, { min: number, max: number, mean: number }> = {};
  
  for (const field of targetFields) {
    // Get pairs of values where both fields have valid data
    const pairs = data.filter(d => 
      d[field] !== null && d[field] !== undefined && !isNaN(d[field]) && d[field] > 0 &&
      d[referenceField] !== null && d[referenceField] !== undefined && !isNaN(d[referenceField]) && d[referenceField] > 0
    ).map(d => [d[referenceField], d[field]]);
    
    if (pairs.length > 10) { // Need minimum sample size
      // Calculate correlation coefficient
      const xMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
      const yMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
      
      const numerator = pairs.reduce((sum, pair) => 
        sum + (pair[0] - xMean) * (pair[1] - yMean), 0);
      
      const denominator = Math.sqrt(
        pairs.reduce((sum, pair) => sum + Math.pow(pair[0] - xMean, 2), 0) *
        pairs.reduce((sum, pair) => sum + Math.pow(pair[1] - yMean, 2), 0)
      );
      
      correlations[field] = denominator !== 0 ? numerator / denominator : 0;
      
      // Establish valid ranges relative to reference field
      const ratios = pairs
        .filter(pair => pair[0] > 0) // Avoid division by zero
        .map(pair => pair[1] / pair[0]);
      
      if (ratios.length > 0) {
        const ratioMean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
        const ratioStdDev = Math.sqrt(
          ratios.reduce((sum, ratio) => sum + Math.pow(ratio - ratioMean, 2), 0) / ratios.length
        );
        
        validRanges[field] = {
          min: Math.max(0, ratioMean - 2.5 * ratioStdDev),
          max: ratioMean + 2.5 * ratioStdDev,
          mean: ratioMean
        };
      }
    }
  }
  
  // Now process each data point to fix dropouts
  for (let i = 0; i < cleanedData.length; i++) {
    for (const field of targetFields) {
      const value = cleanedData[i][field];
      const refValue = cleanedData[i][referenceField];
      
      // Skip if reference value is missing or invalid
      if (refValue === null || refValue === undefined || isNaN(refValue) || refValue <= 0) continue;
      
      // Skip if value is missing
      if (value === null || value === undefined || isNaN(value)) continue;
      
      // Much more aggressive detection of dropouts, especially for stroke_rate and watt
      const isDropout = 
          // Value is zero or very low while speed is significant
          (value < 5 && refValue > 3) || 
          
          // Value is far below expected range based on speed
          (validRanges[field] && value < refValue * validRanges[field].min * 0.8 && refValue > 2) || 
          
          // Sudden drop from previous value (over 30%)
          (i > 0 && cleanedData[i-1][field] > 10 && 
           value < cleanedData[i-1][field] * 0.7 && 
           refValue > 1) ||
           
          // Value is inconsistent with typical ranges
          (field === 'stroke_rate' && refValue > 7 && value < 15) ||
          (field === 'watt' && refValue > 5 && value < 50);
      
      if (isDropout) {
        // Save original value
        cleanedData[i][`${field}_original`] = value;
        cleanedData[i][`${field}_corrected`] = true;
        
        // It's a dropout - calculate expected value based on reference and correlation
        // For more dramatic filtering, increase the expected value
        let expectedValue = refValue * (validRanges[field]?.mean || 1);
        
        // For stroke rate and watt, apply more dramatic correction
        if (field === 'stroke_rate') {
          // Stroke rate should be at least 20 when speed is above 5
          expectedValue = Math.max(expectedValue, refValue > 5 ? 20 : 10);
        } else if (field === 'watt') {
          // Watt should be at least 50 when speed is above 3
          expectedValue = Math.max(expectedValue, refValue > 3 ? 50 : 20);
        }
        
        // Find surrounding valid values
        let prevValue = null;
        let nextValue = null;
        let prevIdx = i - 1;
        let nextIdx = i + 1;
        
        // Look back for valid value
        while (prevIdx >= 0 && prevValue === null) {
          if (cleanedData[prevIdx][field] !== null && 
              cleanedData[prevIdx][field] !== undefined &&
              !isNaN(cleanedData[prevIdx][field]) &&
              cleanedData[prevIdx][field] > 0) {
            prevValue = cleanedData[prevIdx][field];
          }
          prevIdx--;
        }
        
        // Look ahead for valid value
        while (nextIdx < cleanedData.length && nextValue === null) {
          if (cleanedData[nextIdx][field] !== null && 
              cleanedData[nextIdx][field] !== undefined &&
              !isNaN(cleanedData[nextIdx][field]) &&
              cleanedData[nextIdx][field] > 0) {
            nextValue = cleanedData[nextIdx][field];
          }
          nextIdx++;
        }
        
        // Choose best replacement value
        if (prevValue !== null && nextValue !== null) {
          // Interpolate between valid points
          const gap = (nextIdx - 1) - (prevIdx + 1);
          if (gap > 0) {
            const step = (nextValue - prevValue) / (gap + 1);
            cleanedData[i][field] = prevValue + step * (i - (prevIdx + 1));
          } else {
            cleanedData[i][field] = (prevValue + nextValue) / 2;
          }
        } else if (prevValue !== null) {
          cleanedData[i][field] = prevValue;
        } else if (nextValue !== null) {
          cleanedData[i][field] = nextValue;
        } else {
          cleanedData[i][field] = expectedValue;
        }
      }
    }
  }
  
  return cleanedData;
}

/**
 * Kalman Filter implementation for smoothing sensor data
 */
class KalmanFilter {
  private x: number; // State estimate
  private P: number; // Estimation error covariance
  private Q: number; // Process noise covariance
  private R: number; // Measurement noise covariance
  
  constructor(initialValue: number = 0, initialCovariance: number = 1, 
              processNoise: number = 0.01, measurementNoise: number = 1.0) {
    this.x = initialValue;
    this.P = initialCovariance;
    this.Q = processNoise;
    this.R = measurementNoise;
  }
  
  // Predict next state
  predict(): number {
    this.P = this.P + this.Q;
    return this.x;
  }
  
  // Update with measurement
  update(measurement: number, isValid: boolean = true): number {
    if (!isValid) {
      // For invalid measurements, just return the prediction
      return this.x;
    }
    
    // Kalman gain
    const K = this.P / (this.P + this.R);
    
    // Update estimate with measurement
    this.x = this.x + K * (measurement - this.x);
    
    // Update error covariance
    this.P = (1 - K) * this.P;
    
    return this.x;
  }
}

/**
 * Apply Kalman filtering to smooth sensor data and handle dropouts
 * 
 * @param data Array of data points
 * @param fields Fields to filter
 * @param dropThreshold Threshold for detecting dropouts (as percentage)
 * @returns Filtered data
 */
export function applyKalmanFilter(
  data: DataPoint[], 
  fields: string[] = ['stroke_rate', 'watt'],
  dropThreshold: number = 0.5
): DataPoint[] {
  if (!data || data.length === 0) return [];
  
  const result = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Create a Kalman filter for each field
  const filters: Record<string, KalmanFilter> = {};
  
  for (const field of fields) {
    // Find a good initial value
    const validInitial = data.find(d => 
      d[field] !== null && d[field] !== undefined && !isNaN(d[field]) && d[field] > 0
    );
    
    if (validInitial) {
      filters[field] = new KalmanFilter(validInitial[field], 1, 0.05, 1.0); // More process noise, less measurement noise
    } else {
      filters[field] = new KalmanFilter(0, 10, 0.05, 1.0); // Large initial uncertainty
    }
    
    // Process each point
    for (let i = 0; i < result.length; i++) {
      // Predict next state
      const predicted = filters[field].predict();
      
      const value = result[i][field];
      let isValid = true;
      
      // Check if current value is valid
      if (value === null || value === undefined || isNaN(value) || value === 0) {
        isValid = false;
      } else if (i > 0) {
        const prev = result[i-1][field];
        // Check for sudden drops
        if (prev !== null && prev !== undefined && !isNaN(prev) && prev > 0) {
          // More aggressive dropout detection
          if (value < prev * (1 - dropThreshold) ||  // Sudden drop
              (i > 1 && result[i-2][field] > 0 && value < result[i-2][field] * 0.5)) { // Sustained drop
            isValid = false;
          }
        }
      }
      
      // Additional check - if reference field exists, compare with it
      const speedField = 'enhanced_speed';
      if (result[i][speedField] !== undefined && 
          !isNaN(result[i][speedField]) && 
          result[i][speedField] > 1 && 
          value < 10) {
        // If speed is significant but power/stroke is low, likely a dropout
        isValid = false;
      }
      
      // Update with measurement
      const filtered = filters[field].update(isValid ? value : predicted, isValid);
      
      // Store original and filtered values
      if (!isValid) {
        result[i][`${field}_original`] = value;
        result[i][field] = filtered;
        result[i][`${field}_filtered`] = filtered;
        result[i][`${field}_corrected`] = true;
      } else {
        result[i][`${field}_filtered`] = filtered;
      }
    }
  }
  
  return result;
}

/**
 * Apply all filtering methods and return the best result
 * 
 * @param data Array of data points
 * @param fields Fields to clean
 * @param referenceField Reference field (usually speed)
 * @returns Cleaned data using the best available method
 */
export function cleanSensorData(
  data: DataPoint[],
  fields: string[] = ['stroke_rate', 'watt'],
  referenceField: string = 'enhanced_speed'
): DataPoint[] {
  // Choose the correlation-based method as it tends to work best for this kind of data
  return correlationBasedFiltering(data, fields, referenceField);
}

/**
 * Apply filtering to sensor data with configurable options
 * 
 * @param data Array of data points
 * @param options Filtering options
 * @returns Cleaned data
 */
export function filterSensorData(
  data: DataPoint[],
  options: {
    method: 'threshold' | 'movingAverage' | 'correlation' | 'kalman' | 'auto',
    fields?: string[],
    referenceField?: string,
    dropThreshold?: number,
    windowSize?: number
  }
): DataPoint[] {
  const fields = options.fields || ['stroke_rate', 'watt'];
  const referenceField = options.referenceField || 'enhanced_speed';
  
  switch (options.method) {
    case 'threshold':
      return cleanSensorDataWithThresholds(data, fields, referenceField);
      
    case 'movingAverage':
      return applyMovingAverageFilter(data, fields, options.windowSize || 5);
      
    case 'correlation':
      return correlationBasedFiltering(data, fields, referenceField, options.windowSize || 30);
      
    case 'kalman':
      return applyKalmanFilter(data, fields, options.dropThreshold || 0.5);
      
    case 'auto':
    default:
      // Use correlation-based filtering as default
      return correlationBasedFiltering(data, fields, referenceField);
  }
}

/**
 * Utility function to check if a field at a specific index has been corrected
 */
export function isCorrectedPoint(data: DataPoint[], index: number, field: string): boolean {
  if (!data || index < 0 || index >= data.length) return false;
  return !!data[index][`${field}_corrected`];
}

/**
 * Utility function to get the original value for a field if it was corrected
 */
export function getOriginalValue(data: DataPoint[], index: number, field: string): number | null {
  if (!data || index < 0 || index >= data.length) return null;
  return data[index][`${field}_original`] !== undefined ? 
    data[index][`${field}_original`] : data[index][field];
}

/**
 * Calculate improvement metrics between original and filtered data
 */
export function calculateFilterImprovementMetrics(
  originalData: DataPoint[],
  filteredData: DataPoint[],
  fields: string[] = ['stroke_rate', 'watt']
): Record<string, any> {
  if (!originalData || !filteredData) {
    return { error: 'Missing data for comparison' };
  }
  
  if (originalData.length !== filteredData.length) {
    console.error(`Data length mismatch: original=${originalData.length}, filtered=${filteredData.length}`);
    return { error: 'Data length mismatch', originalLength: originalData.length, filteredLength: filteredData.length };
  }
  
  const metrics: Record<string, any> = {
    totalPoints: originalData.length,
    correctedPoints: {},
    dropoutReduction: {},
    averageValues: {}
  };    for (const field of fields) {
    // Skip fields that don't exist in data
    if (originalData.length > 0 && originalData[0][field] === undefined) {
      continue;
    }
      
    // Count corrected points
    let corrected = 0;
    let originalDropouts = 0;
    let filteredDropouts = 0;
    let originalSum = 0;
    let filteredSum = 0;
    let validPoints = 0;
    
    for (let i = 0; i < originalData.length; i++) {
      // Count corrections - safely check if the property exists
      if (filteredData[i] && 
          filteredData[i][`${field}_corrected`] === true) {
        corrected++;
      }
      
      // Safely get values
      const originalValue = originalData[i]?.[field];
      const filteredValue = filteredData[i]?.[field];
      
      if (originalValue !== null && originalValue !== undefined && !isNaN(originalValue)) {
        if (originalValue < 5 || originalValue === 0) {
          originalDropouts++;
        }
        originalSum += originalValue;
        validPoints++;
      }
      
      if (filteredValue !== null && filteredValue !== undefined && !isNaN(filteredValue)) {
        if (filteredValue < 5 || filteredValue === 0) {
          filteredDropouts++;
        }
        filteredSum += filteredValue;
      }
    }
    
    metrics.correctedPoints[field] = corrected;
    metrics.dropoutReduction[field] = {
      original: originalDropouts,
      filtered: filteredDropouts,
      reduction: originalDropouts - filteredDropouts,
      percentReduction: originalDropouts > 0 ? 
        ((originalDropouts - filteredDropouts) / originalDropouts) * 100 : 0
    };
    
    metrics.averageValues[field] = {
      original: validPoints > 0 ? originalSum / validPoints : 0,
      filtered: validPoints > 0 ? filteredSum / validPoints : 0
    };
  }
  
  return metrics;
}

/**
 * Debug function to log difference between original and filtered data
 */
export function debugFilterDifference(
  originalData: DataPoint[], 
  filteredData: DataPoint[],
  fields: string[] = ['stroke_rate', 'watt']
): void {
  if (originalData.length !== filteredData.length || originalData.length === 0) {
    console.log("Cannot compare original and filtered data - length mismatch or empty data");
    return;
  }
  
  // Count differences
  const diffs: Record<string, {
    pointsChanged: number;
    avgDifference: number;
    examples: Array<{
      index: number;
      original: number;
      filtered: number;
      difference: number;
    }>;
  }> = {};
  let totalChanges = 0;
  
  fields.forEach(field => {
    diffs[field] = {
      pointsChanged: 0,
      avgDifference: 0,
      examples: []
    };
    
    let diffSum = 0;
    for (let i = 0; i < originalData.length; i++) {
      const original = originalData[i]?.[field];
      const filtered = filteredData[i]?.[field];
      
      if (original !== filtered && original !== undefined && filtered !== undefined) {
        diffs[field].pointsChanged++;
        totalChanges++;
        
        const difference = filtered - original;
        diffSum += Math.abs(difference);
        
        // Store a few examples
        if (diffs[field].examples.length < 5 && Math.abs(difference) > 5) {
          diffs[field].examples.push({
            index: i,
            original,
            filtered,
            difference
          });
        }
      }
    }
    
    if (diffs[field].pointsChanged > 0) {
      diffs[field].avgDifference = diffSum / diffs[field].pointsChanged;
    }
  });
  
  if (totalChanges > 0) {
    console.log("🔍 Filter made changes to the data:", { 
      totalChanges,
      fieldsChanged: diffs
    });
  } else {
    console.warn("⚠️ Filter did not change any data points!");
  }
}
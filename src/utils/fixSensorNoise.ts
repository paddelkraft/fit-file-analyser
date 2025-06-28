/**
 * Interface representing a data point with sensor readings
 */
interface DataPoint {
  timestamp: string;
  enhanced_speed?: number;
  "stroke rate"?: number;
  watt?: number;
  [key: string]: any;
}

/**
 * Configuration options for noise detection
 */
interface NoiseDetectionOptions {
  /**
   * Maximum allowed percentage drop in stroke rate while speed is stable
   */
  maxStrokeRateDrop: number;
  
  /**
   * Maximum allowed percentage drop in watt while speed is stable
   */
  maxWattDrop: number;
  
  /**
   * Maximum speed variation that's considered "stable"
   */
  speedStabilityThreshold: number;
  
  /**
   * Minimum required values to avoid being marked as noise
   */
  minValidStrokeRate: number;
  minValidWatt: number;
}

/**
 * Result of noise detection for a data point
 */
interface NoiseDetectionResult {
  isNoisy: boolean;
  noisyFields: string[];
  originalValues: { [key: string]: number | undefined };
  suggestedValues: { [key: string]: number | undefined };
  dropPercentages: { [key: string]: number };
}

/**
 * Detects noise in sensor data, focusing on dramatic drops in watt and stroke rate 
 * when speed remains stable
 * 
 * @param dataPoints - Array of data points to analyze
 * @param options - Configuration options for noise detection
 * @returns Array of detection results for each data point
 */
function detectSensorNoise(
  dataPoints: DataPoint[],
  options: Partial<NoiseDetectionOptions> = {}
): NoiseDetectionResult[] {
  // Default options with sensible values
  const defaultOptions: NoiseDetectionOptions = {
    maxStrokeRateDrop: 50, // 50% max drop allowed when speed is stable
    maxWattDrop: 60,       // 60% max drop allowed when speed is stable
    speedStabilityThreshold: 15, // 15% speed variation is considered stable
    minValidStrokeRate: 10,
    minValidWatt: 30
  };
  
  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  const results: NoiseDetectionResult[] = [];
  
  // Helper function to access fields with different possible naming conventions
  const getValue = (point: DataPoint, fieldBase: string): number | undefined => {
    // Try different variations of field names
    const variations = [
      fieldBase,
      fieldBase.replace(' ', '_'),
      fieldBase.replace('_', ' '),
      fieldBase.toLowerCase(),
      fieldBase.toUpperCase()
    ];
    
    for (const variant of variations) {
      if (point[variant] !== undefined) {
        return typeof point[variant] === 'number' ? point[variant] as number : undefined;
      }
    }
    
    return undefined;
  };
  
  // Process each data point
  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    const prevPoint = i > 0 ? dataPoints[i - 1] : null;
    const nextPoint = i < dataPoints.length - 1 ? dataPoints[i + 1] : null;
    
    // Get current values using flexible field name handling
    const currentSpeed = getValue(point, 'enhanced_speed');
    const currentStrokeRate = getValue(point, 'stroke rate');
    const currentWatt = getValue(point, 'watt');
    
    // Initialize result
    const result: NoiseDetectionResult = {
      isNoisy: false,
      noisyFields: [],
      originalValues: {
        'stroke rate': currentStrokeRate,
        'watt': currentWatt
      },
      suggestedValues: {},
      dropPercentages: {}
    };
    
    // If no previous point, we can't detect drops
    if (!prevPoint) {
      results.push(result);
      continue;
    }
    
    // Get previous values
    const prevSpeed = getValue(prevPoint, 'enhanced_speed');
    const prevStrokeRate = getValue(prevPoint, 'stroke rate');
    const prevWatt = getValue(prevPoint, 'watt');
    
    // If we don't have the necessary values, continue
    if (currentSpeed === undefined || prevSpeed === undefined) {
      results.push(result);
      continue;
    }
    
    // Calculate speed variation to determine if speed is "stable"
    const speedVariation = Math.abs(
      ((currentSpeed - prevSpeed) / Math.max(prevSpeed, 0.01)) * 100
    );
    const isSpeedStable = speedVariation <= mergedOptions.speedStabilityThreshold;
    
    // Only check for noise if speed is stable (we expect drops when slowing down)
    if (isSpeedStable && currentSpeed > 1.0) {
      // Check stroke rate for noise
      if (
        currentStrokeRate !== undefined && 
        prevStrokeRate !== undefined && 
        prevStrokeRate > 0
      ) {
        const strokeRateDrop = 
          ((prevStrokeRate - currentStrokeRate) / prevStrokeRate) * 100;
        
        result.dropPercentages['stroke rate'] = strokeRateDrop;
        
        if (
          strokeRateDrop > mergedOptions.maxStrokeRateDrop || 
          (currentStrokeRate < mergedOptions.minValidStrokeRate && prevStrokeRate > mergedOptions.minValidStrokeRate)
        ) {
          // Look ahead for a better value
          let suggestedValue = prevStrokeRate;
          
          // If there's a next point with a reasonable value, use interpolation
          if (nextPoint) {
            const nextStrokeRate = getValue(nextPoint, 'stroke rate');
            if (nextStrokeRate !== undefined && nextStrokeRate > mergedOptions.minValidStrokeRate) {
              // Use linear interpolation between prev and next
              suggestedValue = (prevStrokeRate + nextStrokeRate) / 2;
            }
          }
          
          result.isNoisy = true;
          result.noisyFields.push('stroke rate');
          result.suggestedValues['stroke rate'] = suggestedValue;
        }
      }
      
      // Check watt for noise
      if (
        currentWatt !== undefined && 
        prevWatt !== undefined && 
        prevWatt > 0
      ) {
        const wattDrop = ((prevWatt - currentWatt) / prevWatt) * 100;
        
        result.dropPercentages['watt'] = wattDrop;
        
        if (
          wattDrop > mergedOptions.maxWattDrop || 
          (currentWatt < mergedOptions.minValidWatt && prevWatt > mergedOptions.minValidWatt)
        ) {
          // Look ahead for a better value
          let suggestedValue = prevWatt;
          
          // If there's a next point with a reasonable value, use interpolation
          if (nextPoint) {
            const nextWatt = getValue(nextPoint, 'watt');
            if (nextWatt !== undefined && nextWatt > mergedOptions.minValidWatt) {
              // Use linear interpolation between prev and next
              suggestedValue = (prevWatt + nextWatt) / 2;
            }
          }
          
          result.isNoisy = true;
          result.noisyFields.push('watt');
          result.suggestedValues['watt'] = suggestedValue;
        }
      }
    }
    
    results.push(result);
  }
  
  return results;
}

/**
 * Fixes noisy data by replacing detected noise with suggested values
 * 
 * @param dataPoints - Original data points
 * @param options - Configuration options for noise detection
 * @returns Object with fixed data points and noise statistics
 */
export function fixSensorNoise(
  dataPoints: DataPoint[],
  options?: Partial<NoiseDetectionOptions>
): { 
  fixedData: DataPoint[], 
  stats: {
    totalPoints: number,
    noisyPoints: number,
    fixedFields: { [key: string]: number }
  }
} {
  // Default options with sensible values
  const defaultOptions: NoiseDetectionOptions = {
    maxStrokeRateDrop: 50, // 50% max drop allowed when speed is stable
    maxWattDrop: 60,       // 60% max drop allowed when speed is stable
    speedStabilityThreshold: 15, // 15% speed variation is considered stable
    minValidStrokeRate: 10,
    minValidWatt: 30
  };
  
  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  console.log('[fixSensorNoise] Starting analysis of', dataPoints.length, 'data points');
  console.log('[fixSensorNoise] Using options:', options);
  
  // Create a working copy of the data that we'll modify as we go
  const fixedData: DataPoint[] = dataPoints.map(point => ({ ...point }));
  
  let noisyPoints = 0;
  const fixedFields: { [key: string]: number } = {
    'stroke rate': 0,
    'watt': 0
  };
  
  // Helper function to access fields with different possible naming conventions
  const getValue = (point: DataPoint, fieldBase: string): number | undefined => {
    const variations = [
      fieldBase,
      fieldBase.replace(' ', '_'),
      fieldBase.replace('_', ' '),
      fieldBase.toLowerCase(),
      fieldBase.toUpperCase()
    ];
    
    for (const variant of variations) {
      if (point[variant] !== undefined) {
        return typeof point[variant] === 'number' ? point[variant] as number : undefined;
      }
    }
    
    return undefined;
  };
  
  // Helper function to set a field value
  const setValue = (point: DataPoint, fieldBase: string, value: number): void => {
    // Try to find the existing field name and use that
    const variations = [
      fieldBase,
      fieldBase.replace(' ', '_'),
      fieldBase.replace('_', ' '),
      fieldBase.toLowerCase(),
      fieldBase.toUpperCase()
    ];
    
    for (const variant of variations) {
      if (point[variant] !== undefined) {
        point[variant] = value;
        return;
      }
    }
    
    // If not found, use the original field name
    point[fieldBase] = value;
  };
  
  // Process each data point sequentially, using fixed values as we go
  for (let i = 1; i < fixedData.length; i++) {
    const currentPoint = fixedData[i];
    const prevPoint = fixedData[i - 1]; // This now contains any fixes from previous iterations
    const nextPoint = i < fixedData.length - 1 ? fixedData[i + 1] : null;
    
    // Get current and previous values (using potentially fixed previous values)
    const currentSpeed = getValue(currentPoint, 'enhanced_speed');
    const prevSpeed = getValue(prevPoint, 'enhanced_speed');
    
    if (currentSpeed === undefined || prevSpeed === undefined) {
      continue;
    }
    
    // Calculate speed variation to determine if speed is "stable"
    const speedVariation = Math.abs(
      ((currentSpeed - prevSpeed) / Math.max(prevSpeed, 0.01)) * 100
    );
    const isSpeedStable = speedVariation <= mergedOptions.speedStabilityThreshold;
    
    // Only check for noise if speed is stable and we're moving
    if (isSpeedStable && currentSpeed > 1.0) {
      let pointWasFixed = false;
      
      // Check stroke rate for noise
      const currentStrokeRate = getValue(currentPoint, 'stroke rate');
      const prevStrokeRate = getValue(prevPoint, 'stroke rate'); // This is now the FIXED previous value
      
      if (
        currentStrokeRate !== undefined && 
        prevStrokeRate !== undefined && 
        prevStrokeRate > 0
      ) {
        const strokeRateDrop = 
          ((prevStrokeRate - currentStrokeRate) / prevStrokeRate) * 100;
        
        if (
          strokeRateDrop > mergedOptions.maxStrokeRateDrop || 
          (currentStrokeRate < mergedOptions.minValidStrokeRate && prevStrokeRate > mergedOptions.minValidStrokeRate)
        ) {
          // Use the fixed previous value as the base for correction
          let suggestedValue = prevStrokeRate;
          
          // If there's a next point with a reasonable value, use interpolation
          if (nextPoint) {
            const nextStrokeRate = getValue(nextPoint, 'stroke rate');
            if (nextStrokeRate !== undefined && nextStrokeRate > mergedOptions.minValidStrokeRate) {
              // Use linear interpolation between fixed prev and next
              suggestedValue = (prevStrokeRate + nextStrokeRate) / 2;
            }
          }
          
          // Apply the fix to the working data
          setValue(currentPoint, 'stroke rate', suggestedValue);
          
          pointWasFixed = true;
          fixedFields['stroke rate'] = (fixedFields['stroke rate'] || 0) + 1;
          
          console.log(
            `[fixSensorNoise] Fixed noise in stroke rate: ${currentStrokeRate} -> ${suggestedValue} ` +
            `(drop: ${strokeRateDrop.toFixed(1)}%, speed: ${currentSpeed}, point: ${i})`
          );
        }
      }
      
      // Check watt for noise
      const currentWatt = getValue(currentPoint, 'watt');
      const prevWatt = getValue(prevPoint, 'watt'); // This is now the FIXED previous value
      
      if (
        currentWatt !== undefined && 
        prevWatt !== undefined && 
        prevWatt > 0
      ) {
        const wattDrop = ((prevWatt - currentWatt) / prevWatt) * 100;
        
        if (
          wattDrop > mergedOptions.maxWattDrop || 
          (currentWatt < mergedOptions.minValidWatt && prevWatt > mergedOptions.minValidWatt)
        ) {
          // Use the fixed previous value as the base for correction
          let suggestedValue = prevWatt;
          
          // If there's a next point with a reasonable value, use interpolation
          if (nextPoint) {
            const nextWatt = getValue(nextPoint, 'watt');
            if (nextWatt !== undefined && nextWatt > mergedOptions.minValidWatt) {
              // Use linear interpolation between fixed prev and next
              suggestedValue = (prevWatt + nextWatt) / 2;
            }
          }
          
          // Apply the fix to the working data
          setValue(currentPoint, 'watt', suggestedValue);
          
          pointWasFixed = true;
          fixedFields['watt'] = (fixedFields['watt'] || 0) + 1;
          
          console.log(
            `[fixSensorNoise] Fixed noise in watt: ${currentWatt} -> ${suggestedValue} ` +
            `(drop: ${wattDrop.toFixed(1)}%, speed: ${currentSpeed}, point: ${i})`
          );
        }
      }
      
      if (pointWasFixed) {
        noisyPoints++;
        console.log(`[fixSensorNoise] Processing noisy point ${i}/${fixedData.length}`);
      }
    }
  }
  
  console.log(`[fixSensorNoise] Noise detection completed, found ${noisyPoints} noisy points`);
  console.log(`[fixSensorNoise] Stroke Rate fixes: ${fixedFields['stroke rate']}`);
  console.log(`[fixSensorNoise] Watt fixes: ${fixedFields['watt']}`);
  
  // Return fixed data and statistics
  return {
    fixedData,
    stats: {
      totalPoints: fixedData.length,
      noisyPoints,
      fixedFields
    }
  };
}

/**
 * Example usage:
 * const fixResult = fixSensorNoise(activityData);
 * console.log(`Fixed ${fixResult.stats.noisyPoints} noisy points out of ${fixResult.stats.totalPoints}`);
 * console.log(`Stroke Rate fixes: ${fixResult.stats.fixedFields['stroke rate']}`);
 * console.log(`Watt fixes: ${fixResult.stats.fixedFields['watt']}`);
 * 
 * // Use the fixed data
 * updateChart(fixResult.fixedData);
 */
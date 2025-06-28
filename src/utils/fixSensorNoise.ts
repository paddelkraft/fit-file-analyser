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
  
  /**
   * Window size for analysis (number of points before and after to consider)
   */
  analysisWindowSize: number;
  
  /**
   * Minimum number of valid points in window to make a decision
   */
  minValidPointsInWindow: number;
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
    minValidWatt: 30,
    analysisWindowSize: 5,        // Look at 5 points before and after
    minValidPointsInWindow: 3     // Need at least 3 valid points to make decision
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
  // Default options with wider window analysis
  const defaultOptions: NoiseDetectionOptions = {
    maxStrokeRateDrop: 50,
    maxWattDrop: 60,
    speedStabilityThreshold: 15,
    minValidStrokeRate: 10,
    minValidWatt: 30,
    analysisWindowSize: 5,        // Look at 5 points before and after
    minValidPointsInWindow: 3     // Need at least 3 valid points to make decision
  };
  
  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  console.log('[fixSensorNoise] Starting sophisticated analysis of', dataPoints.length, 'data points');
  console.log('[fixSensorNoise] Using window size:', mergedOptions.analysisWindowSize);
  console.log('[fixSensorNoise] Options:', mergedOptions);
  
  // Create a working copy of the data that we'll modify as we go
  const fixedData: DataPoint[] = dataPoints.map(point => ({ ...point }));
  
  let noisyPoints = 0;
  const fixedFields: { [key: string]: number } = {
    'stroke rate': 0,
    'watt': 0
  };
  
  // Helper functions
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
  
  const setValue = (point: DataPoint, fieldBase: string, value: number): void => {
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
    point[fieldBase] = value;
  };
  
  /**
   * Analyzes a window of data around a specific point
   */
  const analyzeWindow = (
    centerIndex: number, 
    fieldName: string, 
    minValidValue: number
  ): WindowAnalysis => {
    const windowSize = mergedOptions.analysisWindowSize;
    const validValues: number[] = [];
    
    // Collect valid values from the window
    for (let i = Math.max(0, centerIndex - windowSize); 
         i <= Math.min(fixedData.length - 1, centerIndex + windowSize); 
         i++) {
      if (i === centerIndex) continue; // Skip the current point
      
      const value = getValue(fixedData[i], fieldName);
      if (value !== undefined && value >= minValidValue) {
        validValues.push(value);
      }
    }
    
    if (validValues.length === 0) {
      return {
        validValues: [],
        averageValue: 0,
        medianValue: 0,
        isConsistentlyLow: true,
        hasRecovery: false,
        trendDirection: 'stable'
      };
    }
    
    // Calculate statistics
    const sortedValues = [...validValues].sort((a, b) => a - b);
    const averageValue = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const medianValue = sortedValues[Math.floor(sortedValues.length / 2)];
    
    // Check if consistently low (most values below threshold)
    const lowValues = validValues.filter(v => v < minValidValue * 2);
    const isConsistentlyLow = lowValues.length > validValues.length * 0.6;
    
    // Check for recovery (higher values after the current point)
    let hasRecovery = false;
    for (let i = centerIndex + 1; 
         i <= Math.min(fixedData.length - 1, centerIndex + windowSize); 
         i++) {
      const value = getValue(fixedData[i], fieldName);
      if (value !== undefined && value >= minValidValue * 1.5) {
        hasRecovery = true;
        break;
      }
    }
    
    // Determine trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (validValues.length >= 3) {
      const firstHalf = validValues.slice(0, Math.floor(validValues.length / 2));
      const secondHalf = validValues.slice(Math.ceil(validValues.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const trendChange = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (trendChange > 10) trendDirection = 'up';
      else if (trendChange < -10) trendDirection = 'down';
    }
    
    return {
      validValues,
      averageValue,
      medianValue,
      isConsistentlyLow,
      hasRecovery,
      trendDirection
    };
  };
  
  /**
   * Calculates a sophisticated replacement value based on window analysis
   */
  const calculateReplacementValue = (
    centerIndex: number,
    fieldName: string,
    currentValue: number,
    minValidValue: number,
    windowAnalysis: WindowAnalysis
  ): number => {
    const { validValues, averageValue, medianValue, trendDirection, hasRecovery } = windowAnalysis;
    
    if (validValues.length === 0) {
      // Fallback to previous fixed value
      const prevValue = centerIndex > 0 ? getValue(fixedData[centerIndex - 1], fieldName) : undefined;
      return prevValue && prevValue >= minValidValue ? prevValue : minValidValue * 2;
    }
    
    // Use different strategies based on the situation
    let replacementValue: number;
    
    if (validValues.length >= mergedOptions.minValidPointsInWindow) {
      // Plenty of data, use sophisticated calculation
      
      if (hasRecovery && trendDirection === 'up') {
        // Recovery expected, use optimistic value
        replacementValue = Math.max(averageValue, medianValue);
      } else if (trendDirection === 'down') {
        // Downward trend, be more conservative
        replacementValue = Math.min(averageValue, medianValue);
      } else {
        // Stable or mixed, use weighted average of mean and median
        replacementValue = (averageValue * 0.6) + (medianValue * 0.4);
      }
      
      // Apply smoothing based on nearby values
      const prevValue = centerIndex > 0 ? getValue(fixedData[centerIndex - 1], fieldName) : undefined;
      const nextValue = centerIndex < fixedData.length - 1 ? getValue(fixedData[centerIndex + 1], fieldName) : undefined;
      
      if (prevValue !== undefined && prevValue >= minValidValue) {
        // Blend with previous value for smoothness
        replacementValue = (replacementValue * 0.7) + (prevValue * 0.3);
      }
      
      if (nextValue !== undefined && nextValue >= minValidValue && !hasRecovery) {
        // If next value is valid and no recovery expected, blend toward it
        replacementValue = (replacementValue * 0.8) + (nextValue * 0.2);
      }
      
    } else {
      // Limited data, use simpler approach
      replacementValue = validValues.length > 0 ? medianValue : minValidValue * 2;
    }
    
    // Ensure minimum bounds
    replacementValue = Math.max(replacementValue, minValidValue);
    
    // Prevent unrealistic jumps
    const prevValue = centerIndex > 0 ? getValue(fixedData[centerIndex - 1], fieldName) : undefined;
    if (prevValue !== undefined && prevValue > 0) {
      const maxJump = prevValue * 2; // Don't jump more than 2x previous value
      replacementValue = Math.min(replacementValue, maxJump);
    }
    
    return Math.round(replacementValue * 10) / 10; // Round to 1 decimal place
  };
  
  // Process each data point sequentially with window analysis
  for (let i = 1; i < fixedData.length; i++) {
    const currentPoint = fixedData[i];
    const prevPoint = fixedData[i - 1];
    
    // Get current and previous values
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
      
      // Check stroke rate for noise with window analysis
      const currentStrokeRate = getValue(currentPoint, 'stroke rate');
      const prevStrokeRate = getValue(prevPoint, 'stroke rate');
      
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
          // Perform window analysis
          const windowAnalysis = analyzeWindow(i, 'stroke rate', mergedOptions.minValidStrokeRate);
          
          // Calculate sophisticated replacement value
          const replacementValue = calculateReplacementValue(
            i, 'stroke rate', currentStrokeRate, mergedOptions.minValidStrokeRate, windowAnalysis
          );
          
          // Apply the fix
          setValue(currentPoint, 'stroke rate', replacementValue);
          
          pointWasFixed = true;
          fixedFields['stroke rate'] = (fixedFields['stroke rate'] || 0) + 1;
          
          console.log(
            `[fixSensorNoise] Fixed stroke rate: ${currentStrokeRate} -> ${replacementValue} ` +
            `(drop: ${strokeRateDrop.toFixed(1)}%, window: ${windowAnalysis.validValues.length} points, ` +
            `trend: ${windowAnalysis.trendDirection}, recovery: ${windowAnalysis.hasRecovery}, point: ${i})`
          );
        }
      }
      
      // Check watt for noise with window analysis
      const currentWatt = getValue(currentPoint, 'watt');
      const prevWatt = getValue(prevPoint, 'watt');
      
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
          // Perform window analysis
          const windowAnalysis = analyzeWindow(i, 'watt', mergedOptions.minValidWatt);
          
          // Calculate sophisticated replacement value
          const replacementValue = calculateReplacementValue(
            i, 'watt', currentWatt, mergedOptions.minValidWatt, windowAnalysis
          );
          
          // Apply the fix
          setValue(currentPoint, 'watt', replacementValue);
          
          pointWasFixed = true;
          fixedFields['watt'] = (fixedFields['watt'] || 0) + 1;
          
          console.log(
            `[fixSensorNoise] Fixed watt: ${currentWatt} -> ${replacementValue} ` +
            `(drop: ${wattDrop.toFixed(1)}%, window: ${windowAnalysis.validValues.length} points, ` +
            `trend: ${windowAnalysis.trendDirection}, recovery: ${windowAnalysis.hasRecovery}, point: ${i})`
          );
        }
      }
      
      if (pointWasFixed) {
        noisyPoints++;
      }
    }
  }
  
  console.log(`[fixSensorNoise] Sophisticated noise detection completed, found ${noisyPoints} noisy points`);
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
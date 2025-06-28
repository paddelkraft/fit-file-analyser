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
  maxStrokeRateDrop: number;
  maxWattDrop: number;
  speedStabilityThreshold: number;
  minValidStrokeRate: number;
  minValidWatt: number;
  analysisWindowSize: number;
  minValidPointsInWindow: number;
  
  // New advanced options
  multiFieldCorrelation: boolean;      // Consider correlation between stroke rate and watt
  adaptiveThresholds: boolean;         // Adjust thresholds based on activity intensity
  temporalSmoothing: boolean;          // Apply temporal smoothing to corrections
  outlierDetection: boolean;           // Use statistical outlier detection
  contextualAwareness: boolean;        // Consider workout phase (warmup, intervals, cooldown)
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
    fixedFields: { [key: string]: number },
    qualityScore: number,
    phaseAnalysis: { [key: string]: number }
  }
} {
  const defaultOptions: NoiseDetectionOptions = {
    maxStrokeRateDrop: 50,
    maxWattDrop: 60,
    speedStabilityThreshold: 15,
    minValidStrokeRate: 10,
    minValidWatt: 30,
    analysisWindowSize: 5,
    minValidPointsInWindow: 3,
    // New advanced features
    multiFieldCorrelation: true,
    adaptiveThresholds: true,
    temporalSmoothing: true,
    outlierDetection: true,
    contextualAwareness: true
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  console.log('[fixSensorNoise] Starting advanced analysis with correlation and adaptive thresholds');
  
  const fixedData: DataPoint[] = dataPoints.map(point => ({ ...point }));
  let noisyPoints = 0;
  const fixedFields: { [key: string]: number } = { 'stroke rate': 0, 'watt': 0 };
  const phaseAnalysis: { [key: string]: number } = { warmup: 0, main: 0, cooldown: 0, interval: 0, recovery: 0 };
  
  // Helper functions
  const getValue = (point: DataPoint, fieldBase: string): number | undefined => {
    const variations = [fieldBase, fieldBase.replace(' ', '_'), fieldBase.replace('_', ' ')];
    for (const variant of variations) {
      if (point[variant] !== undefined && typeof point[variant] === 'number') {
        return point[variant] as number;
      }
    }
    return undefined;
  };
  
  const setValue = (point: DataPoint, fieldBase: string, value: number): void => {
    const variations = [fieldBase, fieldBase.replace(' ', '_'), fieldBase.replace('_', ' ')];
    for (const variant of variations) {
      if (point[variant] !== undefined) {
        point[variant] = value;
        return;
      }
    }
    point[fieldBase] = value;
  };
  
  /**
   * Calculate correlation between two data series
   */
  const calculateCorrelation = (values1: number[], values2: number[]): number => {
    if (values1.length !== values2.length || values1.length < 3) return 0;
    
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  /**
   * Detect workout phase based on speed and heart rate patterns
   */
  const detectWorkoutPhase = (centerIndex: number): 'warmup' | 'main' | 'cooldown' | 'interval' | 'recovery' => {
    if (!mergedOptions.contextualAwareness) return 'main';
    
    const totalPoints = fixedData.length;
    const relativePosition = centerIndex / totalPoints;
    
    // Early phase is likely warmup
    if (relativePosition < 0.15) return 'warmup';
    
    // Late phase is likely cooldown
    if (relativePosition > 0.85) return 'cooldown';
    
    // Analyze speed and heart rate patterns for intervals
    const windowSize = Math.min(20, Math.floor(totalPoints * 0.05));
    let speedVariations = 0;
    let hrVariations = 0;
    
    for (let i = Math.max(0, centerIndex - windowSize); 
         i < Math.min(totalPoints, centerIndex + windowSize); i++) {
      
      // Check if data points exist before accessing them
      if (!fixedData[i] || !fixedData[i-1]) continue;
      
      const speed = getValue(fixedData[i], 'enhanced_speed');
      const hr = getValue(fixedData[i], 'heart_rate');
      const prevSpeed = i > 0 ? getValue(fixedData[i-1], 'enhanced_speed') : speed;
      const prevHr = i > 0 ? getValue(fixedData[i-1], 'heart_rate') : hr;
      
      if (speed !== undefined && prevSpeed !== undefined && prevSpeed > 0 && 
          Math.abs(speed - prevSpeed) > prevSpeed * 0.1) {
        speedVariations++;
      }
      if (hr !== undefined && prevHr !== undefined && Math.abs(hr - prevHr) > 10) {
        hrVariations++;
      }
    }
    
    const variationThreshold = windowSize * 0.3;
    if (speedVariations > variationThreshold || hrVariations > variationThreshold) {
      // High variation suggests intervals
      const currentSpeed = getValue(fixedData[centerIndex], 'enhanced_speed');
      
      // Calculate average speed safely
      const speedSum = fixedData.slice(Math.max(0, centerIndex - 10), centerIndex + 10)
        .map(p => p ? getValue(p, 'enhanced_speed') : undefined)
        .filter(s => s !== undefined)
        .reduce((sum, s) => sum + s!, 0);
      
      const validSpeedCount = fixedData.slice(Math.max(0, centerIndex - 10), centerIndex + 10)
        .map(p => p ? getValue(p, 'enhanced_speed') : undefined)
        .filter(s => s !== undefined).length;
      
      const avgSpeed = validSpeedCount > 0 ? speedSum / validSpeedCount : currentSpeed || 0;
      
      return currentSpeed && currentSpeed > avgSpeed * 1.1 ? 'interval' : 'recovery';
    }
    
    return 'main';
  };
  
  /**
   * Enhanced window analysis with correlation and statistical methods
   */
  const enhancedAnalyzeWindow = (
    centerIndex: number, 
    fieldName: string, 
    minValidValue: number
  ): EnhancedWindowAnalysis => {
    const windowSize = mergedOptions.analysisWindowSize;
    const validValues: number[] = [];
    const speedValues: number[] = [];
    
    // Collect values from window with proper bounds checking
    for (let i = Math.max(0, centerIndex - windowSize); 
         i <= Math.min(fixedData.length - 1, centerIndex + windowSize); 
         i++) {
      if (i === centerIndex || !fixedData[i]) continue; // Skip center point and undefined points
      
      const value = getValue(fixedData[i], fieldName);
      const speed = getValue(fixedData[i], 'enhanced_speed');
      
      if (value !== undefined && value >= minValidValue && speed !== undefined && speed > 0) {
        validValues.push(value);
        speedValues.push(speed);
      }
    }
    
    // Basic statistics with fallback values
    const averageValue = validValues.length > 0 ? 
      validValues.reduce((sum, val) => sum + val, 0) / validValues.length : minValidValue * 2;
    
    const sortedValues = [...validValues].sort((a, b) => a - b);
    const medianValue = sortedValues.length > 0 ? 
      sortedValues[Math.floor(sortedValues.length / 2)] : averageValue;
    
    // Standard deviation
    const variance = validValues.length > 1 ? 
      validValues.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / (validValues.length - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    
    // Correlation with speed - now calculateCorrelation is defined in the scope
    const correlationWithSpeed = mergedOptions.multiFieldCorrelation && validValues.length >= 3 ? 
      calculateCorrelation(validValues, speedValues) : 0;
    
    // Confidence level based on data quality
    const confidenceLevel = Math.min(1.0, validValues.length / Math.max(1, windowSize * 0.8));
    
    // Workout phase detection
    const workoutPhase = detectWorkoutPhase(centerIndex);
    
    // Intensity level
    const avgSpeed = speedValues.length > 0 ? speedValues.reduce((s, v) => s + v, 0) / speedValues.length : 0;
    const intensityLevel: 'low' | 'medium' | 'high' = 
      avgSpeed < 5 ? 'low' : avgSpeed < 10 ? 'medium' : 'high';
    
    // Other analysis (existing logic)
    const lowValues = validValues.filter(v => v < minValidValue * 2);
    const isConsistentlyLow = validValues.length > 0 ? lowValues.length > validValues.length * 0.6 : false;
    
    let hasRecovery = false;
    for (let i = centerIndex + 1; 
         i <= Math.min(fixedData.length - 1, centerIndex + windowSize); 
         i++) {
      if (!fixedData[i]) continue; // Skip undefined points
      
      const value = getValue(fixedData[i], fieldName);
      if (value !== undefined && value >= minValidValue * 1.5) {
        hasRecovery = true;
        break;
      }
    }
    
    // Trend direction with more sophisticated analysis
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (validValues.length >= 4) {
      // Linear regression to determine trend
      const indices = validValues.map((_, i) => i);
      const meanIndex = indices.reduce((s, i) => s + i, 0) / indices.length;
      
      let numerator = 0;
      let denominator = 0;
      
      for (let i = 0; i < validValues.length; i++) {
        const indexDiff = i - meanIndex;
        const valueDiff = validValues[i] - averageValue;
        numerator += indexDiff * valueDiff;
        denominator += indexDiff * indexDiff;
      }
      
      const slope = denominator !== 0 ? numerator / denominator : 0;
      const trendStrength = averageValue > 0 ? Math.abs(slope) / averageValue * 100 : 0;
      
      if (trendStrength > 5) {
        trendDirection = slope > 0 ? 'up' : 'down';
      }
    }
    
    return {
      validValues,
      averageValue,
      medianValue,
      isConsistentlyLow,
      hasRecovery,
      trendDirection,
      standardDeviation,
      confidenceLevel,
      correlationWithSpeed,
      workoutPhase,
      intensityLevel
    };
  };
  
  /**
   * Adaptive threshold calculation based on context
   */
  const getAdaptiveThresholds = (analysis: EnhancedWindowAnalysis, fieldName: string) => {
    if (!mergedOptions.adaptiveThresholds) {
      return {
        dropThreshold: fieldName === 'stroke rate' ? mergedOptions.maxStrokeRateDrop : mergedOptions.maxWattDrop,
        minValue: fieldName === 'stroke rate' ? mergedOptions.minValidStrokeRate : mergedOptions.minValidWatt
      };
    }
    
    let dropMultiplier = 1.0;
    let minValueMultiplier = 1.0;
    
    // Adjust based on workout phase
    switch (analysis.workoutPhase) {
      case 'warmup':
      case 'cooldown':
        dropMultiplier = 1.3; // More lenient during warmup/cooldown
        minValueMultiplier = 0.7;
        break;
      case 'interval':
        dropMultiplier = 0.7; // Stricter during intervals
        minValueMultiplier = 1.2;
        break;
      case 'recovery':
        dropMultiplier = 1.2; // Slightly more lenient during recovery
        minValueMultiplier = 0.8;
        break;
    }
    
    // Adjust based on intensity
    switch (analysis.intensityLevel) {
      case 'high':
        dropMultiplier *= 0.8; // Stricter at high intensity
        minValueMultiplier *= 1.3;
        break;
      case 'low':
        dropMultiplier *= 1.2; // More lenient at low intensity
        minValueMultiplier *= 0.8;
        break;
    }
    
    // Adjust based on confidence level
    if (analysis.confidenceLevel < 0.5) {
      dropMultiplier *= 1.1; // More lenient when confidence is low
    }
    
    const baseDropThreshold = fieldName === 'stroke rate' ? mergedOptions.maxStrokeRateDrop : mergedOptions.maxWattDrop;
    const baseMinValue = fieldName === 'stroke rate' ? mergedOptions.minValidStrokeRate : mergedOptions.minValidWatt;
    
    return {
      dropThreshold: baseDropThreshold * dropMultiplier,
      minValue: baseMinValue * minValueMultiplier
    };
  };
  
  /**
   * Advanced replacement value calculation with multi-field correlation
   */
  const calculateAdvancedReplacement = (
    centerIndex: number,
    fieldName: string,
    currentValue: number,
    analysis: EnhancedWindowAnalysis
  ): number => {
    let replacementValue = analysis.medianValue;
    
    // Use correlation with other fields if enabled
    if (mergedOptions.multiFieldCorrelation && Math.abs(analysis.correlationWithSpeed) > 0.3) {
      const currentSpeed = getValue(fixedData[centerIndex], 'enhanced_speed');
      
      if (currentSpeed) {
        // Calculate average speed from the window more safely
        const windowSize = mergedOptions.analysisWindowSize;
        const speedValues: number[] = [];
        
        for (let i = Math.max(0, centerIndex - windowSize); 
             i <= Math.min(fixedData.length - 1, centerIndex + windowSize); 
             i++) {
          if (i !== centerIndex && fixedData[i]) { // Check if point exists
            const speed = getValue(fixedData[i], 'enhanced_speed');
            if (speed !== undefined && speed > 0) {
              speedValues.push(speed);
            }
          }
        }
        
        const avgSpeed = speedValues.length > 0 ? 
          speedValues.reduce((sum, speed) => sum + speed, 0) / speedValues.length : 
          currentSpeed;
        
        if (avgSpeed > 0) {
          const speedRatio = currentSpeed / avgSpeed;
          const correlationAdjustment = analysis.averageValue * speedRatio * Math.abs(analysis.correlationWithSpeed);
          
          replacementValue = (replacementValue * 0.7) + (correlationAdjustment * 0.3);
        }
      }
    }
    
    // Apply temporal smoothing if enabled
    if (mergedOptions.temporalSmoothing) {
      const prevValue = centerIndex > 0 && fixedData[centerIndex - 1] ? 
        getValue(fixedData[centerIndex - 1], fieldName) : undefined;
      const nextValue = centerIndex < fixedData.length - 1 && fixedData[centerIndex + 1] ? 
        getValue(fixedData[centerIndex + 1], fieldName) : undefined;
      
      if (prevValue !== undefined && nextValue !== undefined) {
        const temporalAverage = (prevValue + nextValue) / 2;
        const smoothingWeight = Math.min(0.4, analysis.confidenceLevel);
        replacementValue = replacementValue * (1 - smoothingWeight) + temporalAverage * smoothingWeight;
      }
    }
    
    // Apply workout phase specific adjustments
    switch (analysis.workoutPhase) {
      case 'interval':
        replacementValue *= 1.1; // Expect higher values during intervals
        break;
      case 'recovery':
        replacementValue *= 0.9; // Expect lower values during recovery
        break;
    }
    
    const thresholds = getAdaptiveThresholds(analysis, fieldName);
    replacementValue = Math.max(replacementValue, thresholds.minValue);
    
    return Math.round(replacementValue * 10) / 10;
  };
  
  // Main processing loop continues as before...
  for (let i = 1; i < fixedData.length; i++) {
    const currentPoint = fixedData[i];
    const prevPoint = fixedData[i - 1];
    
    const currentSpeed = getValue(currentPoint, 'enhanced_speed');
    const prevSpeed = getValue(prevPoint, 'enhanced_speed');
    
    if (!currentSpeed || !prevSpeed) continue;
    
    const speedVariation = Math.abs(((currentSpeed - prevSpeed) / prevSpeed) * 100);
    const isSpeedStable = speedVariation <= mergedOptions.speedStabilityThreshold;
    
    if (isSpeedStable && currentSpeed > 1.0) {
      let pointWasFixed = false;
      
      // Process stroke rate with enhanced analysis
      const currentStrokeRate = getValue(currentPoint, 'stroke rate');
      const prevStrokeRate = getValue(prevPoint, 'stroke rate');
      
      if (currentStrokeRate !== undefined && prevStrokeRate !== undefined && prevStrokeRate > 0) {
        const analysis = enhancedAnalyzeWindow(i, 'stroke rate', mergedOptions.minValidStrokeRate);
        const thresholds = getAdaptiveThresholds(analysis, 'stroke rate');
        const strokeRateDrop = ((prevStrokeRate - currentStrokeRate) / prevStrokeRate) * 100;
        
        if (strokeRateDrop > thresholds.dropThreshold || 
            (currentStrokeRate < thresholds.minValue && prevStrokeRate > thresholds.minValue)) {
          
          const replacementValue = calculateAdvancedReplacement(i, 'stroke rate', currentStrokeRate, analysis);
          setValue(currentPoint, 'stroke rate', replacementValue);
          
          pointWasFixed = true;
          fixedFields['stroke rate']++;
          phaseAnalysis[analysis.workoutPhase]++;
          
          console.log(
            `[fixSensorNoise] Advanced fix - stroke rate: ${currentStrokeRate} -> ${replacementValue} ` +
            `(drop: ${strokeRateDrop.toFixed(1)}%, phase: ${analysis.workoutPhase}, ` +
            `intensity: ${analysis.intensityLevel}, confidence: ${analysis.confidenceLevel.toFixed(2)}, ` +
            `correlation: ${analysis.correlationWithSpeed.toFixed(2)}, point: ${i})`
          );
        }
      }
      
      // Process watt with enhanced analysis (similar logic)
      const currentWatt = getValue(currentPoint, 'watt');
      const prevWatt = getValue(prevPoint, 'watt');
      
      if (currentWatt !== undefined && prevWatt !== undefined && prevWatt > 0) {
        const analysis = enhancedAnalyzeWindow(i, 'watt', mergedOptions.minValidWatt);
        const thresholds = getAdaptiveThresholds(analysis, 'watt');
        const wattDrop = ((prevWatt - currentWatt) / prevWatt) * 100;
        
        if (wattDrop > thresholds.dropThreshold || 
            (currentWatt < thresholds.minValue && prevWatt > thresholds.minValue)) {
          
          const replacementValue = calculateAdvancedReplacement(i, 'watt', currentWatt, analysis);
          setValue(currentPoint, 'watt', replacementValue);
          
          pointWasFixed = true;
          fixedFields['watt']++;
          if (!pointWasFixed) phaseAnalysis[analysis.workoutPhase]++; // Don't double count
          
          console.log(
            `[fixSensorNoise] Advanced fix - watt: ${currentWatt} -> ${replacementValue} ` +
            `(drop: ${wattDrop.toFixed(1)}%, phase: ${analysis.workoutPhase}, ` +
            `intensity: ${analysis.intensityLevel}, confidence: ${analysis.confidenceLevel.toFixed(2)}, ` +
            `correlation: ${analysis.correlationWithSpeed.toFixed(2)}, point: ${i})`
          );
        }
      }
      
      if (pointWasFixed) {
        noisyPoints++;
      }
    }
  }
  
  // Calculate quality score
  const qualityScore = Math.max(0, 100 - (noisyPoints / fixedData.length * 100));
  
  console.log(`[fixSensorNoise] Advanced analysis completed with quality score: ${qualityScore.toFixed(1)}%`);
  console.log('[fixSensorNoise] Phase breakdown:', phaseAnalysis);
  
  return {
    fixedData,
    stats: {
      totalPoints: fixedData.length,
      noisyPoints,
      fixedFields,
      qualityScore,
      phaseAnalysis
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
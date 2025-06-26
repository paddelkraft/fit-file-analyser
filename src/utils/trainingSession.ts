/**
 * Training Session Data Analysis
 * 
 * This module provides comprehensive data analysis capabilities for parsed FIT training sessions.
 * It includes both generic functions that can operate on any data field by name, and specialized
 * functions for common fitness metrics.
 */

import { type IFitData } from "./fitFileParser";
import { 
  type IZone, 
  type IZoneDistributionItem, 
  calculateZoneDistribution, 
  type TimeSeriesTransforerFunction 
} from "./zones";

/**
 * Statistical summary for numeric data
 */
export interface StatisticalSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  variance: number;
  sum: number;
  q1: number;    // 25th percentile
  q3: number;    // 75th percentile
  iqr: number;   // Interquartile range
  range: number; // max - min
}


/**
 * Time-based data point for analysis
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  timer_time: number; // seconds from start
}


/**
 * Heart rate zone configuration
 */
export interface HeartRateZones {
  restingHR?: number;
  maxHR?: number;
  zones: {
    zone1: { min: number; max: number; name: string }; // Active Recovery
    zone2: { min: number; max: number; name: string }; // Aerobic Base
    zone3: { min: number; max: number; name: string }; // Aerobic
    zone4: { min: number; max: number; name: string }; // Lactate Threshold
    zone5: { min: number; max: number; name: string }; // VO2 Max
  };
}

/**
 * Training zone distribution
 */
export interface ZoneDistribution {
  zone1: { duration: number; percentage: number };
  zone2: { duration: number; percentage: number };
  zone3: { duration: number; percentage: number };
  zone4: { duration: number; percentage: number };
  zone5: { duration: number; percentage: number };
}

/**
 * Power zone configuration (for cycling/rowing)
 */
export interface PowerZones {
  ftp?: number; // Functional Threshold Power
  zones: {
    zone1: { min: number; max: number; name: string }; // Active Recovery
    zone2: { min: number; max: number; name: string }; // Endurance
    zone3: { min: number; max: number; name: string }; // Tempo
    zone4: { min: number; max: number; name: string }; // Lactate Threshold
    zone5: { min: number; max: number; name: string }; // VO2 Max
    zone6: { min: number; max: number; name: string }; // Anaerobic Capacity
    zone7: { min: number; max: number; name: string }; // Neuromuscular Power
  };
}

/**
 * GPS/Position analysis results
 */
export interface PositionAnalysis {
  totalDistance: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPace: number;        // min/km
  totalAscent: number;
  totalDescent: number;
  elevationGain: number;
  elevationLoss: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  trackPoints: number;
}

/**
 * Interval detection configuration
 */
export interface IntervalDetectionConfig {
  method: 'power' | 'heartRate' | 'speed' | 'pace' | 'manual' | 'auto';
  thresholds?: {
    high: number;      // Upper threshold for "work" intervals
    low: number;       // Lower threshold for "rest" intervals
    hysteresis?: number; // Prevents flickering between states
  };
  minDuration?: number;  // Minimum interval duration (seconds)
  maxGap?: number;      // Maximum gap to merge intervals (seconds)
  smoothing?: number;   // Moving average window size
}

/**
 * Detected interval
 */
export interface TrainingInterval {
  id: string;
  type: 'work' | 'rest' | 'warmup' | 'cooldown';
  startTime: Date;
  endTime: Date;
  duration: number;
  startIndex: number;
  endIndex: number;
  metrics: {
    avgPower?: number;
    avgHeartRate?: number;
    avgSpeed?: number;
    maxPower?: number;
    maxHeartRate?: number;
    normalizedPower?: number;
    intensityFactor?: number;
  };
  timeSeries: TimeSeriesPoint[];
}

type fieldDescription =  {
        field_name: string,
        units: string,
 //       developer_data_index: number,
 //       field_definition_number: number,
 //       fit_base_type_id: number,
      }

/**
 * Interval analysis summary
 */
export interface IntervalAnalysis {
  totalIntervals: number;
  workIntervals: number;
  restIntervals: number;
  totalWorkTime: number;
  totalRestTime: number;
  avgWorkDuration: number;
  avgRestDuration: number;
  workRestRatio: number;
  avgWorkIntensity: number;
  avgRestIntensity: number;
  detectionMethod: string;
  confidence: number; // 0-1 score for detection quality
}

/**
 * Comprehensive Training Session Data Analyzer
 * 
 * Provides both generic data analysis functions and specialized fitness metrics analysis.
 */
export class TrainingSession {
  private fitData: IFitData;
  private records: Array<Record<string, any>>;
  private sessionData: Record<string, any>;
  private field_descriptions: fieldDescription[];
  

  constructor(fitData: IFitData, sessionIndex: number = 0) {
    this.fitData = fitData;
    
    // Extract session data (handle both cascade and standard modes)
    this.sessionData = this.extractSessionData(sessionIndex);
    
    // Extract records (detailed time-series data)
    this.records = this.extractRecords(sessionIndex);
    // @ts-ignore
    this.field_descriptions = fitData.activity?.field_descriptions || [];

    //add field descriptions for standard fields
    this.field_descriptions.push(
      { field_name: "timestamp", units: "s" },
      { field_name: "timer_time", units: "s" },
      { field_name: "positionLat", units: "degrees" },
      { field_name: "positionLong", units: "degrees" },
      { field_name: "altitude", units: "m" },
      { field_name: "heart_rate", units: "bpm" },
      { field_name: "distance", units: "km" },
      { field_name: "enhanced_speed", units: "km/h" },
      { field_name: "timer_time", units: "s" },
      { field_name: "speed", units: "km/h" },
      { field_name: "power", units: "watts" },
      { field_name: "cadence", units: "rpm" },
      { field_name: "position_lat", units: "degrees" },
      { field_name: "position_long", units: "degrees" },
      { field_name: "battery_level", units: "%" },
      { field_name: "start_time", units: "" },
      { field_name: "start_position_lat", units: "degrees" },
      { field_name: "start_position_long", units: "degrees" },
      { field_name: "total_timer_time", units: "s" },
      { field_name: "total_distance", units: "km" },
      { field_name: "enhanced_avg_speed", units: "km/h" },
      { field_name: "enhanced_max_speed", units: "km/h" },
      { field_name: "total_calories", units: "kcal" },
      { field_name: "event_type", units: "" },
      { field_name: "sport", units: "" },
      { field_name: "sub_sport", units: "" },
      { field_name: "avg_heart_rate", units: "bpm" },
      { field_name: "max_heart_rate", units: "bpm" },
      { field_name: "total_training_effect", units: "" },
      { field_name: "total_anaerobic_effect", units: "" },
      { field_name: "stroke rate avg", units: "Strokes/Min" },
      { field_name: "average watt", units: "Joule/S" },
      { field_name: "average balance", units: "Power Disb. [%]" },
      { field_name: "avg hipRot", units: "Degrees/s" },
      { field_name: "avg boatJump", units: "Degrees/s" },
      { field_name: "total strokes", units: "Stroke" },
      { field_name: "avg Meter/S", units: "Meter/Stroke" },
      { field_name: "end_position_lat", units: "degrees" },
      { field_name: "end_position_long", units: "degrees" }
    );
                     
  }

  getSessionSummary(): Record<string, any> {
    // all primitive values on the root level of the sessionData
    const summary: Record<string, any> = {};
    Object.entries(this.sessionData).forEach(([key, value]) => {
      if (typeof value !== 'object' && value !== null) {
        // Check if the value is a primitive type (string, number, boolean)
        summary[key] = value;
      }
    });  
    return summary;
  }

  getFieldUnit(fieldName: string): string | "" {
    const fieldDesc = this.field_descriptions.find(desc => desc.field_name === fieldName);
    return fieldDesc ? fieldDesc.units : "";
  }



  // ===============================
  // GENERIC DATA ANALYSIS FUNCTIONS
  // ===============================

  /**
   * Get all unique field names available in the records
   */
  getAvailableFields(): string[] {
    const fields = new Set<string>();
    this.records.forEach(record => {
      Object.keys(record).forEach(key => fields.add(key));
    });
    return Array.from(fields).sort();
  }

  /**
   * Extract numeric values for a specific field from all records
   */
  getFieldValues(fieldName: string): number[] {
    return this.records
      .map(record => record[fieldName])
      .filter(value => typeof value === 'number' && !isNaN(value));
  }

  /**
   * Extract time-series data for a specific field
   */
  getFieldTimeSeries(fieldName: string): TimeSeriesPoint[] {
    if (!this.getAvailableFields().includes(fieldName)) {
      console.error(`⚠️ Field "${fieldName}" not found in records.`);
      throw new Error(`Field "${fieldName}" does not exist in the training session data.`);
    }
    const timeSeries = this.records
      
      .map(record => {
        const timer_time = record.timer_time ;
        const value = record[fieldName]? record[fieldName] : 0; // Default to 0 if field is missing
        return {
          timestamp: new Date(record.timestamp),
          value,
          timer_time
        };
      });
    return timeSeries;
  }

  getAllRecords(){
     return this.records;
  }


  transformFieldTimeSeries(fieldName: string, transformer:TimeSeriesTransforerFunction): TimeSeriesPoint [] {
    const timeSeries = this.getFieldTimeSeries(fieldName);
    if (timeSeries.length === 0) return [];

    return timeSeries.map((point,index, array) => {
      const transformedValue = transformer(point,index, array);
      return transformedValue;
    });
  }

  /**
   * Calculate comprehensive statistics for any numeric field
   */
  calculateFieldStatistics(fieldName: string): StatisticalSummary | null {
    const values = this.getFieldValues(fieldName);
    if (values.length === 0) return null;

    return this.calculateStatistics(values);
  }

  /**
   * Get field value at a specific time or percentage through the session
   */
  getFieldValueAtTime(fieldName: string, timeOrPercentage: number, isPercentage: boolean = false): number | null {
    const timeSeries = this.getFieldTimeSeries(fieldName);
    if (timeSeries.length === 0) return null;

    let targetTime: number;
    if (isPercentage) {
      const totalDuration = this.getTotalDuration();
      targetTime = totalDuration * (timeOrPercentage / 100);
    } else {
      targetTime = timeOrPercentage;
    }

    // Find closest time point
    let closest = timeSeries[0];
    let minDiff = Math.abs((closest.timer_time || 0) - targetTime);

    for (const point of timeSeries) {
      const diff = Math.abs((point.timer_time || 0) - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest.value;
  }

  /**
   * Calculate moving average for any field
   */
  calculateFieldMovingAverage(fieldName: string, windowSize: number = 30): TimeSeriesPoint[] {
    const timeSeries = this.getFieldTimeSeries(fieldName);
    if (timeSeries.length < windowSize) return timeSeries;

    const result: TimeSeriesPoint[] = [];
    
    for (let i = windowSize - 1; i < timeSeries.length; i++) {
      const window = timeSeries.slice(i - windowSize + 1, i + 1);
      const avgValue = window.reduce((sum, point) => sum + point.value, 0) / window.length;
      
      result.push({
        timestamp: timeSeries[i].timestamp,
        value: avgValue,
        timer_time: timeSeries[i].timer_time
      });
    }

    return result;
  }

  /**
   * Find peaks in any numeric field
   */
  findFieldPeaks(fieldName: string, minProminence: number = 0.1): TimeSeriesPoint[] {
    const timeSeries = this.getFieldTimeSeries(fieldName);
    if (timeSeries.length < 3) return [];

    const peaks: TimeSeriesPoint[] = [];
    
    for (let i = 1; i < timeSeries.length - 1; i++) {
      const current = timeSeries[i];
      const prev = timeSeries[i - 1];
      const next = timeSeries[i + 1];

      // Check if it's a local maximum
      if (current.value > prev.value && current.value > next.value) {
        // Check prominence (how much it stands out)
        const prominence = Math.min(
          current.value - prev.value,
          current.value - next.value
        );
        
        if (prominence >= minProminence) {
          peaks.push(current);
        }
      }
    }

    return peaks;
  }

  /**
   * calculate time/percentage distribution of a field across zones
   * @param fieldName 
   * @param zones 
   * @returns 
   */
  getFieldZoneDistribution(fieldName: string, zones: IZone[]):IZoneDistributionItem[] {
    const timeSeries = this.getFieldTimeSeries(fieldName)
    const zoneDistribution = calculateZoneDistribution(timeSeries , zones)
    return  zoneDistribution
  }

  /**
   * Calculate correlation between two fields
   */
  calculateFieldCorrelation(field1: string, field2: string): number | null {
    
    // Ensure we have matching data points
    const pairs: Array<[number, number]> = [];
    this.records.forEach(record => {
      const val1 = record[field1];
      const val2 = record[field2];
      if (typeof val1 === 'number' && typeof val2 === 'number' && 
          !isNaN(val1) && !isNaN(val2)) {
        pairs.push([val1, val2]);
      }
    });

    if (pairs.length < 2) return null;

    const n = pairs.length;
    const sum1 = pairs.reduce((sum, [x, _]) => sum + x, 0);
    const sum2 = pairs.reduce((sum, [_, y]) => sum + y, 0);
    const sum1Sq = pairs.reduce((sum, [x, _]) => sum + x * x, 0);
    const sum2Sq = pairs.reduce((sum, [_, y]) => sum + y * y, 0);
    const sumProducts = pairs.reduce((sum, [x, y]) => sum + x * y, 0);

    const numerator = n * sumProducts - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // ===================================
  // SPECIALIZED FITNESS ANALYSIS FUNCTIONS
  // ===================================

  /**
   * Get comprehensive heart rate analysis
   */
  getHeartRateAnalysis(zones: IZone[]): {
    statistics: StatisticalSummary | null;
    timeSeries: TimeSeriesPoint[];
    zoneDistribution?: IZoneDistributionItem[];
      } {
    // Try both common heart rate field names
    let statistics = this.calculateFieldStatistics('heartRate');
    let timeSeries = this.getFieldTimeSeries('heartRate');
    let zoneDistribution =  this.getFieldZoneDistribution('heartRate', zones);
    
    if (!statistics || timeSeries.length === 0) {
      statistics = this.calculateFieldStatistics('heart_rate');
      timeSeries = this.getFieldTimeSeries('heart_rate');
      zoneDistribution =  this.getFieldZoneDistribution('heart_rate', zones);
    }

    const result: any = { statistics, timeSeries, zoneDistribution };

    

    return result;
  }

  /**
   * Get comprehensive speed/pace analysis
   */
  getSpeedAnalysis(): {
    statistics: StatisticalSummary | null;
    timeSeries: TimeSeriesPoint[];
    paceTimeSeries: TimeSeriesPoint[];
    avgPace: number | null;
    splits?: Array<{ km: number; time: number; pace: number }>;
  } {
    const statistics = this.calculateFieldStatistics('speed');
    const timeSeries = this.getFieldTimeSeries('speed');
    
    // Convert speed to pace (min/km)
    const paceTimeSeries = timeSeries.map(point => ({
      ...point,
      value: point.value > 0 ? 60 / point.value : 0 // min/km
    }));

    const avgPace = statistics?.mean ? 60 / statistics.mean : null;

    return {
      statistics,
      timeSeries,
      paceTimeSeries,
      avgPace,
      splits: this.calculateKilometerSplits()
    };
  }

  /**
   * Get power analysis (for cycling/rowing/)
   */
  getPowerAnalysis(zones?: PowerZones): {
    statistics: StatisticalSummary | null;
    timeSeries: TimeSeriesPoint[];
    normalizedPower?: number;
    intensityFactor?: number;
    trainingStressScore?: number;
    zoneDistribution?: any;
  } {
    const statistics = this.calculateFieldStatistics('power');
    const timeSeries = this.getFieldTimeSeries('power');

    const result: any = { statistics, timeSeries };

    if (statistics && timeSeries.length > 0) {
      result.normalizedPower = this.calculateNormalizedPower(timeSeries);
      
      if (zones?.ftp) {
        result.intensityFactor = result.normalizedPower / zones.ftp;
        result.trainingStressScore = this.calculateTrainingStressScore(
          result.normalizedPower, 
          zones.ftp, 
          this.getTotalDuration()
        );
        result.zoneDistribution = this.calculatePowerZoneDistribution(zones);
      }
    }

    return result;
  }

  /**
   * Get GPS/position analysis
   */
  getPositionAnalysis(): PositionAnalysis | null {
    const latValues = this.getFieldValues('positionLat');
    const lonValues = this.getFieldValues('positionLong');
    
    if (latValues.length === 0 || lonValues.length === 0) return null;

    // Calculate bounds
    const bounds = {
      north: Math.max(...latValues),
      south: Math.min(...latValues),
      east: Math.max(...lonValues),
      west: Math.min(...lonValues)
    };

    // Calculate distance and elevation
    let totalDistance = 0;
    let totalAscent = 0;
    let totalDescent = 0;

    const positions = this.records
      .filter(r => r.positionLat && r.positionLong)
      .map(r => ({
        lat: r.positionLat,
        lon: r.positionLong,
        alt: r.altitude || 0,
        timestamp: r.timestamp
      }));

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      // Calculate distance between points
      const distance = this.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      totalDistance += distance;

      // Calculate elevation change
      if (prev.alt && curr.alt) {
        const elevChange = curr.alt - prev.alt;
        if (elevChange > 0) {
          totalAscent += elevChange;
        } else {
          totalDescent += Math.abs(elevChange);
        }
      }
    }

    const speedStats = this.calculateFieldStatistics('speed');
    
    return {
      totalDistance,
      avgSpeed: speedStats?.mean || 0,
      maxSpeed: speedStats?.max || 0,
      avgPace: speedStats?.mean ? 60 / speedStats.mean : 0,
      totalAscent,
      totalDescent,
      elevationGain: totalAscent,
      elevationLoss: totalDescent,
      bounds,
      trackPoints: positions.length
    };
  }

  /**
   * Get cadence analysis
   */
  getCadenceAnalysis(): {
    statistics: StatisticalSummary | null;
    timeSeries: TimeSeriesPoint[];
    avgCadence: number | null;
  } {
    const statistics = this.calculateFieldStatistics('cadence');
    const timeSeries = this.getFieldTimeSeries('cadence');

    return {
      statistics,
      timeSeries,
      avgCadence: statistics?.mean || null
    };
  }

  

  



  
  
  // ===============================
  // PRIVATE HELPER METHODS
  // ===============================

  private extractSessionData(sessionIndex: number): Record<string, any> {
    // Handle standard mode (root level sessions)
    if (this.fitData.sessions?.[sessionIndex]) {
      return this.fitData.sessions[sessionIndex] as Record<string, any>;
    }
    
    // Handle cascade mode (if activity structure exists)
    if ((this.fitData as any).activity?.sessions?.[sessionIndex]) {
      return (this.fitData as any).activity.sessions[sessionIndex];
    }
    
    return {};
  }

  private extractRecords(sessionIndex: number): Array<Record<string, any>> {
    // Handle standard mode (root level records)
    if (this.fitData.records && this.fitData.records.length > 0) {
      return this.fitData.records as Array<Record<string, any>>;
    }
    
    // Handle cascade mode (session.laps[].records)
    if ((this.fitData as any).activity?.sessions?.[sessionIndex]?.laps) {
      const laps = (this.fitData as any).activity.sessions[sessionIndex].laps;
      const allRecords: Array<Record<string, any>> = [];
      laps.forEach((lap: any) => {
        if (lap.records) {
          allRecords.push(...lap.records);
        }
      });
      return allRecords;
    }
    
    return [];
  }


  private getTotalDuration(): number {
    const sessionTime = this.sessionData.totalTimerTime || this.sessionData.total_timer_time;
    if (sessionTime) return sessionTime;

    // Calculate from records
    if (this.records.length < 2) return 0;
    const firstRecord = this.records[0];
    const lastRecord = this.records[this.records.length - 1];
    
    return Math.floor((lastRecord.timestamp.getTime() - firstRecord.timestamp.getTime()) / 1000);
  }

  private calculateStatistics(values: number[]): StatisticalSummary {
    if (values.length === 0) {
      throw new Error("Cannot calculate statistics for empty array");
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const std = Math.sqrt(variance);
    
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    const q1 = sorted[Math.floor(count * 0.25)];
    const q3 = sorted[Math.floor(count * 0.75)];
    
    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      median,
      std,
      variance,
      sum,
      q1,
      q3,
      iqr: q3 - q1,
      range: sorted[count - 1] - sorted[0]
    };
  }

  

  private calculatePowerZoneDistribution(zones: PowerZones): any {
    const powerTimeSeries = this.getFieldTimeSeries('power');
    const totalDuration = this.getTotalDuration();
    
    const zoneTime = {
      zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, zone6: 0, zone7: 0
    };

    powerTimeSeries.forEach(point => {
      const power = point.value;
      if (power >= zones.zones.zone1.min && power <= zones.zones.zone1.max) zoneTime.zone1++;
      else if (power >= zones.zones.zone2.min && power <= zones.zones.zone2.max) zoneTime.zone2++;
      else if (power >= zones.zones.zone3.min && power <= zones.zones.zone3.max) zoneTime.zone3++;
      else if (power >= zones.zones.zone4.min && power <= zones.zones.zone4.max) zoneTime.zone4++;
      else if (power >= zones.zones.zone5.min && power <= zones.zones.zone5.max) zoneTime.zone5++;
      else if (power >= zones.zones.zone6.min && power <= zones.zones.zone6.max) zoneTime.zone6++;
      else if (power >= zones.zones.zone7.min && power <= zones.zones.zone7.max) zoneTime.zone7++;
    });

    return Object.fromEntries(
      Object.entries(zoneTime).map(([zone, duration]) => [
        zone, 
        { duration, percentage: (duration / totalDuration) * 100 }
      ])
    );
  }

 
  

  /**
   * Calculate normalized power for a time series (specialized version)
   */
  calculateNormalizedPowerForSeries(timeSeries: TimeSeriesPoint[]): number {
    if (timeSeries.length === 0) return 0;
    
    // Filter out invalid power values
    const validSeries = timeSeries.filter(point => 
      point.value !== null && point.value !== undefined && point.value > 0
    );
    
    if (validSeries.length === 0) return 0;
    
    return this.calculateNormalizedPower(validSeries);
  }

  

  


  



  

  /**
   * Calculate normalized power
   */
  private calculateNormalizedPower(powerTimeSeries: TimeSeriesPoint[]): number {
    if (powerTimeSeries.length === 0) return 0;

    // Calculate 30-second moving average
    const movingAvg = this.calculateFieldMovingAverage('power', 30);
    
    // Raise each value to the 4th power
    const fourthPowers = movingAvg.map(point => Math.pow(point.value, 4));
    
    // Calculate mean of 4th powers
    const meanFourthPower = fourthPowers.reduce((sum, val) => sum + val, 0) / fourthPowers.length;
    
    // Take 4th root
    return Math.pow(meanFourthPower, 1/4);
  }

  /**
   * Calculate training stress score
   */
  private calculateTrainingStressScore(normalizedPower: number, ftp: number, duration: number): number {
    const intensityFactor = normalizedPower / ftp;
    return (duration * normalizedPower * intensityFactor) / (ftp * 3600) * 100;
  }

  /**
   * Calculate kilometer splits
   */
  private calculateKilometerSplits(): Array<{ km: number; time: number; pace: number }> {
    const distanceField = this.getFieldTimeSeries('distance');
    if (distanceField.length === 0) return [];

    const splits: Array<{ km: number; time: number; pace: number }> = [];
    let currentKm = 1;
    let lastSplitTime = 0;

    for (const point of distanceField) {
      if (point.value >= currentKm * 1000) { // Convert km to meters
        const splitTime = (point.timer_time || 0) - lastSplitTime;
        const pace = splitTime / 60; // minutes per km
        
        splits.push({
          km: currentKm,
          time: splitTime,
          pace
        });

        lastSplitTime = point.timer_time || 0;
        currentKm++;
      }
    }

    return splits;
  }

  /**
   * Calculate distance between GPS coordinates
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  sessionTextSummary():string{
    return this.asTextSummary(this.sessionData, "Session");
  }

  lapTextSummary(lap:number):string{
    return this.asTextSummary(this.sessionData.laps[lap], "Lap");
  }
    

  private asTextSummary(session:Object,entity: "Session"|"Lap" = "Session"):string{
    // Generate a summary of the training session
    //extract the summary attributes from the session object
    //@ts-ignore
    const ignoreTheseAttributes = [
        "timestamp",
        "message_index",
        "total_elapsed_time",
        "event",
        "total_cycles",
        "first_lap_index",
        "num_laps",
        "left_right_balance",
        "trigger",
        "laps",
        "records",
        "nec_lat",
        "nec_long",
        "swc_lat",
        "swc_long"
    ] 

    // Format the summary as a string
    const summaryString = 
    `${entity} Summary:\n`+
    `_______________________________________\n` +
     
    
    Object.entries(session).filter(
        ([key, value]) => ignoreTheseAttributes.includes(key) === false && value !== undefined && value !== null
    ).map(([key, value]) => {
        
        // if nota a gps value, and number round to two decimals
        if (typeof value === 'number' && !key.includes('position')) {
            value = value.toFixed(2);
        }
        const unit = this.getFieldUnit(key);

        return `${key}: ${value}${unit ? ` (${unit})` : ''}`;
    }).join('\n') 

    + `\n_______________________________________\n` 
    return summaryString;
  }
}


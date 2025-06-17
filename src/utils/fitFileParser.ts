//@ts-ignore
import  FitParser  from 'fit-file-parser';
/**
 * FIT File Parser
 * 
 * This module provides functions to parse FIT files using the fit-file-parser package
 .
 * 
 * @module fitParser
 */



/**
 * Represents parsed FIT file data
 */
export interface IFitData {
  /** File header information */
  fileHeader?: {
    protocolVersion: number;
    profileVersion: number;
    dataSize: number;
    dataType: string;
    crc: number;
  };
  /** Session data */
  sessions?: Array<{
    startTime: Date;
    totalElapsedTime: number;
    totalTimerTime: number;
    totalDistance: number;
    sport: string;
    subSport?: string;
    avgSpeed?: number;
    maxSpeed?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    avgCadence?: number;
    maxCadence?: number;
    totalCalories?: number;
    [key: string]: unknown;
  }>;
  /** Record data (GPS points, sensor data, etc.) */
  records?: Array<{
    timestamp: Date;
    positionLat?: number;
    positionLong?: number;
    altitude?: number;
    speed?: number;
    heartRate?: number;
    cadence?: number;
    power?: number;
    temperature?: number;
    [key: string]: unknown;
  }>;
  /** Activity data */
  activities?: Array<{
    timestamp: Date;
    totalTimerTime: number;
    numSessions: number;
    type: string;
    event: string;
    [key: string]: unknown;
  }>;
  /** Lap data */
  laps?: Array<{
    timestamp: Date;
    startTime: Date;
    totalElapsedTime: number;
    totalTimerTime: number;
    totalDistance: number;
    avgSpeed?: number;
    maxSpeed?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    [key: string]: unknown;
  }>;
  /** Events */
  events?: Array<{
    timestamp: Date;
    event: string;
    eventType: string;
    data?: number;
    [key: string]: unknown;
  }>;
  /** Device information */
  deviceInfos?: Array<{
    timestamp: Date;
    manufacturer: string;
    product: string;
    serialNumber?: number;
    softwareVersion?: string;
    hardwareVersion?: string;
    [key: string]: unknown;
  }>;
  /** Raw parsed data */
  [key: string]: unknown;
}

/**
 * Parse FIT data from various input types
 * 
 * @param data - The FIT file data as ArrayBuffer, Uint8Array, or other binary format
 * @returns Promise resolving to parsed FIT data
 */
export function parseFitData(data: ArrayBuffer | Uint8Array | string): Promise<IFitData> {
  return new Promise((resolve, reject) => {
    try {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'cascade'
      });

      // Handle different input types
      let arrayBuffer: ArrayBuffer;
      
      if (data instanceof ArrayBuffer) {
        // Already an ArrayBuffer
        arrayBuffer = data;
      } else if (data instanceof Uint8Array) {
        // Convert Uint8Array to ArrayBuffer
        arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else if (typeof data === 'string') {
        // Convert string to ArrayBuffer (if it's base64 or similar)
        const binaryString = window.atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        throw new Error('Unsupported data type. Expected ArrayBuffer, Uint8Array, or base64 string');
      }
      
      // Parse the data
      fitParser.parse(arrayBuffer, (error: string | null, result: unknown) => {
        if (error) {
          reject(new Error(`Failed to parse FIT data: ${error}`));
        } else {
          resolve(result as IFitData);
        }
      });
    } catch (error) {
      reject(new Error(`Failed to parse FIT data: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}



/**
 * Extract summary information from parsed FIT data
 * 
 * @param fitData - Parsed FIT data
 * @returns Summary object with key metrics
 * 
 * @example
 * ```typescript
 * const fitData = await parseFitFile("activity.fit");
 * const summary = extractSummary(fitData);
 * console.log(`Activity: ${summary.sport}, Distance: ${summary.totalDistance} km`);
 * ```
 */
export function extractSummary(fitData: IFitData) {
  // Handle both cascade mode (fitData.activity.sessions) and non-cascade mode (fitData.sessions)
  interface CascadeActivity {
    sessions?: Record<string, unknown>[];
    records?: Record<string, unknown>[];
    laps?: Record<string, unknown>[];
    device_infos?: Record<string, unknown>[];
    timestamp?: Date;
  }
  
  interface CascadeData extends IFitData {
    activity?: CascadeActivity;
  }
  
  const cascadeData = fitData as CascadeData;
  const session = fitData.sessions?.[0] || cascadeData.activity?.sessions?.[0];
  const activity = fitData.activities?.[0];
  
  // For records, check both locations
  const records = fitData.records || cascadeData.activity?.records || [];
  const laps = fitData.laps || cascadeData.activity?.laps || (session as Record<string, unknown>)?.laps || [];
  const deviceInfos = fitData.deviceInfos || cascadeData.activity?.device_infos || [];
  
  // Get session data with proper type handling
  const sessionData = session as Record<string, unknown> | undefined;
  
  return {
    sport: (sessionData?.sport as string) || 'unknown',
    subSport: (sessionData?.sub_sport as string) || (sessionData?.subSport as string),
    startTime: (sessionData?.start_time as Date) || (sessionData?.startTime as Date) || activity?.timestamp,
    totalDistance: (sessionData?.total_distance as number) || (sessionData?.totalDistance as number) || 0,
    totalElapsedTime: (sessionData?.total_elapsed_time as number) || (sessionData?.totalElapsedTime as number) || 0,
    totalTimerTime: (sessionData?.total_timer_time as number) || (sessionData?.totalTimerTime as number) || 0,
    avgSpeed: (sessionData?.enhanced_avg_speed as number) || (sessionData?.avg_speed as number) || (sessionData?.avgSpeed as number),
    maxSpeed: (sessionData?.enhanced_max_speed as number) || (sessionData?.max_speed as number) || (sessionData?.maxSpeed as number),
    avgHeartRate: (sessionData?.avg_heart_rate as number) || (sessionData?.avgHeartRate as number),
    maxHeartRate: (sessionData?.max_heart_rate as number) || (sessionData?.maxHeartRate as number),
    avgCadence: (sessionData?.avg_cadence as number) || (sessionData?.avgCadence as number),
    maxCadence: (sessionData?.max_cadence as number) || (sessionData?.maxCadence as number),
    totalCalories: (sessionData?.total_calories as number) || (sessionData?.totalCalories as number),
    recordCount: records.length,
    lapCount: Array.isArray(laps) ? laps.length : 0,
    deviceInfo: Array.isArray(deviceInfos) && deviceInfos.length > 0 ? deviceInfos[0] : undefined
  };
}

/**
 * Convert parsed FIT data to GeoJSON format for mapping applications
 * 
 * @param fitData - Parsed FIT data
 * @returns GeoJSON FeatureCollection with track data
 * 
 * @example
 * ```typescript
 * const fitData = await parseFitFile("activity.fit");
 * const geoJson = toGeoJSON(fitData);
 * // Use with mapping libraries like Leaflet or MapBox
 * ```
 */
export function toGeoJSON(fitData: IFitData) {
  const coordinates: number[][] = [];
  const properties: Array<Record<string, unknown>> = [];

  fitData.records?.forEach(record => {
    if (record.positionLat && record.positionLong) {
      coordinates.push([record.positionLong, record.positionLat]);
      properties.push({
        timestamp: record.timestamp,
        altitude: record.altitude,
        speed: record.speed,
        heartRate: record.heartRate,
        cadence: record.cadence,
        power: record.power,
        temperature: record.temperature
      });
    }
  });

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates
        },
        properties: {
          sport: fitData.sessions?.[0]?.sport,
          totalDistance: fitData.sessions?.[0]?.totalDistance,
          startTime: fitData.sessions?.[0]?.startTime,
          pointProperties: properties
        }
      }
    ]
  };
}

// Export default object with all functions for convenience
export default {
  parseFitData,
  extractSummary,
  toGeoJSON
};
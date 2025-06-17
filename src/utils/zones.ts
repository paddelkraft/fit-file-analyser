// a file containing  training zone distribuion definitions
import { type TimeSeriesPoint } from "./trainingSession";

export interface IZone { min: number; max: number; name: string }

export interface IZoneDuration {
  zone: IZone;
  duration: number; // in seconds 
}



export interface IZoneDistributionItem {
  zone: IZone;
  duration: number;
  percentage: number;
  
}

export type TimeSeriesTransforerFunction = (point: TimeSeriesPoint, index: number, timeSeries: TimeSeriesPoint[]) => TimeSeriesPoint


export const hrZones: IZone[] = [
  { min: 0, max: 137, name: 'Zone 1 - Recovery' },
    { min: 138, max: 153, name: 'Zone 2 - Endurance' },
    { min: 154, max: 163, name: 'Zone 3 - Aerobic' },
    { min: 164, max: 172, name: 'Zone 4 - Threshold' },
    { min: 173, max: Infinity, name: 'Zone 5 - VO2 Max' }
]


export const kayakPowerZones: IZone[] = [
    { min: 0, max: 100, name: 'Zone 1 - Recovery' },
    { min: 101, max: 150, name: 'Zone 2 - Endurance' },
    { min: 151, max: 200, name: 'Zone 3 - Aerobic' },
    { min: 201, max: 230, name: 'Zone 4 - Threshold' },
    { min: 231, max: Infinity, name: 'Zone 5 - Anaerobic' }
];

export const strokeRateZones: IZone[] = [
    { min: 0, max: 55, name: 'Zone 1 - Vila' },
    { min: 56, max: 70, name: 'Zone 2 - Distans' },
    { min: 71, max: 85, name: 'Zone 3 - Tröskel' },
    { min: 86, max: 100, name: 'Zone 4 - Forserat' },
    { min: 101, max: Infinity, name: 'Zone 5 - Sprint' }
]

export const speedZones: IZone[] = [
    { min:0, max: 8, name: "Zone 1 - Easy"},
    { min:8, max: 11, name: "Zone 2 - Endurance"},
    { min:11, max: 13.5, name: "Zone 3 - Threshold"},
    { min:13.5, max: 16, name: "Zone 4 - Anaerobic"},
    { min:16, max: Infinity, name: "Zone 5 - Sprint"}
]

type AllValuesOfType<t> = {
  [key: string]: t;
};


export function  calculateZoneDistribution(
       timeSeries: TimeSeriesPoint[], 
       zones: IZone[]
    ): IZoneDistributionItem[] {
    
    const zoneTime:AllValuesOfType<number> = {}
    
    

    let previousDuration = 0;
    
    timeSeries.forEach(point => {
      const value = point.value;
      const currentDuration = point.timer_time - previousDuration; // Calculate duration since last point
      previousDuration = point.timer_time; // Update previous duration
        zones.forEach(zone => {
            if (value >= zone.min && value <= zone.max) {
            if (!zoneTime[zone.name]) {
                zoneTime[zone.name] = 0; // Initialize if not already set
            }
            zoneTime[zone.name] += currentDuration as number // Add duration to the appropriate zone
            }
        });
    });
    
    
    const totalDuration = timeSeries[timeSeries.length - 1].timer_time - timeSeries[0].timer_time;
    const zoneNames = zones.map(zone => zone.name);
    
    const zoneDistribution: IZoneDistributionItem[] = zoneNames.map(zoneName => {
        //@ts-ignore
        const duration = zoneTime[zoneName] || 0;
        const percentage = (duration / totalDuration) * 100;

        return {
            zone: zones.find(zone => zone.name === zoneName)!,
            duration,
            percentage
        };
    });

    return zoneDistribution;

  }


    /**
     * Creates a transformer function to calculate the rate of change (acceleration) of a value
     * across a specified window of time series points.
     *
     * @param window - The size of the window (number of points) used to calculate the rate of change.
     *                 Defaults to 5 if not specified.
     * @returns A function that takes a time series point, its index, and the entire time series,
     *          and returns a new time series point with the calculated rate of change as its value.
     *
     * The returned function calculates the rate of change by:
     * - Determining the difference in value between the current point and the point at the end of the window.
     * - Determining the difference in time between the current point and the point at the end of the window.
     * - Dividing the value difference by the time difference to compute the rate of change.
     *
     * @example
     * ```typescript
     * const transformer = getChangeRateTransformer(5);
     * const transformedPoint = transformer(currentPoint, index, timeSeries);
     * console.log(transformedPoint.value); // Outputs the calculated rate of change
     * ```
     */
    export function getChangeRateTransformer(
        window: number = 5
    ): (point: TimeSeriesPoint, index: number, timeSeries: TimeSeriesPoint[]) => TimeSeriesPoint {
        // function to calculate acceleration across a window of timeSeries Points
        return (
            { value, timestamp, timer_time }: TimeSeriesPoint,
            index: number,
            timeSeries: TimeSeriesPoint[]
        ): TimeSeriesPoint => {
            const endOfWindowIndex = Math.min(Math.max(index + window, 0), timeSeries.length - 1);
            const endOfWindow = timeSeries[endOfWindowIndex];
            const valueDiff = endOfWindow.value - value;
            const timeDiff = (endOfWindow.timer_time - timer_time)|| 1;
            const changeRate = Math.floor((valueDiff / timeDiff)* 100) ;

            return {
                timestamp,
                timer_time,
                value: changeRate
            };
        };
    }

    /**
     * generates a histogram of distribution
     * @param zoneDistribution 
     */
    export function asTextBasedHistogram(zoneDistribution: IZoneDistributionItem[]): string {
        const filledSquares = '█'.repeat(100);
        const maxZoneNameLength = Math.max(...zoneDistribution.map(item => item.zone.name.length));
        const histogram = zoneDistribution.map(zoneDistributionItem => {
            const paddedZoneName = zoneDistributionItem.zone.name.padEnd(maxZoneNameLength, ' ');

            return ` ${paddedZoneName} ${asTimeString(zoneDistributionItem.duration)} : ${filledSquares.slice(0, Math.floor(zoneDistributionItem.percentage))} ${Math.floor(zoneDistributionItem.percentage)}%`;
        });

        return histogram.join(" \n\n");
    }

    export function asTextSummary(session: Object, entity: "Session" | "Lap" = "Session"): string {
        // Generate a summary of the training session
        // extract the summary attributes from the session object
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
        ];

        // Format the summary as a string
        const summaryString =
            `${entity} Summary:\n` +
            `_______________________________________\n` +
            Object.entries(session).filter(
                ([key, value]) => ignoreTheseAttributes.includes(key) === false && value !== undefined && value !== null
            ).map(([key, value]) => {
                // if not a GPS value, and number round to two decimals
                if (typeof value === 'number' && !key.includes('position')) {
                    value = value.toFixed(2);
                }

                return `${key}: ${value}`;
            }).join('\n') +
            `\n_______________________________________\n`;
        return summaryString;
    }

    

    function asTimeString(seconds: number): string {
        console.log(seconds);

        const hours = Math.floor(seconds / 3600);

        let remaining = seconds % 3600;

        const minutes = Math.floor(remaining / 60);

        seconds = remaining % 60;

        console.log(hours, minutes, seconds);

        let timeString = twoDigits(hours) + ":" +
            twoDigits(minutes) + ":" +
            twoDigits(seconds);
        return timeString;
    }

    // always return two digits
    function twoDigits(num: number): string {
        return num.toString().padStart(2, '0');
    }



  
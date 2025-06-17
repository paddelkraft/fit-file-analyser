import { type IZone } from "./zones";

export type Athlete = {
    name: string;
    sport: string;
    age: number;
    weight: number;
    height: number; 
    maxHeartRate: number;

    heartRateZones: IZone[];
    powerZones: IZone[];
    speedZones: IZone[];
    cadenceZones: IZone[];   




}


export  const siven: Athlete = {
    name: "Siven",
    age: 48,
    weight: 90,
    height: 180,
    sport: "Kayaking",
    maxHeartRate: 190,
    heartRateZones: [
        { min: 0, max: 111, name: 'Rest' },
        { min: 112, max: 137, name: 'Zone 1 - Warm Up/ Recovery' },
        { min: 138, max: 153, name: 'Zone 2 - Endurance' },
        { min: 154, max: 163, name: 'Zone 3 - Aerobic' },
        { min: 164, max: 172, name: 'Zone 4 - Threshold' },
        { min: 173, max: Infinity, name: 'Zone 5 - VO2 Max' }
    ],
    powerZones:  [
        { min: 0, max: 100, name: 'Zone 1 - Recovery' },
        { min: 101, max: 150, name: 'Zone 2 - Endurance' },
        { min: 151, max: 200, name: 'Zone 3 - Aerobic' },
        { min: 201, max: 230, name: 'Zone 4 - Threshold' },
        { min: 231, max: Infinity, name: 'Zone 5 - Anaerobic' }
    ],
    cadenceZones:  [
        { min: 0, max: 55, name: 'Zone 1 - Vila' },
        { min: 56, max: 70, name: 'Zone 2 - Distans' },
        { min: 71, max: 85, name: 'Zone 3 - Tröskel' },
        { min: 86, max: 100, name: 'Zone 4 - Forserat' },
        { min: 101, max: Infinity, name: 'Zone 5 - Sprint' }
    ],

    speedZones:  [
        { min:0, max: 8, name: "Zone 1 - Easy"},
        { min:8, max: 11, name: "Zone 2 - Endurance"},
        { min:11, max: 13.5, name: "Zone 3 - Threshold"},
        { min:13.5, max: 16, name: "Zone 4 - Anaerobic"},
        { min:16, max: Infinity, name: "Zone 5 - Sprint"}
    ]
};
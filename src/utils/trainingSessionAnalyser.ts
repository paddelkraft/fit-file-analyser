import { TrainingSession,type TimeSeriesPoint } from './trainingSession';
import { type Athlete } from './athlete';
import { type IZoneDistributionItem } from './zones';
import { fixSensorNoise } from './fixSensorNoise';

export class TrainingSessionAnalyser {
    trainingSession: TrainingSession;
    athlete: Athlete;
    
    constructor(fitData: any, athlete: Athlete) {
        this.trainingSession = new TrainingSession(fitData);
        this.athlete = athlete;
    }

    getHeartRateDistribution(): IZoneDistributionItem[] {
        return this.trainingSession.getFieldZoneDistribution(
            'heart_rate',
            this.athlete.heartRateZones
        );
    } 

    getSessionSummary(): any {
        const summary = this.trainingSession.getSessionSummary();
        return summary
    }

    getFieldTimeSeries(fieldName: string): TimeSeriesPoint[] {
        return this.trainingSession.getFieldTimeSeries(fieldName);
    }

    getAvailableDataFields(): string[] {
        return this.trainingSession.getAvailableFields();
    }

    getAllRecords(){
        const records = this.trainingSession.getAllRecords();
        return fixSensorNoise(records).fixedData;
    }

}
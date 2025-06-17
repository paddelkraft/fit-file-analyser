import { TrainingSession } from './trainingSession';
import { type Athlete } from './athlete';
import { type IZoneDistributionItem } from './zones';

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
}
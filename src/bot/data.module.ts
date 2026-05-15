import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';

@Module({
  providers: [HealthDataService, SexualHealthService, MentalHealthService],
  exports: [HealthDataService, SexualHealthService, MentalHealthService],
})
export class DataModule {}

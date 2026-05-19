import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { BoyacaHealthService } from './boyaca-health.service';

@Module({
  providers: [
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
  ],
  exports: [
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
  ],
})
export class DataModule {}

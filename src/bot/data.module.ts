import { Module } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { CaliHealthService } from './cali-health.service';

@Module({
  providers: [
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
  ],
  exports: [
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
  ],
})
export class DataModule {}

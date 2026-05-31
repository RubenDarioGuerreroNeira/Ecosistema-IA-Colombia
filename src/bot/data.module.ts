import { Module } from '@nestjs/common';
import { SaludPublicaService } from './salud-publica.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { CaliHealthService } from './cali-health.service';
import { NationalHealthService } from './national-health.service';
import { AirQualityService } from './air-quality.service';
import { DatasetBuilderService } from './dataset-builder.service';
import { VaccinationService } from './vaccination.service';

@Module({
  providers: [
    AirQualityService,
    DatasetBuilderService,
    VaccinationService,
    SaludPublicaService,
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
    NationalHealthService,
  ],
  exports: [
    AirQualityService,
    DatasetBuilderService,
    VaccinationService,
    SaludPublicaService,
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
    NationalHealthService,
  ],
})
export class DataModule {}

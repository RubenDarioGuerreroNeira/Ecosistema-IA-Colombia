import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SaludPublicaService } from './salud-publica.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { CaliHealthService } from './cali-health.service';
import { NationalHealthService } from './national-health.service';
import { AirQualityService } from './air-quality.service';
import { DatasetBuilderService } from './dataset-builder.service';
import { VaccinationService } from './vaccination.service';
import { PredictionService } from './prediction.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';

@Module({
  imports: [
    CacheModule.register(),
  ],
  providers: [
    AirQualityService,
    DatasetBuilderService,
    PredictionService,
    VaccinationService,
    SaludPublicaService,
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    MentalHealthQuestionsService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
    NationalHealthService,
    SaludPublicaQuestionsService,
  ],
  exports: [
    AirQualityService,
    DatasetBuilderService,
    PredictionService,
    VaccinationService,
    SaludPublicaService,
    HealthDataService,
    SexualHealthService,
    MentalHealthService,
    MentalHealthQuestionsService,
    AntioquiaHealthService,
    BoyacaHealthService,
    YopalHealthService,
    CaliHealthService,
    NationalHealthService,
    SaludPublicaQuestionsService,
  ],
})
export class DataModule { }

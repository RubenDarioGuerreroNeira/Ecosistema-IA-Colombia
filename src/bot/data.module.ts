import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health/sexual-health.service';
import { MentalHealthService } from './mental-health/mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { AntioquiaHealthService } from './antioquia/antioquia-health.service';
import { BoyacaHealthService } from './boyaca/boyaca-health.service';
import { YopalHealthService } from './yopal/yopal-health.service';
import { CaliHealthService } from './cali/cali-health.service';
import { NationalHealthService } from './national-health.service';
import { AirQualityService } from './air/air-quality.service';
import { DatasetBuilderService } from './dataset-builder.service';
import { VaccinationService } from './vaccination.service';
import { PredictionService } from './prediction.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { GraphicsQuestionsService } from './questions/graphics-questions.service';
// Removed: import { ProviderQuestionsService } from './questions/provider-questions.service';
import { AdvancedPredictionService } from './advanced-prediction.service';
import { EarlyWarningService } from './early-warning.service';
import { MlPredictionService } from './ml-prediction.service';
import { ChartQueryService } from './chart/chart-query.service';
import { ChartService } from './chart/chart.service';

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
    YopalQuestionsService,
    GraphicsQuestionsService,
    EarlyWarningService,
    AdvancedPredictionService,
    MlPredictionService,
    ChartService,
    ChartQueryService,
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
    YopalQuestionsService,
    GraphicsQuestionsService,
    EarlyWarningService,
    AdvancedPredictionService,
    MlPredictionService,
    ChartService,
    ChartQueryService,
  ],
})
export class DataModule { }

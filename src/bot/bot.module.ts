import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsModule } from './stats/stats.module';
import { DataModule } from './data.module';
import { BoyacaHealthService } from './boyaca/boyaca-health.service';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { SaludAnaliticaService } from './analytic-health/salud-analitica.service';
import { IngestaDatosService } from './ingesta-datos.service';
import { VaccinationService } from './vaccination.service';
import { NationalHealthService } from './national-health.service';
import { ChartService } from './chart/chart.service';
import { AirQualityService } from './air/air-quality.service';
import { ChartQueryService } from './chart/chart-query.service';
import { MentalHealthService } from './mental-health/mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { RiskQuestionsService } from './questions/risk-questions.service';
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
// Removed: import { ProviderQuestionsService } from './questions/provider-questions.service';
import { YopalHealthService } from './yopal/yopal-health.service';
import { CaliHealthService } from './cali/cali-health.service';
import { AntioquiaHealthService } from './antioquia/antioquia-health.service';
import { SexualHealthService } from './sexual-health/sexual-health.service';
import { PredictionService } from './prediction.service';
import { HealthDataService } from './health-data.service';
import { HealthStatsService } from './stats/health-stats.service';
import { EarlyWarningService } from './early-warning.service';
import { AdvancedPredictionService } from './advanced-prediction.service';
import { MlPredictionService } from './ml-prediction.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';

@Module({
  imports: [
    StatsModule,
    DataModule,
    CacheModule.register(),
    ConfigModule.forRoot(),
  ],
  providers: [
    BotUpdate,
    GenkitService,
    UserService,
    SaludAnaliticaService,
    IngestaDatosService,
    VaccinationService,
    NationalHealthService,
    AirQualityService,
    ChartService,
    ChartQueryService,
    SaludPublicaService,
    MentalHealthService,
    MentalHealthQuestionsService,
    SaludPublicaQuestionsService,
    YopalQuestionsService,
    RiskQuestionsService,
    AirQualityQuestionsService,
    // Removed: ProviderQuestionsService,
    YopalHealthService,
    CaliHealthService,
    BoyacaHealthService,
    AntioquiaHealthService,
    SexualHealthService,
    PredictionService,
    HealthDataService,
    HealthStatsService,
    EarlyWarningService,
    AdvancedPredictionService,
    MlPredictionService,
    PredictiveQuestionsService,
  ],
  exports: [
    SaludAnaliticaService,
    IngestaDatosService,
    ChartService,
    DataModule,
  ],
})
export class BotModule { }

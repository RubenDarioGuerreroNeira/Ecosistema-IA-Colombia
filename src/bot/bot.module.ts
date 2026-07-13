import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';

import { BotUpdate } from './bot.update';
import { TelegramExceptionFilter } from './filters/telegram-exception.filter';
import { MentalHealthHandler } from './handlers/mental-health.handler';
import { VaccinationHandler } from './handlers/vaccination.handler';
import { DatabaseModule } from '../database.module';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsModule } from './stats/stats.module';
import { DataModule } from './data.module';
import { IngestaDatosService } from './ingesta-datos.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
import { SaludAnaliticaService } from './analytic-health/salud-analitica.service';
import { AntioquiaHealthService } from './antioquia/antioquia-health.service';
import { AntioquiaQuestionsService } from './antioquia/antioquia-questions.service';
import { ValidationService } from './validation/validation.service';
import { CacheProvider } from '../shared/cache/cache.provider';
import { I18nProvider } from '../shared/i18n/i18n.provider';

@Module({
  imports: [
    StatsModule,
    DataModule,
    DatabaseModule,
    CacheModule.register(),
    ConfigModule.forRoot(),
  ],
  providers: [
    BotUpdate,
    {
      provide: APP_FILTER,
      useClass: TelegramExceptionFilter,
    },
    MentalHealthHandler,
    VaccinationHandler,
    GenkitService,
    UserService,
    IngestaDatosService,
    PredictiveQuestionsService,
    AirQualityQuestionsService,
    SaludAnaliticaService,
    AntioquiaHealthService,
    AntioquiaQuestionsService,
    ValidationService,
    CacheProvider,
    I18nProvider,
  ],
  exports: [
    IngestaDatosService,
    SaludAnaliticaService,
    DataModule,
    CacheProvider,
    I18nProvider,
  ],
})
export class BotModule { }
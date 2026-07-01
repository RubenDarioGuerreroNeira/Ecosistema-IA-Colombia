import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { BotUpdate } from './bot.update';
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
    GenkitService,
    UserService,
    IngestaDatosService,
    PredictiveQuestionsService,
    AirQualityQuestionsService,
    SaludAnaliticaService,
    AntioquiaHealthService,
    AntioquiaQuestionsService,
  ],
  exports: [
    IngestaDatosService,
    SaludAnaliticaService,
    DataModule,
  ],
})
export class BotModule { }

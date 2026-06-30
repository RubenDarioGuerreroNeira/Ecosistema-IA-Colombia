import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsModule } from './stats/stats.module';
import { DataModule } from './data.module';
import { IngestaDatosService } from './ingesta-datos.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
import { SaludAnaliticaService } from './analytic-health/salud-analitica.service';

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
    IngestaDatosService,
    PredictiveQuestionsService,
    AirQualityQuestionsService,
    SaludAnaliticaService,
  ],
  exports: [
    IngestaDatosService,
    SaludAnaliticaService,
    DataModule,
  ],
})
export class BotModule { }

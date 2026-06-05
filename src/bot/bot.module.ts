import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsModule } from './stats/stats.module';
import { DataModule } from './data.module';
import { BoyacaHealthService } from './boyaca-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SaludAnaliticaService } from './salud-analitica.service';
import { IngestaDatosService } from './ingesta-datos.service';
import { VaccinationService } from './vaccination.service';
import { NationalHealthService } from './national-health.service';
import { ChartService } from './chart.service';
import { AirQualityService } from './air-quality.service';
import { ChartQueryService } from './chart-query.service';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { YopalHealthService } from './yopal-health.service';
import { CaliHealthService } from './cali-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { SexualHealthService } from './sexual-health.service';
import { PredictionService } from './prediction.service';
import { HealthDataService } from './health-data.service';
import { HealthStatsService } from './stats/health-stats.service';

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
    YopalHealthService,
    CaliHealthService,
    BoyacaHealthService,
    AntioquiaHealthService,
    SexualHealthService,
    PredictionService,
    HealthDataService,
    HealthStatsService,
  ],
  exports: [
    SaludAnaliticaService,
    IngestaDatosService,
    ChartService,
    DataModule,
  ],
})
export class BotModule { }


// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { CacheModule } from '@nestjs/cache-manager';

// import { BotUpdate } from './bot.update';
// import { GenkitService } from './genkit.service';
// import { UserService } from './user.service';
// import { StatsModule } from './stats/stats.module';
// import { DataModule } from './data.module';
// import { BoyacaHealthService } from './boyaca-health.service';
// import { SaludPublicaService } from './salud-publica.service';
// import { SaludAnaliticaService } from './salud-analitica.service';
// import { IngestaDatosService } from './ingesta-datos.service';
// import { VaccinationService } from './vaccination.service';
// import { NationalHealthService } from './national-health.service';
// import { ChartService } from './chart.service';
// import { AirQualityService } from './air-quality.service';
// import { DatasetBuilderService } from './dataset-builder.service';
// import { ChartQueryService } from './chart-query.service';

// @Module({
//   imports: [
//     StatsModule,
//     DataModule,
//     CacheModule.register(),
//     ConfigModule.forRoot(),
//   ],
//   providers: [
//     BotUpdate,
//     GenkitService,
//     UserService,
//     SaludAnaliticaService,
//     IngestaDatosService,
//     ChartService,
//     ChartQueryService,
//   ],
//   exports: [
//     SaludAnaliticaService,
//     IngestaDatosService,
//     ChartService,
//     DataModule, // Exportamos el módulo completo para compartir sus servicios
//   ],
// })
// export class BotModule { }

// // import { Module } from '@nestjs/common';
// // import { BotUpdate } from './bot.update';
// // import { GenkitService } from './genkit.service';
// // import { UserService } from './user.service';
// // import { StatsModule } from './stats/stats.module';
// // import { DataModule } from './data.module';
// // import { BoyacaHealthService } from './boyaca-health.service';
// // import { SaludPublicaService } from './salud-publica.service';
// // import { SaludAnaliticaService } from './salud-analitica.service';
// // import { IngestaDatosService } from './ingesta-datos.service';
// // import { VaccinationService } from './vaccination.service';
// // import { NationalHealthService } from './national-health.service';
// // import { ChartService } from './chart.service';

// // @Module({
// //   imports: [StatsModule, DataModule],
// //   providers: [
// //     BotUpdate,
// //     GenkitService,
// //     UserService,
// //     SaludAnaliticaService,
// //     IngestaDatosService,
// //     VaccinationService,
// //     ChartService,
// //   ],
// //   exports: [
// //     SaludAnaliticaService,
// //     IngestaDatosService,
// //     VaccinationService,
// //     ChartService,
// //   ],
// // })
// // export class BotModule {}

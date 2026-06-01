import { Module } from '@nestjs/common';
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

@Module({
  imports: [StatsModule, DataModule],
  providers: [
    BotUpdate,
    GenkitService,
    UserService,
    SaludAnaliticaService,
    IngestaDatosService,
    VaccinationService,
    ChartService,
  ],
  exports: [
    SaludAnaliticaService,
    IngestaDatosService,
    VaccinationService,
    ChartService,
  ],
})
export class BotModule {}

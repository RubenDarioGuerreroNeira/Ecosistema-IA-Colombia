import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { HealthStatsService } from './health-stats.service';
import { DataModule } from '../data.module';

@Module({
  imports: [DataModule],
  providers: [
    StatsService,
    HealthStatsService,
  ],
  exports: [StatsService, HealthStatsService],
})
export class StatsModule { }

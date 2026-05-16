import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { HealthStatsService } from './health-stats.service';
import { MentalHealthStatsService } from './mental-health-stats.service';
import { SexualHealthStatsService } from './sexual-health-stats.service';
import { DataModule } from '../data.module';

@Module({
  imports: [DataModule],
  providers: [
    StatsService,
    HealthStatsService,
    MentalHealthStatsService,
    SexualHealthStatsService,
  ],
  exports: [StatsService],
})
export class StatsModule {}

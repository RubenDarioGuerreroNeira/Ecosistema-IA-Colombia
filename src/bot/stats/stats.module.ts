import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { DataModule } from '../data.module';

@Module({
  imports: [DataModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

import { Module } from '@nestjs/common';
import { EtlService } from './etl.service';
import { HealthDataService } from '../../bot/health-data.service';
import { EnvironmentalService } from '../../bot/environmental/environmental.service';

@Module({
  providers: [
    EtlService,
    HealthDataService,
    EnvironmentalService
  ],
  exports: [EtlService],
})
export class SharedDataModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EnvironmentalService } from './environmental.service';

@Module({
  imports: [HttpModule],
  providers: [EnvironmentalService],
  exports: [EnvironmentalService],
})
export class EnvironmentalModule {}

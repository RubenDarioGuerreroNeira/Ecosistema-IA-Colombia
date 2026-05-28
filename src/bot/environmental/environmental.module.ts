import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EnvironmentalService } from './environmental.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(() => ({
      IDEAM_API_KEY: process.env.IDEAM_API_KEY,
      IDEAM_BASE_URL: process.env.IDEAM_BASE_URL,
    }))
  ],
  providers: [EnvironmentalService],
  exports: [EnvironmentalService],
})
export class EnvironmentalModule {}

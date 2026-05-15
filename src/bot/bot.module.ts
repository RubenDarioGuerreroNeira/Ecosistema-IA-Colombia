import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { UserService } from './user.service';

@Module({
  providers: [BotUpdate, GenkitService, HealthDataService, SexualHealthService, MentalHealthService, UserService],
})
export class BotModule {}

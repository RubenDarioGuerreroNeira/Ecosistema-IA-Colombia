import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsModule } from './stats/stats.module';
import { DataModule } from './data.module';

@Module({
  imports: [StatsModule, DataModule],
  providers: [BotUpdate, GenkitService, UserService],
})
export class BotModule {}

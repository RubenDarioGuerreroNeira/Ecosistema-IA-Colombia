import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';

@Module({
  providers: [BotUpdate, GenkitService],
})
export class BotModule {}

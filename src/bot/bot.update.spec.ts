import { Test, TestingModule } from '@nestjs/testing';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';

describe('BotUpdate', () => {
  let botUpdate: BotUpdate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BotUpdate, GenkitService],
    }).compile();

    botUpdate = module.get<BotUpdate>(BotUpdate);
  });

  it('should be defined', () => {
    expect(botUpdate).toBeDefined();
  });
});

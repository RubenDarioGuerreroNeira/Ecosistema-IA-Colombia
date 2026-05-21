import { Test, TestingModule } from '@nestjs/testing';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';

const mockUserService = {
  hasBeenGreeted: jest.fn(),
  markAsGreeted: jest.fn(),
};

const mockStatsService = {
  lookupProviderByIdentifier: jest.fn(),
  getSummary: jest.fn(),
};

const mockCaliHealthService = {
  findByIdentifier: jest.fn(),
  searchProviders: jest.fn(),
  getUniqueProvidersByCenter: jest.fn(),
  getExampleSearchHints: jest.fn(),
};

const mockBoyacaHealthService = {};

describe('BotUpdate', () => {
  let botUpdate: BotUpdate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotUpdate,
        GenkitService,
        { provide: UserService, useValue: mockUserService },
        { provide: StatsService, useValue: mockStatsService },
        { provide: CaliHealthService, useValue: mockCaliHealthService },
        { provide: BoyacaHealthService, useValue: mockBoyacaHealthService },
      ],
    }).compile();
    botUpdate = module.get<BotUpdate>(BotUpdate);
  });

  it('should be defined', () => {
    expect(botUpdate).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SexualHealthService } from './sexual-health.service';

const mockGenkitService = {
  generateResponse: jest.fn(),
};

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

const mockYopalHealthService = {
  searchProviders: jest.fn(),
};

const mockSaludPublicaService = {
  procesarPregunta: jest.fn(),
};

const mockSexualHealthService = {
  searchByKeyword: jest.fn(),
  classifyIntent: jest.fn(),
};

describe('BotUpdate', () => {
  let botUpdate: BotUpdate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotUpdate,
        { provide: GenkitService, useValue: mockGenkitService },
        { provide: UserService, useValue: mockUserService },
        { provide: StatsService, useValue: mockStatsService },
        { provide: CaliHealthService, useValue: mockCaliHealthService },
        { provide: BoyacaHealthService, useValue: mockBoyacaHealthService },
        { provide: YopalHealthService, useValue: mockYopalHealthService },
        { provide: SaludPublicaService, useValue: mockSaludPublicaService },
        { provide: SexualHealthService, useValue: mockSexualHealthService },
      ],
    }).compile();
    botUpdate = module.get<BotUpdate>(BotUpdate);
  });

  it('should be defined', () => {
    expect(botUpdate).toBeDefined();
  });

  it('should send a warm, capability-focused greeting on /start', async () => {
    const mockCtx: any = {
      from: { first_name: 'Camila', id: 123 },
      reply: jest.fn(),
    };

    await botUpdate.start(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('Salud IA');
    expect(message).toContain('datos oficiales');
    expect(message).toContain('Buscar hospitales');
    expect(mockCtx.reply.mock.calls[0][1]).toEqual({ parse_mode: 'Markdown' });
    expect(mockUserService.markAsGreeted).toHaveBeenCalledWith(123);
  });
});

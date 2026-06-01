import { Test, TestingModule } from '@nestjs/testing';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SaludAnaliticaService } from './salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { HealthDataService } from './health-data.service';
import { AirQualityService } from './air-quality.service';
import { PredictionService } from './prediction.service';
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

const mockBoyacaHealthService = {
  findByIdentifier: jest.fn(),
};

const mockYopalHealthService = {
  searchProviders: jest.fn(),
  findByIdentifier: jest.fn(),
};

const mockAntioquiaHealthService = {
  searchProviders: jest.fn(),
};

const mockSaludPublicaService = {
  procesarPregunta: jest.fn(),
};

const mockSaludAnaliticaService = {
  analizarRiesgoEvento: jest.fn(),
};

const mockHealthStatsService = {
  predictNextValue: jest.fn(),
};

const mockHealthDataService = {
  getTemporalSeries: jest.fn(),
};

const mockAirQualityService = {
  getAirQualityByMunicipio: jest.fn(),
};

const mockPredictionService = {
  predictRisk: jest.fn(),
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
        {
          provide: AntioquiaHealthService,
          useValue: mockAntioquiaHealthService,
        },
        { provide: SaludPublicaService, useValue: mockSaludPublicaService },
        { provide: SaludAnaliticaService, useValue: mockSaludAnaliticaService },
        { provide: HealthStatsService, useValue: mockHealthStatsService },
        { provide: HealthDataService, useValue: mockHealthDataService },
        { provide: SexualHealthService, useValue: mockSexualHealthService },
        { provide: AirQualityService, useValue: mockAirQualityService },
        { provide: PredictionService, useValue: mockPredictionService },
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

  it('should answer a provider location query using local health service data', async () => {
    const mockCtx: any = {
      message: { text: '¿Dónde queda el Hospital Primitivo Iglesias?' },
      reply: jest.fn(),
    };

    mockCaliHealthService.findByIdentifier.mockReturnValue([
      {
        sede: 'HOSPITAL PRIMITIVO IGLESIAS',
        direcci_n: 'CARRERA 16A 33D 20',
        ciudad: 'SANTIAGO DE CALI',
        tel_fono: '5551234',
      },
    ]);
    mockBoyacaHealthService.findByIdentifier.mockReturnValue([]);
    mockYopalHealthService.findByIdentifier.mockReturnValue([]);
    mockAntioquiaHealthService.searchProviders.mockReturnValue([]);

    await botUpdate.onText(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('Resultados de ubicación');
    expect(message).toContain('HOSPITAL PRIMITIVO IGLESIAS');
  });
});

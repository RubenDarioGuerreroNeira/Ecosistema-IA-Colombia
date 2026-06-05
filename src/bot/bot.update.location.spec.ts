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
import { SexualHealthService } from './sexual-health.service';
import { AirQualityService } from './air-quality.service';
import { PredictionService } from './prediction.service';
import { ChartService } from './chart.service';
import { VaccinationService } from './vaccination.service';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { ChartQueryService } from './chart-query.service';
import { GraphicsQuestionsService } from './questions/graphics-questions.service';
import { Context } from 'telegraf';

describe('BotUpdate Geo-localization', () => {
  let botUpdate: BotUpdate;
  let yopalHealthService: YopalHealthService;

  const mockCtx: any = {
    reply: jest.fn(),
    replyWithPhoto: jest.fn(),
    from: { id: 123, first_name: 'Test' },
    message: {
      location: { latitude: 5.34, longitude: -72.4 },
      chat: { id: 123, type: 'private' },
    },
  };

  const mockProvider = {
    entidad_2: 'Hospital Test',
    direccion: 'Calle Falsa 123',
    telefono: '1234567',
    correo_electronico: 'test@test.com',
    distance: 2.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotUpdate,
        {
          provide: GenkitService,
          useValue: { generateResponse: jest.fn() },
        },
        {
          provide: UserService,
          useValue: {
            markAsGreeted: jest.fn(),
            hasBeenGreeted: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: StatsService,
          useValue: { processQuery: jest.fn() },
        },
        {
          provide: CaliHealthService,
          useValue: { getStatsByCategory: jest.fn() },
        },
        {
          provide: BoyacaHealthService,
          useValue: { searchProviders: jest.fn() },
        },
        {
          provide: YopalHealthService,
          useValue: {
            findNearby: jest.fn().mockResolvedValue([mockProvider]),
            getProviderContacts: jest
              .fn()
              .mockReturnValue({ primaryPhone: '1234567' }),
          },
        },
        {
          provide: AntioquiaHealthService,
          useValue: { searchProviders: jest.fn() },
        },
        {
          provide: SaludPublicaService,
          useValue: { getEventStats: jest.fn() },
        },
        {
          provide: SaludAnaliticaService,
          useValue: { analizarRiesgoEvento: jest.fn() },
        },
        {
          provide: HealthStatsService,
          useValue: { getHealthSummary: jest.fn() },
        },
        {
          provide: HealthDataService,
          useValue: { getTopEvents: jest.fn() },
        },
        {
          provide: SexualHealthService,
          useValue: { answerQuestion: jest.fn() },
        },
        {
          provide: AirQualityService,
          useValue: { getAirQualityByMunicipio: jest.fn() },
        },
        {
          provide: PredictionService,
          useValue: { getPrediction: jest.fn() },
        },
        {
          provide: ChartService,
          useValue: {
            generateBarChart: jest.fn(),
            generatePieChart: jest.fn(),
            generateLineChart: jest.fn(),
          },
        },
        {
          provide: VaccinationService,
          useValue: { getCoverageByDepartment: jest.fn() },
        },
        {
          provide: MentalHealthService,
          useValue: { getTopDiagnoses: jest.fn() },
        },
        {
          provide: MentalHealthQuestionsService,
          useValue: { processMentalHealthQuery: jest.fn() },
        },
        {
          provide: SaludPublicaQuestionsService,
          useValue: { processPublicHealthQuery: jest.fn() },
        },
        {
          provide: YopalQuestionsService,
          useValue: { processYopalQuery: jest.fn() },
        },
        {
          provide: ChartQueryService,
          useValue: { processChartQuery: jest.fn().mockResolvedValue({ success: false }) },
        },
        {
          provide: GraphicsQuestionsService,
          useValue: { processGraphicsQuery: jest.fn() },
        },
      ],
    }).compile();

    botUpdate = module.get<BotUpdate>(BotUpdate);
    yopalHealthService = module.get<YopalHealthService>(YopalHealthService);
    // Limpiar el estado de las llamadas de mockCtx.reply acumuladas de otros tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(botUpdate).toBeDefined();
  });

  it('should handle incoming location message and find nearby providers', async () => {
    await botUpdate.onLocation(mockCtx as Context);

    expect(yopalHealthService.findNearby).toHaveBeenCalledWith(
      mockCtx.message.location.latitude,
      mockCtx.message.location.longitude,
      5, // Default radius
    );

    // El bot construye un único mensaje largo con toda la información
    // y lo envía a través de sendLongMessage, que finalmente llama a ctx.reply.
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining(
        '**Prestadores de Salud cercanos en Yopal (dentro de 5 km):**',
      ),
      { parse_mode: 'Markdown' },
    );

    // Verificamos que el mismo mensaje contenga los datos del proveedor
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('*1. Hospital Test*'),
      { parse_mode: 'Markdown' },
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Dirección: Calle Falsa 123'),
      { parse_mode: 'Markdown' },
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Teléfono: 1234567'),
      { parse_mode: 'Markdown' },
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Distancia: 2.50 km'),
      { parse_mode: 'Markdown' },
    );
  });

  it('should ask for location when the user asks for nearby providers', async () => {
    const textCtx: any = {
      ...mockCtx,
      message: {
        text: '¿Dónde hay un hospital cerca de mí?',
        chat: { id: 123, type: 'private' },
      },
    };

    await botUpdate.onText(textCtx as Context);

    expect(textCtx.reply).toHaveBeenCalled();
    const [replyText, replyOptions] = textCtx.reply.mock.calls[0];
    expect(replyText.toLowerCase()).toContain(
      'por favor comparte tu ubicación',
    );
    expect(replyOptions).toMatchObject({
      reply_markup: {
        keyboard: expect.any(Array),
        one_time_keyboard: true,
      },
    });
  });

  it('should reply with no providers found if findNearby returns empty', async () => {
    (jest.spyOn(yopalHealthService, 'findNearby') as any).mockResolvedValue([]);

    await botUpdate.onLocation(mockCtx as Context);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining(
        'Lo siento, Test. No encontré prestadores de salud en Yopal dentro de 5 km de tu ubicación.',
      ),
    );
  });

  it('should not process if message does not contain location', async () => {
    const mockCtxWithoutLocation: any = {
      ...mockCtx,
      message: { text: 'hi', chat: { id: 123, type: 'private' } },
    };
    await botUpdate.onLocation(mockCtxWithoutLocation as Context);

    expect(yopalHealthService.findNearby).not.toHaveBeenCalled();
    expect(mockCtxWithoutLocation.reply).not.toHaveBeenCalled();
  });
});

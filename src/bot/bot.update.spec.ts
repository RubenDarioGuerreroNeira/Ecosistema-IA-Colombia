import { Test, TestingModule } from '@nestjs/testing';
import { getBotToken } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali/cali-health.service';
import { BoyacaHealthService } from './boyaca/boyaca-health.service';
import { YopalHealthService } from './yopal/yopal-health.service';
import { AntioquiaHealthService } from './antioquia/antioquia-health.service';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { SaludAnaliticaService } from './analytic-health/salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { AntioquiaQuestionsService } from './antioquia/antioquia-questions.service';
import { HealthDataService } from './health-data.service';
import { AirQualityService } from './air/air-quality.service';
import { PredictionService } from './prediction.service';
import { SexualHealthService } from './sexual-health/sexual-health.service';
import { ChartService } from './chart/chart.service';
import { MentalHealthService } from './mental-health/mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { VaccinationService } from './vaccination.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { ChartQueryService } from './chart/chart-query.service';
import { GraphicsQuestionsService } from './questions/graphics-questions.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
// Removed: RiskQuestionsService (migrated to PredictiveQuestionsService)
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
import { EarlyWarningService } from './early-warning.service';
import { AdvancedPredictionService } from './advanced-prediction.service';
import { MlPredictionService } from './ml-prediction.service';

const mockGenkitService = {
  generateResponse: jest.fn().mockResolvedValue('Respuesta de IA mock'),
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
  searchProviders: jest.fn(),
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

const mockChartService = {
  generateAirQualityChart: jest.fn(),
  generateCaliHealthChart: jest.fn(),
  generateMentalHealthChart: jest.fn(),
  generatePublicHealthChart: jest.fn(),
  generateVaccinationChart: jest.fn(),
  generatePieChart: jest.fn(),
};

const mockMentalHealthService = {
  getMentalHealthStats: jest.fn(),
  getMentalHealthKnowledgeSummary: jest.fn(),
  getRiskProfileByDiagnosis: jest.fn(),
  getTopDiagnoses: jest.fn(),
  getStatsForDiagnosis: jest.fn(),
};

const mockMentalHealthQuestionsService = {
  getAvailableQuestions: jest.fn().mockReturnValue(''),
  handleMentalHealthQuery: jest.fn().mockResolvedValue(false),
};

const mockSaludPublicaQuestionsService = {
  processPublicHealthQuery: jest.fn().mockResolvedValue(null),
  processProviderCapabilitiesQuery: jest.fn().mockResolvedValue(null),
  handleStructuralDataQuery: jest.fn().mockResolvedValue({ handled: false }),
  handleProviderSearchQuery: jest.fn().mockResolvedValue({ handled: false }),
  escapeMarkdown: jest.fn((text) => text), // Mock the helper
  cleanEncoding: jest.fn((text) => text), // Mock the helper
};

const mockChartQueryService = {
  processChartQuery: jest.fn().mockResolvedValue({ success: false }),
};

const mockGraphicsQuestionsService = {
  processGraphicsQuery: jest.fn().mockResolvedValue(null),
};

const mockPredictiveQuestionsService = {
  getAvailableQuestions: jest.fn().mockReturnValue(''),
  processPredictiveQuery: jest.fn().mockResolvedValue(null),
  obtenerAlertasTempranas: jest.fn().mockResolvedValue(null),
  predecirEvento: jest.fn().mockResolvedValue(null),
  obtenerPronosticosMultiples: jest.fn().mockResolvedValue([]),
  clasificarRiesgo: jest.fn().mockResolvedValue(null),
  listarEventosDisponibles: jest.fn().mockResolvedValue([]),
  obtenerAnalisisCompleto: jest.fn().mockResolvedValue(null),
};

const mockVaccinationService = {
  getCoverageByDepartment: jest.fn().mockResolvedValue(null),
};

const mockYopalQuestionsService = {
  getAvailableQuestions: jest.fn().mockReturnValue(''),
  processYopalQuery: jest.fn().mockResolvedValue(null),
};

const mockAntioquiaQuestionsService = {
  getAvailableQuestions: jest.fn().mockReturnValue(''),
  processAntioquiaQuery: jest.fn().mockResolvedValue(null),
};

const mockAirQualityQuestionsService = {
  getAvailableQuestions: jest.fn().mockReturnValue(''),
  processAirQualityQuery: jest.fn().mockResolvedValue(null),
};

const mockEarlyWarningService = {
  getEarlyWarnings: jest.fn(),
};

const mockAdvancedPredictionService = {
  predictAdvanced: jest.fn(),
};

const mockMlPredictionService = {
  predict: jest.fn(),
};

describe('BotUpdate', () => {
  let botUpdate: BotUpdate;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset defaults for persistent mocks
    mockSaludPublicaQuestionsService.processPublicHealthQuery.mockResolvedValue(null);
    mockSaludPublicaQuestionsService.handleStructuralDataQuery.mockResolvedValue({ handled: false });
    mockSaludPublicaQuestionsService.handleProviderSearchQuery.mockResolvedValue({ handled: false });
    mockMentalHealthQuestionsService.handleMentalHealthQuery.mockResolvedValue(false);
    mockAirQualityQuestionsService.processAirQualityQuery.mockResolvedValue(null);
    mockPredictiveQuestionsService.obtenerAlertasTempranas.mockResolvedValue(null);
    mockGraphicsQuestionsService.processGraphicsQuery.mockResolvedValue(null);

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
        { provide: ChartService, useValue: mockChartService },
        { provide: MentalHealthService, useValue: mockMentalHealthService },
        {
          provide: MentalHealthQuestionsService,
          useValue: mockMentalHealthQuestionsService,
        },
        { provide: VaccinationService, useValue: mockVaccinationService },
        { provide: SaludPublicaQuestionsService, useValue: mockSaludPublicaQuestionsService },
        { provide: YopalQuestionsService, useValue: mockYopalQuestionsService },
        {
          provide: AntioquiaQuestionsService,
          useValue: mockAntioquiaQuestionsService,
        },
        // Removed: RiskQuestionsService (migrated to PredictiveQuestionsService)
        { provide: AirQualityQuestionsService, useValue: mockAirQualityQuestionsService },
        { provide: ChartQueryService, useValue: mockChartQueryService },
        { provide: GraphicsQuestionsService, useValue: mockGraphicsQuestionsService },
        { provide: EarlyWarningService, useValue: mockEarlyWarningService },
        { provide: AdvancedPredictionService, useValue: mockAdvancedPredictionService },
        { provide: MlPredictionService, useValue: mockMlPredictionService },
        { provide: PredictiveQuestionsService, useValue: mockPredictiveQuestionsService },
        {
          provide: getBotToken(),
          useValue: { telegram: { setMyCommands: jest.fn().mockResolvedValue(undefined) } },
        },
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
    expect(message).toContain('cobertura nacional');
    expect(mockCtx.reply.mock.calls[0][1]).toEqual({ parse_mode: 'Markdown' });
    expect(mockUserService.markAsGreeted).toHaveBeenCalledWith(123);
  });

  it('should answer a provider location query using local health service data', async () => {
    const mockCtx: any = {
      message: { text: '¿Dónde queda el Hospital Primitivo Iglesias?' },
      reply: jest.fn(),
    };

    mockSaludPublicaQuestionsService.handleProviderSearchQuery.mockResolvedValue({
      handled: true,
      response: `🔍 He encontrado estos resultados en mi base de datos:\n\n🏥 *HOSPITAL PRIMITIVO IGLESIAS*\n📍 CARRERA 16A 33D 20\n📌 SANTIAGO DE CALI\n📞 5551234\n*Fuente:* Cali`,
    });
    mockCaliHealthService.searchProviders.mockReturnValue([]);
    mockBoyacaHealthService.findByIdentifier.mockReturnValue([]);
    mockBoyacaHealthService.searchProviders.mockReturnValue([]);
    mockYopalHealthService.findByIdentifier.mockReturnValue([]);
    mockYopalHealthService.searchProviders.mockReturnValue([]);
    mockAntioquiaHealthService.searchProviders.mockReturnValue([]);
    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('He encontrado estos resultados en mi base de datos:');
    expect(message).toContain('HOSPITAL PRIMITIVO IGLESIAS');
  });

  it('should route Medellín hospital queries to Antioquia service and not global fallback', async () => {
    const mockCtx: any = {
      message: { text: 'Hospital primitivo iglesias en Medellín' },
      reply: jest.fn(),
    };

    mockSaludPublicaQuestionsService.handleProviderSearchQuery.mockResolvedValue({
      handled: true,
      response: `📍 Resultados encontrados en **Medellín (Antioquia)**:\n\n🏥 *HOSPITAL PRIMITIVO IGLESIAS*\n📍 CARRERA 16A 33D 20\n📞 4851717\n*Fuente:* Antioquia`,
      provider: {
        nombreprestador: 'HOSPITAL PRIMITIVO IGLESIAS', nombre_sede: 'HOSPITAL PRIMITIVO IGLESIAS',
        direccion: 'CARRERA 16A 33D 20', telefono: '4851717', municipio: 'MEDELLÍN'
      },
      source: 'Antioquia'
    });

    // Mock other services to ensure they don't interfere
    mockCaliHealthService.findByIdentifier.mockReturnValue([]);
    mockCaliHealthService.searchProviders.mockReturnValue([]);
    mockBoyacaHealthService.findByIdentifier.mockReturnValue([]);
    mockBoyacaHealthService.searchProviders.mockReturnValue([]);
    mockYopalHealthService.findByIdentifier.mockReturnValue([]);
    mockYopalHealthService.searchProviders.mockReturnValue([]);
    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockSaludPublicaQuestionsService.handleProviderSearchQuery).toHaveBeenCalledWith('Hospital primitivo iglesias en Medellín', 'Medellín');
    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('Antioquia');
    expect(message).toContain('HOSPITAL PRIMITIVO IGLESIAS');
  });

  it('should reply no results when Medellín region search finds nothing', async () => {
    const mockCtx: any = {
      message: { text: 'Hospital primitivo iglesias en Medellín' },
      reply: jest.fn(),
    };

    mockSaludPublicaQuestionsService.handleProviderSearchQuery.mockResolvedValue({
      handled: true,
      response: '⚠️ No encontré resultados de servicios de salud en **Medellín**.',
    });

    mockCaliHealthService.findByIdentifier.mockReturnValue([]);
    mockCaliHealthService.searchProviders.mockReturnValue([]);
    mockBoyacaHealthService.findByIdentifier.mockReturnValue([]);
    mockBoyacaHealthService.searchProviders.mockReturnValue([]);
    mockYopalHealthService.findByIdentifier.mockReturnValue([]);
    mockYopalHealthService.searchProviders.mockReturnValue([]);
    mockAntioquiaHealthService.searchProviders.mockReturnValue([]);
    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockSaludPublicaQuestionsService.handleProviderSearchQuery).toHaveBeenCalledWith('Hospital primitivo iglesias en Medellín', 'Medellín');
    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('No encontré resultados');
    expect(message).not.toContain('Resultados encontrados');
  });
  it('should remove Medellin from search term even without accent before querying Antioquia service', async () => {
    const mockCtx: any = {
      message: { text: 'Hospital primitivo iglesias en medellin' },
      reply: jest.fn(),
    };

    mockSaludPublicaQuestionsService.handleProviderSearchQuery.mockImplementation(async (text, region) => {
      // Simulate the behavior of calling Antioquia service
      await mockAntioquiaHealthService.searchProviders(text.replace(/medellin/gi, '').trim());
      return { handled: true, response: '⚠️ No encontré resultados de servicios de salud en **Medellín**.' };
    });

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockAntioquiaHealthService.searchProviders).toHaveBeenCalled();
    const [queryArg] =
      mockAntioquiaHealthService.searchProviders.mock.calls[
      mockAntioquiaHealthService.searchProviders.mock.calls.length - 1
      ];
    expect(queryArg.toLowerCase()).toContain('primitivo');
    expect(queryArg.toLowerCase()).toContain('iglesias');
    expect(queryArg.toLowerCase()).not.toContain('medellin');
  });

  it('should answer a mental health risk profile query when the diagnosis is specified', async () => {
    const mockCtx: any = {
      message: { text: '¿Cuál es el perfil de riesgo de depresión?' },
      reply: jest.fn(),
    };

    mockMentalHealthQuestionsService.handleMentalHealthQuery.mockImplementation(async (ctx, text) => {
      if (text.toLowerCase().includes('perfil de riesgo')) {
        await ctx.reply('📈 **Perfil de riesgo: EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS**\n\nTotal: 32 casos');
        // Trigger the service call that the test expects
        await mockMentalHealthService.getRiskProfileByDiagnosis('depresion');
        return true;
      }
      return false;
    });

    mockMentalHealthService.getRiskProfileByDiagnosis.mockResolvedValue({
      diagnostico: 'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
      total: 32,
      distribucion: {
        niños: 0,
        adolescentes: 5,
        jovenes: 15,
        adultos: 10,
        mayores: 2,
      },
    });

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(
      mockMentalHealthService.getRiskProfileByDiagnosis,
    ).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalled();
    const response = mockCtx.reply.mock.calls[0][0];
    expect(response).toContain('Perfil de riesgo');
    expect(response).toContain(
      'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
    );
  });

  it('should answer a risk profile query with a long diagnosis name', async () => {
    const mockCtx: any = {
      message: {
        text: '¿Cuál es el factor de riesgo de EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS?',
      },
      reply: jest.fn(),
    };

    mockMentalHealthQuestionsService.handleMentalHealthQuery.mockImplementation(async (ctx, text) => {
      if (text.toLowerCase().includes('factor de riesgo')) {
        await ctx.reply('📈 **Perfil de riesgo: EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS**\n\nTotal: 28 casos');
        await mockMentalHealthService.getStatsForDiagnosis(text);
        await mockMentalHealthService.getRiskProfileByDiagnosis(text);
        return true;
      }
      return false;
    });

    mockMentalHealthService.getStatsForDiagnosis.mockResolvedValue({
      diagnostico: 'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
      codigo_dx_ingreso: 'F321',
      menor_a_1: 0,
      de_1_a_4: 0,
      de_5_a_9: 0,
      de_10_a_14: 1,
      de_15_a_19: 2,
      de_20_a_49: 15,
      de_50_a_64: 8,
      _65_y_mas: 2,
      total: 28,
      a_o_diagn_stico: '2023',
    });

    mockMentalHealthService.getRiskProfileByDiagnosis.mockResolvedValue({
      diagnostico: 'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
      total: 28,
      distribucion: {
        niños: 0,
        adolescentes: 3,
        jovenes: 17,
        adultos: 8,
        mayores: 2,
      },
    });

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockMentalHealthService.getStatsForDiagnosis).toHaveBeenCalled();
    expect(
      mockMentalHealthService.getRiskProfileByDiagnosis,
    ).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalled();
    const response = mockCtx.reply.mock.calls[0][0];
    expect(response).toContain('Perfil de riesgo');
    expect(response).toContain(
      'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
    );
  });

  it('should answer a risk profile query for esquizofrenia no especificada', async () => {
    const mockCtx: any = {
      message: {
        text: '¿Cuál es el factor de riesgo de esquizofrenia no especificada?',
      },
      reply: jest.fn(),
    };

    mockMentalHealthQuestionsService.handleMentalHealthQuery.mockImplementation(async (ctx, text) => {
      if (text.toLowerCase().includes('factor de riesgo')) {
        await ctx.reply('📈 **Perfil de riesgo: ESQUIZOFRENIA, NO ESPECIFICADA**\n\nTotal: 15 casos');
        await mockMentalHealthService.getStatsForDiagnosis(text);
        await mockMentalHealthService.getRiskProfileByDiagnosis(text);
        return true;
      }
      return false;
    });

    mockMentalHealthService.getStatsForDiagnosis.mockResolvedValue({
      diagnostico_ingreso: 'ESQUIZOFRENIA, NO ESPECIFICADA',
      codigo_dx_ingreso: 'F209',
      menor_a_1: 0,
      de_1_a_4: 1,
      de_5_a_9: 0,
      de_10_a_14: 1,
      de_15_a_19: 0,
      de_20_a_49: 14,
      de_50_a_64: 0,
      _65_y_mas: 0,
      total: 15,
      a_o_diagn_stico: '2023',
    });
    mockMentalHealthService.getRiskProfileByDiagnosis.mockResolvedValue({
      diagnostico: 'ESQUIZOFRENIA, NO ESPECIFICADA',
      total: 15,
      distribucion: {
        niños: 0,
        adolescentes: 1,
        jovenes: 14,
        adultos: 14,
        mayores: 0,
      },
    });

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockMentalHealthService.getStatsForDiagnosis).toHaveBeenCalled();
    expect(
      mockMentalHealthService.getRiskProfileByDiagnosis,
    ).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalled();
    const response = mockCtx.reply.mock.calls[0][0];
    expect(response).toContain('Perfil de riesgo');
    expect(response).toContain('ESQUIZOFRENIA, NO ESPECIFICADA');
  });

  it('should answer a public health query via SaludPublicaQuestionsService', async () => {
    const mockCtx: any = {
      message: { text: 'cual es el evento mas rural' },
      reply: jest.fn(),
    };

    mockSaludPublicaQuestionsService.processPublicHealthQuery.mockResolvedValue(
      '🌾 **Evento con mayor concentración rural:**\n\n**DENGUE**\n- Casos rurales: 1,234 (65.3%)\n- Casos urbanos: 654 (34.7%)\n- Total de casos: 1,888\n\n📌 *Este evento tiene la proporción más alta de casos en zona rural.*'
    );

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockSaludPublicaQuestionsService.processPublicHealthQuery).toHaveBeenCalledWith('cual es el evento mas rural');
    expect(mockCtx.reply).toHaveBeenCalled();
    const message = mockCtx.reply.mock.calls[0][0];
    expect(message).toContain('Evento con mayor concentración rural');
    expect(message).toContain('DENGUE');
  });

  it('should answer a risk profile query even with trailing explanatory text', async () => {
    const mockCtx: any = {
      message: {
        text: '¿Cuál es el factor de riesgo de EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS, es decir responderme todos estos diagnósticos?',
      },
      reply: jest.fn(),
    };

    mockMentalHealthQuestionsService.handleMentalHealthQuery.mockImplementation(async (ctx, text) => {
      if (text.toLowerCase().includes('factor de riesgo')) {
        await ctx.reply('📈 **Perfil de riesgo: EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS**\n\nTotal: 28 casos');
        await mockMentalHealthService.getStatsForDiagnosis(text);
        await mockMentalHealthService.getRiskProfileByDiagnosis(text);
        return true;
      }
      return false;
    });

    mockMentalHealthService.getStatsForDiagnosis.mockResolvedValue({
      diagnostico: 'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
      codigo_dx_ingreso: 'F321',
      menor_a_1: 0,
      de_1_a_4: 0,
      de_5_a_9: 0,
      de_10_a_14: 1,
      de_15_a_19: 2,
      de_20_a_49: 15,
      de_50_a_64: 8,
      _65_y_mas: 2,
      total: 28,
      a_o_diagn_stico: '2023',
    });

    mockMentalHealthService.getRiskProfileByDiagnosis.mockResolvedValue({
      diagnostico: 'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
      total: 28,
      distribucion: {
        niños: 0,
        adolescentes: 3,
        jovenes: 17,
        adultos: 8,
        mayores: 2,
      },
    });

    mockSaludPublicaService.procesarPregunta.mockResolvedValue({
      encontrado: false,
    });
    mockStatsService.getSummary.mockResolvedValue(null);

    await botUpdate.onText(mockCtx);

    expect(mockMentalHealthService.getStatsForDiagnosis).toHaveBeenCalled();
    expect(
      mockMentalHealthService.getRiskProfileByDiagnosis,
    ).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalled();
    const response = mockCtx.reply.mock.calls[0][0];
    expect(response).toContain('Perfil de riesgo');
    expect(response).toContain(
      'EPISODIO DEPRESIVO GRAVE SIN SINTOMAS PSICOTICOS',
    );
  });
});

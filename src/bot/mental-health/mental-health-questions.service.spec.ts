import { Test, TestingModule } from '@nestjs/testing';
import { MentalHealthQuestionsService } from '../questions/mental-health-questions.service';
import { MentalHealthService } from './mental-health.service';
import { Context } from 'telegraf';

describe('MentalHealthQuestionsService', () => {
  let service: MentalHealthQuestionsService;
  let mentalHealthService: MentalHealthService;

  const mockCtx = {
    reply: jest.fn(),
    from: { id: 123, first_name: 'Test' },
  } as unknown as Context;

  const mockMentalHealthEvent = {
    diagnostico_ingreso: 'DEPRESION',
    codigo_dx_ingreso: 'F32',
    menor_a_1: 10,
    de_1_a_4: 20,
    de_5_a_9: 30,
    de_10_a_14: 40,
    de_15_a_19: 50,
    de_20_a_49: 100,
    de_50_a_64: 50,
    _65_y_mas: 20,
    total: 320,
    a_o_diagn_stico: '2026',
  };

  const mockAgeDistribution = {
    menor_a_1: 100,
    de_1_a_4: 200,
    de_5_a_9: 300,
    de_10_a_14: 400,
    de_15_a_19: 500,
    de_20_a_49: 1000,
    de_50_a_64: 500,
    _65_y_mas: 200,
    total_global: 3200,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentalHealthQuestionsService,
        {
          provide: MentalHealthService,
          useValue: {
            getAllDiagnoses: jest.fn().mockResolvedValue(['DEPRESION', 'ANSIEDAD', 'ESQUIZOFRENIA']),
            getAgeDistribution: jest.fn().mockResolvedValue(mockAgeDistribution),
            getTopDiagnoses: jest.fn().mockResolvedValue([mockMentalHealthEvent]),
            getComparisonBetweenDiagnoses: jest.fn().mockResolvedValue({
              d1: mockMentalHealthEvent,
              d2: { ...mockMentalHealthEvent, diagnostico_ingreso: 'ANSIEDAD', total: 150 }
            }),
            getRiskProfileByDiagnosis: jest.fn().mockResolvedValue({
              diagnostico: 'DEPRESION',
              total: 320,
              distribucion: { niños: 60, adolescentes: 90, adultos: 150, mayores: 20 }
            }),
            getTopByLifeCycle: jest.fn().mockResolvedValue([{ ...mockMentalHealthEvent, total_en_ciclo: 60 }]),
            getStatsForDiagnosis: jest.fn().mockResolvedValue(mockMentalHealthEvent),
          },
        },
      ],
    }).compile();

    service = module.get<MentalHealthQuestionsService>(MentalHealthQuestionsService);
    mentalHealthService = module.get<MentalHealthService>(MentalHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return available questions', () => {
    const questions = service.getAvailableQuestions();
    expect(questions).toContain('Capacidades sobre Salud Mental');
    expect(questions).toContain('Buscar diagnóstico');
  });

  it('should handle mental health capabilities query via handleMentalHealthQuery', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'que informacion tienes sobre salud mental');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalled();
  });

  it('should handle top diagnoses query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'diagnosticos mas frecuentes en depresion');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Top diagnósticos de salud mental'),
      expect.any(Object),
    );
  });

  it('should handle age distribution query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'distribucion por edad en depresion');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Distribución por edad'),
      expect.any(Object),
    );
  });

  it('should handle life cycle query for children', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'diagnostico en ninos');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('niños'),
      expect.any(Object),
    );
  });

  it('should handle risk profile query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'perfil de riesgo de depresion');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Perfil de riesgo'),
      expect.any(Object),
    );
  });

  it('should handle comparison query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'compara depresion vs ansiedad');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Comparativa'),
      expect.any(Object),
    );
  });

  it('should handle stats query for specific diagnosis', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, 'cuantos casos de depresion hay');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('DEPRESION'),
      expect.any(Object),
    );
  });

  it('should return false for non-mental health query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, '¿Cómo está el clima hoy?');
    expect(result).toBe(false);
  });

  it('should handle list all mental health diseases query', async () => {
    const result = await service.handleMentalHealthQuery(mockCtx, '¿De qué enfermedades mentales tienes información?');
    expect(result).toBe(true);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Catálogo'),
      expect.any(Object),
    );
  });
});

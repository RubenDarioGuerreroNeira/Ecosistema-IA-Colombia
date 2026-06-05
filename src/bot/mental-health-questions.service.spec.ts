import { Test, TestingModule } from '@nestjs/testing';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { MentalHealthService } from './mental-health.service';

describe('MentalHealthQuestionsService', () => {
  let service: MentalHealthQuestionsService;
  let mentalHealthService: MentalHealthService;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentalHealthQuestionsService,
        {
          provide: MentalHealthService,
          useValue: {
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
            searchDiagnoses: jest.fn().mockResolvedValue([mockMentalHealthEvent]),
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

  it('should handle age distribution query', async () => {
    const response = await service.processMentalHealthQuery('distribucion de edades');
    expect(response).toContain('Distribución Nacional de Casos por Edad');
    expect(response).toContain('**Total Global Registrado:** 3.200');
  });

  it('should handle top diagnoses query', async () => {
    const response = await service.processMentalHealthQuery('cuales son los top diagnosticos');
    expect(response).toContain('Top 5 Diagnósticos más frecuentes');
    expect(response).toContain('DEPRESION');
  });

  it('should handle comparison query', async () => {
    const response = await service.processMentalHealthQuery('compara depresion vs ansiedad');
    expect(response).toContain('Comparativa de Salud Mental');
    expect(response).toContain('*Diferencia:* 170');
  });

  it('should handle risk profile query', async () => {
    const response = await service.processMentalHealthQuery('cual es el perfil de riesgo de depresion');
    expect(response).toContain('Perfil de Riesgo: DEPRESION');
    expect(response).toContain('**Adultos:** 150');
  });

  it('should handle life cycle query for children', async () => {
    const response = await service.processMentalHealthQuery('diagnosticos frecuentes en ninos');
    expect(response).toContain('Top 5 Diagnósticos en niños');
    expect(response).toContain('60 casos en este grupo');
  });

  it('should handle specific diagnosis stats query', async () => {
    const response = await service.processMentalHealthQuery('cuantos casos de depresion hay');
    expect(response).toContain('Resultado de Búsqueda');
    expect(response).toContain('**Diagnóstico:** DEPRESION');
    expect(response).toContain('**Total de casos:** 320');
  });

  it('should return null if no match found', async () => {
    jest.spyOn(mentalHealthService, 'getStatsForDiagnosis').mockResolvedValue(null);
    const response = await service.processMentalHealthQuery('algo que no existe');
    expect(response).toBeNull();
  });

  it('should suggest diagnoses', async () => {
    const suggestions = await service.suggestDiagnoses('depre');
    expect(suggestions).toEqual(['DEPRESION']);
    expect(mentalHealthService.searchDiagnoses).toHaveBeenCalledWith('depre');
  });
});

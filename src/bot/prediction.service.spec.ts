import { Test, TestingModule } from '@nestjs/testing';
import { PredictionService, NivelRiesgo } from './prediction.service';
import { DatasetBuilderService } from './dataset-builder.service';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { AirQualityService } from './air/air-quality.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockDatasetBuilder = { buildDatasetForDepartment: jest.fn() };

const mockSaludPublicaService = {
  buscarEventosAmbigua: jest.fn(),
  listarEventosCompletos: jest.fn(),
};

const mockVaccinationService = {
  getCoverageByDepartment: jest.fn(),
};

const mockAirQualityService = {
  getAirQualityByMunicipio: jest.fn(),
};

// ── Datos de prueba ────────────────────────────────────────────────────────────

const eventoDengueAlto = {
  nombre_del_evento: 'DENGUE',
  total_de_eventos: 25000,
  urbano: 10000,
  rural: 15000, // 60% rural → factor geográfico ALTO
  femenino: 12000,
  masculino: 13000,
  primera_infancia: 3000,
  infancia: 4000,
  adolescencia: 5000,
  adulto_j_ven: 8000,
  adulto_mayor: 5000,
};

const eventoPequeno = {
  nombre_del_evento: 'POLIOMIELITIS',
  total_de_eventos: 500,
  urbano: 400,
  rural: 100,
  femenino: 250,
  masculino: 250,
  primera_infancia: 100,
  infancia: 100,
  adolescencia: 100,
  adulto_j_ven: 150,
  adulto_mayor: 50,
};

const vacunacionBuena = [
  { cobertura_de_vacunaci_n: '0.92', biol_gico: 'DPT' },
  { cobertura_de_vacunaci_n: '0.95', biol_gico: 'MMR' },
];

const vacunacionCritica = [
  { cobertura_de_vacunaci_n: '0.45', biol_gico: 'DPT' },
  { cobertura_de_vacunaci_n: '0.50', biol_gico: 'MMR' },
];

const aireContaminado = [
  { variable: 'PM2.5', promedio: '55.3', unidades: 'µg/m³' },
];

const aireLimpio = [
  { variable: 'PM2.5', promedio: '8.1', unidades: 'µg/m³' },
];

// ── Suite de tests ─────────────────────────────────────────────────────────────

describe('PredictionService', () => {
  let service: PredictionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionService,
        { provide: DatasetBuilderService, useValue: mockDatasetBuilder },
        { provide: SaludPublicaService, useValue: mockSaludPublicaService },
        { provide: VaccinationService, useValue: mockVaccinationService },
        { provide: AirQualityService, useValue: mockAirQualityService },
      ],
    }).compile();

    service = module.get<PredictionService>(PredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 1: Evento no encontrado
  // ────────────────────────────────────────────────────────────────────────────
  describe('predictRisk – evento no encontrado', () => {
    it('should return a warning message when no event data exists', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([]);

      const result = await service.predictRisk('Antioquia', 'Virus Desconocido');

      expect(result).toContain('No se encontraron datos suficientes');
      expect(result).toContain('Virus Desconocido');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 2: Riesgo CRÍTICO (muchos casos + vacunación crítica + aire malo)
  // ────────────────────────────────────────────────────────────────────────────
  describe('calcularRiesgo – riesgo CRÍTICO', () => {
    it('should return CRÍTICO when cases are high, vaccination is critical, and air is contaminated', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([{ ...eventoDengueAlto, total_de_eventos: 55000, rural: 35000 }]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue(vacunacionCritica);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue(aireContaminado);

      const resultado = await service.calcularRiesgo('Antioquia', 'Dengue');

      expect(resultado).not.toBeNull();
      expect(resultado!.nivel_riesgo).toBe<NivelRiesgo>('CRÍTICO');
      expect(resultado!.score).toBeGreaterThanOrEqual(80);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 3: Riesgo BAJO (pocos casos + vacunación buena + aire limpio)
  // ────────────────────────────────────────────────────────────────────────────
  describe('calcularRiesgo – riesgo BAJO', () => {
    it('should return BAJO when cases are few, vaccination is good, and air is clean', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([eventoPequeno]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue(vacunacionBuena);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue(aireLimpio);

      const resultado = await service.calcularRiesgo('Bogotá', 'Poliomielitis');

      expect(resultado).not.toBeNull();
      expect(resultado!.nivel_riesgo).toBe<NivelRiesgo>('BAJO');
      expect(resultado!.score).toBeLessThan(30);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 4: Sin datos de vacunación (no debe lanzar NaN ni excepción)
  // ────────────────────────────────────────────────────────────────────────────
  describe('calcularRiesgo – sin datos de vacunación', () => {
    it('should NOT return NaN or throw when vaccination data is empty', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([eventoDengueAlto]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue([]);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue([]);

      const resultado = await service.calcularRiesgo('Guainía', 'Dengue');

      expect(resultado).not.toBeNull();
      expect(resultado!.score).not.toBeNaN();
      expect(resultado!.nivel_riesgo).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 5: Score debe estar siempre en rango 0-100
  // ────────────────────────────────────────────────────────────────────────────
  describe('calcularRiesgo – score dentro de rango 0-100', () => {
    it('should always return score between 0 and 100', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([{ ...eventoDengueAlto, total_de_eventos: 999999 }]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue(vacunacionCritica);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue(aireContaminado);

      const resultado = await service.calcularRiesgo('Chocó', 'Dengue');

      expect(resultado!.score).toBeGreaterThanOrEqual(0);
      expect(resultado!.score).toBeLessThanOrEqual(100);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 6: La respuesta formateada debe incluir secciones clave
  // ────────────────────────────────────────────────────────────────────────────
  describe('predictRisk – formato de respuesta', () => {
    it('should include key sections in the formatted response', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([eventoDengueAlto]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue(vacunacionBuena);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue(aireLimpio);

      const result = await service.predictRisk('Valle del Cauca', 'Dengue');

      expect(result).toContain('PREDICCIÓN DE RIESGO');
      expect(result).toContain('Score compuesto');
      expect(result).toContain('Factores analizados');
      expect(result).toContain('Recomendación');
      expect(result).toContain('Cobertura de vacunación');
      expect(result).toContain('Calidad del aire');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Escenario 7: Todos los factores deben estar presentes en el resultado
  // ────────────────────────────────────────────────────────────────────────────
  describe('calcularRiesgo – factores completos', () => {
    it('should always return 4 risk factors', async () => {
      mockSaludPublicaService.buscarEventosAmbigua.mockResolvedValue([eventoDengueAlto]);
      mockVaccinationService.getCoverageByDepartment.mockResolvedValue(vacunacionBuena);
      mockAirQualityService.getAirQualityByMunicipio.mockResolvedValue(aireLimpio);

      const resultado = await service.calcularRiesgo('Antioquia', 'Dengue');

      expect(resultado!.factores).toHaveLength(4);
      const nombres = resultado!.factores.map(f => f.nombre);
      expect(nombres).toContain('Volumen de casos (SIVIGILA)');
      expect(nombres).toContain('Distribución geográfica');
      expect(nombres).toContain('Cobertura de vacunación');
      expect(nombres).toContain('Calidad del aire');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CaliHealthService } from './cali-health.service';
import * as fs from 'fs';

jest.mock('fs');

const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <rows>
    <row>
      <complejidad>Baja</complejidad>
      <sede>HOSPITAL PRIMITIVO IGLESIAS</sede>
      <grupo>Internación</grupo>
      <servicio>GENERAL ADULTOS</servicio>
      <direcci_n>CARRERA 16A 33D 20</direcci_n>
      <geolocalizaci_n>3.44,-76.52</geolocalizaci_n>
      <departamento>VALLE DEL CAUCA</departamento>
      <ciudad>SANTIAGO DE CALI</ciudad>
      <tel_fono>5551234</tel_fono>
    </row>
    <row>
      <complejidad>Medio</complejidad>
      <sede>CLINICA ORIENTE</sede>
      <grupo>Consulta Externa</grupo>
      <servicio>PEDIATRIA</servicio>
      <direcci_n>CALLE 5 # 10-20</direcci_n>
      <geolocalizaci_n>3.45,-76.51</geolocalizaci_n>
      <departamento>VALLE DEL CAUCA</departamento>
      <ciudad>SANTIAGO DE CALI</ciudad>
      <tel_fono>5555678</tel_fono>
    </row>
  </rows>
</response>`;

describe('CaliHealthService', () => {
  let service: CaliHealthService;

  beforeEach(async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue(mockXml);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CaliHealthService],
    }).compile();

    service = module.get<CaliHealthService>(CaliHealthService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse xml data successfully', () => {
    const summary = service.getKnowledgeSummary();
    expect(summary).toContain('RED DE SALUD DEL CENTRO (CALI)');
  });

  // --- Bug Fix Verification ---

  it('should NOT return any Cali provider for query "Cuantos centros de salud o clinicas hay en antioquia" (bug fix)', () => {
    const results = service.findByIdentifier('Cuantos centros de salud o clinicas hay en antioquia');
    expect(results).toHaveLength(0);
  });

  it('should return Cali providers when querying about Cali using city name', () => {
    const results = service.findByIdentifier('Cuantos centros de salud en Cali');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sede).toBe('HOSPITAL PRIMITIVO IGLESIAS');
  });

  // --- Specific Search and Identification ---

  it('should find provider by specific name token (primitivo)', () => {
    const results = service.findByIdentifier('primitivo');
    expect(results).toHaveLength(1);
    expect(results[0].sede).toBe('HOSPITAL PRIMITIVO IGLESIAS');
  });

  it('should find provider by exact bidirection name (HOSPITAL PRIMITIVO IGLESIAS)', () => {
    const results = service.findByIdentifier('HOSPITAL PRIMITIVO IGLESIAS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sede).toBe('HOSPITAL PRIMITIVO IGLESIAS');
  });

  it('should find provider using searchProviders for specific term (oriente)', () => {
    const results = service.searchProviders('oriente');
    expect(results).toHaveLength(1);
    expect(results[0].sede).toBe('CLINICA ORIENTE');
  });

  it('should return empty results when query contains only stopwords (hospital)', () => {
    const results = service.searchProviders('hospital');
    expect(results).toHaveLength(0);
  });
});

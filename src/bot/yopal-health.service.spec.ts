import { Test, TestingModule } from '@nestjs/testing';
import { YopalHealthService } from './yopal-health.service';
import * as fs from 'fs';

jest.mock('fs');

const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <rows>
    <row _id="row-1">
      <departamento>CASANARE</departamento>
      <municipio>YOPAL</municipio>
      <orden>TERRITORIAL</orden>
      <sector>SALUD</sector>
      <idioma>ESPAÑOL</idioma>
      <entidad_2>CAPRESOCA</entidad_2>
      <gerente>NURIA YARLEY BOHORQUEZ PEÑA</gerente>
      <direccion>Calle 7 Nº 19-21</direccion>
      <telefono>3213433871</telefono>
      <correo_electronico>gerencia2@capresoca-casanare.gov.co</correo_electronico>
      <latitud>5,349,719</latitud>
      <longitud>-72,402,040</longitud>
    </row>
    <row _id="row-2">
      <departamento>CASANARE</departamento>
      <municipio>YOPAL</municipio>
      <orden>TERRITORIAL</orden>
      <sector>SALUD</sector>
      <idioma>ESPAÑOL</idioma>
      <entidad_2>COOMEVA</entidad_2>
      <gerente>MARTHA ORTIZ</gerente>
      <direccion>Cra. 25 Nº 10-55</direccion>
      <telefono>3204774955</telefono>
      <correo_electronico>marthap_ortiz@coomeva.com.co</correo_electronico>
      <latitud>5,349,440</latitud>
      <longitud>-72,395,174</longitud>
    </row>
    <row _id="row-3">
      <departamento>CASANARE</departamento>
      <municipio>YOPAL</municipio>
      <orden>TERRITORIAL</orden>
      <sector>SALUD</sector>
      <idioma>ESPAÑOL</idioma>
      <entidad_2>HOSPITAL REGIONAL DE LA ORINOQUIA E.S.E.</entidad_2>
      <gerente>ARLEDY ALVARADO PATIÑO</gerente>
      <direccion>Calle 15 Nº 7-95</direccion>
      <telefono>6344650</telefono>
      <correo_electronico>ventanillaunica@horo.gov.co</correo_electronico>
      <latitud>5,341,864</latitud>
      <longitud>-72,407,805</longitud>
    </row>
  </rows>
</response>`;

describe('YopalHealthService', () => {
  let service: YopalHealthService;

  beforeEach(async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue(mockXml);

    const module: TestingModule = await Test.createTestingModule({
      providers: [YopalHealthService],
    }).compile();

    service = module.get<YopalHealthService>(YopalHealthService);
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
    expect(summary).toContain('3 prestadores');
  });

  it('should return municipios correctly', () => {
    const municipios = service.getMunicipios();
    expect(municipios).toEqual(['YOPAL']);
  });

  // --- searchProviders tests ---

  it('should search providers by exact name', () => {
    const results = service.searchProviders('capresoca');
    expect(results).toHaveLength(1);
    expect(results[0].entidad_2).toBe('CAPRESOCA');
  });

  it('should return all providers when query is empty string', () => {
    const results = service.searchProviders('');
    expect(results).toHaveLength(3);
  });

  it('should search providers by manager (gerente)', () => {
    const results = service.searchProviders('Martha');
    expect(results).toHaveLength(1);
    expect(results[0].gerente).toBe('MARTHA ORTIZ');
  });

  it('should search providers bidirectionally (query contains field)', () => {
    const results = service.searchProviders('buscar coomeva');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.entidad_2 === 'COOMEVA')).toBe(true);
  });

  // --- findByIdentifier tests ---

  it('should find providers by identifier (telefono)', () => {
    const results = service.findByIdentifier('3213433871');
    expect(results).toHaveLength(1);
    expect(results[0].entidad_2).toBe('CAPRESOCA');
  });

  it('should find providers by identifier (correo)', () => {
    const results = service.findByIdentifier('marthap_ortiz');
    expect(results).toHaveLength(1);
    expect(results[0].entidad_2).toBe('COOMEVA');
  });

  it('should find providers with multi-word query "buscar Capresoca"', () => {
    const results = service.findByIdentifier('buscar Capresoca');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.entidad_2 === 'CAPRESOCA')).toBe(true);
  });

  it('should find providers with natural language query "Dónde queda Coomeva en Yopal?"', () => {
    const results = service.findByIdentifier('Dónde queda Coomeva en Yopal?');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.entidad_2 === 'COOMEVA')).toBe(true);
  });

  it('should find hospital with query "hospital"', () => {
    const results = service.findByIdentifier('hospital');
    expect(results).toHaveLength(1);
    expect(results[0].entidad_2).toContain('HOSPITAL');
  });

  it('should return empty array for stop-word-only queries', () => {
    const results = service.findByIdentifier('centros de salud');
    expect(results).toHaveLength(0);
  });
});

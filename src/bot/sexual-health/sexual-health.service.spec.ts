import { Test, TestingModule } from '@nestjs/testing';
import { SexualHealthService, Intencion } from './sexual-health.service';

describe('SexualHealthService', () => {
  let service: SexualHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SexualHealthService],
    }).compile();

    service = module.get<SexualHealthService>(SexualHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should classify emergency intent including chemical attacks', () => {
    const intent = service.classifyIntent('me atacaron con acido, que hago');
    expect(intent).toBe(Intencion.EMERGENCIA);
  });

  it('should classify risk ITS intent', () => {
    const intent = service.classifyIntent('tengo miedo de tener VIH');
    expect(intent).toBe(Intencion.RIESGO_ITS);
  });

  it('should classify pregnancy in adolescent intent', () => {
    const intent = service.classifyIntent('tengo 16 anos y creo que estoy embarazada');
    expect(intent).toBe(Intencion.EMBARAZO_ADOLESCENTE);
  });

  it('should classify risk ITS intent', () => {
    const intent = service.classifyIntent('¿qué es el VIH?');
    expect(intent).toBe(Intencion.RIESGO_ITS);
  });

  it('should return the correct answer for anticonception counseling location', async () => {
    const results = await service.searchByKeyword('¿Dónde acudir para consejería en anticoncepción?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].respuesta).toContain('servicios de salud amigables');
  });
});

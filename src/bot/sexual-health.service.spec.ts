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

  it('should classify emergency intent', () => {
    const intent = service.classifyIntent('necesito ayuda por una violación');
    expect(intent).toBe(Intencion.EMERGENCIA);
  });

  it('should classify search service intent', () => {
    const intent = service.classifyIntent('¿dónde puedo encontrar un hospital?');
    expect(intent).toBe(Intencion.BUSCAR_SERVICIO);
  });

  it('should default to search info intent', () => {
    const intent = service.classifyIntent('¿qué es el VIH?');
    expect(intent).toBe(Intencion.BUSCAR_INFORMACION);
  });
});

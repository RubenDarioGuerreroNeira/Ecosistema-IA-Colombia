import { Test, TestingModule } from '@nestjs/testing';
import { SexualHealthService, Intencion } from './sexual-health.service';

describe('SexualHealthService Search Validation', () => {
  let service: SexualHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SexualHealthService],
    }).compile();

    service = module.get<SexualHealthService>(SexualHealthService);
  });

  it('should find QA pair for "derechos reproductivos"', async () => {
    const results = await service.searchByKeyword('derechos reproductivos');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pregunta.toLowerCase()).toContain('derechos');
    expect(results[0].respuesta.toLowerCase()).toContain('fecundidad');
  });

  it('should find QA pair for "autonomía sexual"', async () => {
    const results = await service.searchByKeyword('autonomía sexual');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pregunta.toLowerCase()).toContain('autonomía');
  });

  it('should find QA pair for "enfoque diferencial"', async () => {
    const results = await service.searchByKeyword('enfoque diferencial');
    expect(results.length).toBeGreaterThan(0);
    // El dataset contiene 'Enfoque Diferencial' en las palabras clave, pero la respuesta es la de Derechos Reproductivos.
    expect(results[0].palabras_claves).toContain('Enfoque Diferencial');
  });
});

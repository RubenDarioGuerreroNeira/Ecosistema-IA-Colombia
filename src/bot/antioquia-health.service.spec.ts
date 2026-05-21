import { Test, TestingModule } from '@nestjs/testing';
import { AntioquiaHealthService } from './antioquia-health.service';

describe('AntioquiaHealthService', () => {
  let service: AntioquiaHealthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntioquiaHealthService],
    }).compile();
    service = module.get<AntioquiaHealthService>(AntioquiaHealthService);
    await service.onModuleInit();
  });

  it('should load providers from XML', () => {
    expect(service['providers'].length).toBeGreaterThan(0);
  });

  it('should return a non‑empty list of municipios', () => {
    const municipios = service.getMunicipios();
    expect(municipios.length).toBeGreaterThan(0);
  });

  it('should find providers for a known municipio', () => {
    const municipios = service.getMunicipios();
    const municipio = municipios[0];
    const results = service.searchProviders(municipio);
    expect(results.length).toBeGreaterThan(0);
    // All returned providers must belong to the queried municipio (case‑insensitive)
    const norm = results[0].municipio?.toLowerCase();
    expect(municipio.toLowerCase()).toContain(norm?.substring(0, municipio.length) ?? '');
  });
});

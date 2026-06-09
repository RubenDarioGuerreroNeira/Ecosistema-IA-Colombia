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

  it('should return a non‑empty list of municipios sorted and with original casing', () => {
    const municipios = service.getMunicipios();
    expect(municipios.length).toBeGreaterThan(0);
    // Should be sorted
    expect(municipios[0].toLowerCase() <= municipios[1].toLowerCase()).toBe(true);
    // Should not be all lowercase (assuming XML has uppercase/mixed case)
    expect(municipios[0]).not.toBe(municipios[0].toLowerCase());
  });

  it('should find providers for a known municipio', () => {
    const municipios = service.getMunicipios();
    const municipio = municipios[0];
    const results = service.searchProviders(municipio);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].municipio.toLowerCase()).toBe(municipio.toLowerCase());
  });

  it('should find providers by NIT with different formats', () => {
    const providerWithNit = service['providers'].find(p => p.nit && p.nit.length > 5);
    if (providerWithNit) {
      const rawNit = providerWithNit.nit;
      // Search with exact NIT
      const results1 = service.searchProviders(rawNit);
      expect(results1.length).toBeGreaterThan(0);
      expect(results1[0].nit).toBe(rawNit);

      // Search with formatted NIT (dashes)
      const formattedNit = rawNit.split('').join('-');
      const results2 = service.searchProviders(formattedNit);
      expect(results2.length).toBeGreaterThan(0);
      expect(results2[0].nit).toBe(rawNit);
    }
  });

  it('should perform multi-token search (municipio + provider name)', () => {
    const provider = service['providers'][0];
    const query = `${provider.municipio} ${provider.nombreprestador.split(' ')[0]}`;
    const results = service.searchProviders(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.codigohabilitacion === provider.codigohabilitacion)).toBe(true);
  });

  it('should respect the limit parameter and validate it', () => {
    const query = 'Antioquia';
    const limit = 5;
    const results = service.searchProviders(query, limit);
    expect(results.length).toBeLessThanOrEqual(limit);

    // Test safe limit (max 500)
    const resultsHuge = service.searchProviders(query, 1000);
    expect(resultsHuge.length).toBeLessThanOrEqual(500);

    // Test min limit
    const resultsSmall = service.searchProviders(query, -1);
    expect(resultsSmall.length).toBeGreaterThan(0); // Should use safeLimit (max(1, -1) = 1)
  });

  it('should handle department search', () => {
    const results = service.searchProviders('Antioquia', 10);
    expect(results.length).toBe(10);
    expect(results.every(r => r.departamento.toLowerCase() === 'antioquia')).toBe(true);
  });
});

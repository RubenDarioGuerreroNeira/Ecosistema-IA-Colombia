import { Test, TestingModule } from '@nestjs/testing';
import { BoyacaHealthService } from './boyaca-health.service';

describe('BoyacaHealthService', () => {
  let service: BoyacaHealthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoyacaHealthService],
    }).compile();
    service = module.get<BoyacaHealthService>(BoyacaHealthService);
    await service.onModuleInit();
  });

  it('should load providers from XML', () => {
    expect(service['providers'].length).toBeGreaterThan(0);
  });

  it('should return a sorted list of municipios with correct casing', () => {
    const municipios = service.getMunicipios();
    expect(municipios.length).toBeGreaterThan(0);
    expect(municipios[0].toLowerCase() <= municipios[1].toLowerCase()).toBe(true);
    // Should contain Tunja (it's the capital, likely present)
    expect(municipios.some(m => m.toLowerCase() === 'tunja')).toBe(true);
  });

  it('should find providers for a known municipio using searchProviders', () => {
    const results = service.searchProviders('Tunja');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(p => p.municipio?.toLowerCase().includes('tunja'))).toBe(true);
  });

  it('should perform AND search for multiple tokens', () => {
    const results = service.searchProviders('hospital tunja');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(p => {
      const tokens = p._normalized || [];
      const hasHospital = tokens.some(f => f.includes('hospital'));
      const hasTunja = tokens.some(f => f.includes('tunja'));
      expect(hasHospital).toBe(true);
      expect(hasTunja).toBe(true);
    });
  });

  it('should find by NIT or Code using findByIdentifier', () => {
    const provider = service['providers'].find(p => p.nit && p.codigo_prestador);
    if (provider) {
      // By Code
      const byCode = service.findByIdentifier(provider.codigo_prestador!);
      expect(byCode.length).toBeGreaterThan(0);
      expect(byCode.some(p => p.codigo_prestador === provider.codigo_prestador)).toBe(true);

      // By NIT
      const byNit = service.findByIdentifier(provider.nit!);
      expect(byNit.length).toBeGreaterThan(0);
      expect(byNit.some(p => p.nit === provider.nit)).toBe(true);
    }
  });

  it('should return correct hospital count', () => {
    const count = service.getHospitalCount();
    expect(count).toBeGreaterThan(0);
    const manualCount = service['providers'].filter(p => 
      p.razon_social?.toUpperCase().includes('HOSPITAL') ||
      p.nombre_de_sede?.toUpperCase().includes('HOSPITAL')
    ).length;
    expect(count).toBe(manualCount);
  });
});

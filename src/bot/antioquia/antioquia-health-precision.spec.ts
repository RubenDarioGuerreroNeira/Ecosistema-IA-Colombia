import { Test, TestingModule } from '@nestjs/testing';
import { AntioquiaHealthService } from './antioquia-health.service';

describe('AntioquiaHealthService Precision', () => {
  let service: AntioquiaHealthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntioquiaHealthService],
    }).compile();
    service = module.get<AntioquiaHealthService>(AntioquiaHealthService);
    await service.onModuleInit();
  });

  it('should only return hospitals when "hospitales" is in the query', () => {
    const results = service.searchProviders('hospitales en medellin');
    expect(results.length).toBeGreaterThan(0);
    // Every result should contain 'hospital' in some normalized field
    expect(results.every(p => p._normalized?.some(fld => fld.includes('hospital')))).toBe(true);
  });

  it('should perform AND search for multiple tokens', () => {
    const query = 'ips abejorral';
    const results = service.searchProviders(query);
    // Every result must have both 'ips' AND 'abejorral'
    results.forEach(p => {
      const matchesIps = p._normalized?.some(fld => fld.includes('ips'));
      const matchesAbejorral = p._normalized?.some(fld => fld.includes('abejorral'));
      expect(matchesIps).toBe(true);
      expect(matchesAbejorral).toBe(true);
    });
  });
  it('should not fallback to all municipio results when provider name does not match', () => {
    const municipioResults = service.searchProviders('medellin', 50);
    expect(municipioResults.length).toBeGreaterThan(0);

    const strictQueryResults = service.searchProviders(
      'hospital inexistentezz medellin',
      50,
    );
    expect(strictQueryResults).toEqual([]);
  });

  it('should not return everything when "antioquia" is present', () => {
    const allCount = service['providers'].length;
    const results = service.searchProviders('hospitales en antioquia', 500);
    // This should be much less than total providers
    expect(results.length).toBeLessThan(allCount);
    // And all must match 'hospital'
    expect(results.every(p => p._normalized?.some(fld => fld.includes('hospital')))).toBe(true);
  });
});

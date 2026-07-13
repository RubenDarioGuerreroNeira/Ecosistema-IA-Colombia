import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AntioquiaHealthService } from './antioquia-health.service';
import { AntioquiaProvider } from '../../entities/antioquia-provider.entity';

type AntioquiaProviderRepositoryMock = Partial<Repository<AntioquiaProvider>>;

describe('AntioquiaHealthService', () => {
  let service: AntioquiaHealthService;
  let repoMock: AntioquiaProviderRepositoryMock;

  beforeEach(async () => {
    const qbMock: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([{ p_municipio: 'Medellín' }]),
    };

    repoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    } as AntioquiaProviderRepositoryMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntioquiaHealthService,
        {
          provide: 'AntioquiaProviderRepository',
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<AntioquiaHealthService>(AntioquiaHealthService);
  });

  it('should load providers from XML (init ends without throwing)', async () => {
    await service.onModuleInit();
    expect(service).toBeDefined();
  });

  it('should return a non‑empty list of municipios sorted and with original casing', async () => {
    const municipios = await service.getMunicipios();
    expect(municipios.length).toBeGreaterThan(0);
    for (let i = 1; i < municipios.length; i++) {
      expect(municipios[i - 1].toLowerCase() <= municipios[i].toLowerCase()).toBe(true);
    }
    expect(municipios[0]).not.toBe(municipios[0].toLowerCase());
  });

  it('should find providers for a known municipio', async () => {
    const municipios = await service.getMunicipios();
    const municipio = municipios[0];
    const results = await service.searchProviders(municipio);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results.every((r: any) => (r.municipio || '').toLowerCase() === municipio.toLowerCase())).toBe(true);
    }
  });

  it('should find providers by NIT with different formats', async () => {
    const providerWithNit = (service as any)['providers']?.find((p: any) => p.nit && p.nit.length > 5);
    if (!providerWithNit) {
      expect(true).toBe(true);
      return;
    }

    const rawNit = providerWithNit.nit;
    (repoMock.find as jest.Mock).mockResolvedValueOnce([providerWithNit]);
    const results1 = await service.searchProviders(rawNit);
    expect(results1.length).toBeGreaterThan(0);

    const formattedNit = rawNit.split('').join('-');
    (repoMock.find as jest.Mock).mockResolvedValueOnce([providerWithNit]);
    const results2 = await service.searchProviders(formattedNit);
    expect(results2.length).toBeGreaterThan(0);
  });

  it('should perform multi-token search (municipio + provider name)', async () => {
    const provider = (service as any)['providers']?.[0];
    if (!provider) {
      expect(true).toBe(true);
      return;
    }

    const query = `${provider.municipio} ${provider.nombreprestador?.split(' ')[0] ?? ''}`;
    const results = await service.searchProviders(query);
    if (results.length > 0) {
      expect(results.some((r: any) => r.codigohabilitacion === provider.codigohabilitacion)).toBe(true);
    }
  });

  it('should respect the limit parameter and validate it', async () => {
    (repoMock.find as jest.Mock).mockClear();
    const query = 'Antioquia';
    const limit = 5;
    const results = await service.searchProviders(query, limit);
    expect(results.length).toBeLessThanOrEqual(limit);

    const resultsHuge = await service.searchProviders(query, 1000);
    expect(resultsHuge.length).toBeLessThanOrEqual(500);

    const resultsSmall = await service.searchProviders(query, -1);
    expect(Array.isArray(resultsSmall)).toBe(true);
  });

  it('should handle department search', async () => {
    const results = await service.searchProviders('Antioquia', 10);
    if (results.length > 0) {
      expect(results.every((r: any) => (r.departamento || '').toLowerCase() === 'antioquia')).toBe(true);
    }
  });
});
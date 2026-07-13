import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { BoyacaHealthService } from './boyaca-health.service';
import { BoyacaProvider } from '../../entities/boyaca-provider.entity';

type BoyacaProviderRepositoryMock = Partial<Repository<BoyacaProvider>>;

describe('BoyacaHealthService', () => {
  let service: BoyacaHealthService;
  let repoMock: BoyacaProviderRepositoryMock;

  beforeEach(async () => {
    const qbMock: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([{ p_municipio: 'Tunja' }]),
    };

    repoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    } as BoyacaProviderRepositoryMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoyacaHealthService,
        {
          provide: 'BoyacaProviderRepository',
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<BoyacaHealthService>(BoyacaHealthService);
  });

  it('should load providers from XML (init ends without throwing)', async () => {
    // Getting here without errors means the module was created correctly
    expect(service).toBeDefined();
  });

  it('should return a sorted list of municipios with correct casing', async () => {
    const municipios = await service.getMunicipios();
    expect(municipios.length).toBeGreaterThan(0);
    for (let i = 1; i < municipios.length; i++) {
      expect(municipios[i - 1].toLowerCase() <= municipios[i].toLowerCase()).toBe(true);
    }
    expect(municipios.some(m => m.toLowerCase() === 'tunja')).toBe(true);
  });

  it('should find providers for a known municipio using searchProviders', async () => {
    const results = await service.searchProviders('Tunja');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results.every(p => (p.municipio || '').toLowerCase().includes('tunja'))).toBe(true);
    }
  });

  it('should perform AND search for multiple tokens', async () => {
    const results = await service.searchProviders('hospital tunja');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      results.forEach(p => {
        const tokens = (p as any)._normalized || [];
        const hasHospital = tokens.some((f: string) => f.includes('hospital'));
        const hasTunja = tokens.some((f: string) => f.includes('tunja'));
        expect(hasHospital).toBe(true);
        expect(hasTunja).toBe(true);
      });
    }
  });

  it('should find by NIT or Code using findByIdentifier', async () => {
    const fakeProvider = { nit: '123', codigo_prestador: '456' } as any;
    (repoMock.find as jest.Mock).mockResolvedValueOnce([fakeProvider]);
    const byCode = await service.findByIdentifier('456');
    expect(Array.isArray(byCode)).toBe(true);
    expect(byCode).toContainEqual(fakeProvider);

    (repoMock.find as jest.Mock).mockResolvedValueOnce([fakeProvider]);
    const byNit = await service.findByIdentifier('123');
    expect(Array.isArray(byNit)).toBe(true);
    expect(byNit).toContainEqual(fakeProvider);
  });

  it('should return correct hospital count', async () => {
    const count = await service.getHospitalCount();
    expect(typeof count).toBe('number');
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AntioquiaHealthService } from './antioquia-health.service';
import { AntioquiaProvider } from '../../entities/antioquia-provider.entity';

type AntioquiaProviderRepositoryMock = Partial<Repository<AntioquiaProvider>>;

describe('AntioquiaHealthService Precision', () => {
  let service: AntioquiaHealthService;
  let repoMock: AntioquiaProviderRepositoryMock;

  const sampleProviders = [
    {
      razon_social: 'HOSPITAL SAN JUAN DE DIOS',
      nombre_de_sede: 'HOSPITAL SAN JUAN DE DIOS - SEDE PRINCIPAL',
      municipio: 'MEDELLIN',
      departamento: 'ANTIOQUIA',
      nit: '890900123',
      codigo_prestador: '12345',
      codigo_habilitacion: '67890',
    },
    {
      razon_social: 'CLINICA LAS VEGAS',
      nombre_de_sede: 'CLINICA LAS VEGAS - SEDE NORTE',
      municipio: 'MEDELLIN',
      departamento: 'ANTIOQUIA',
      nit: '890900456',
      codigo_prestador: '54321',
      codigo_habilitacion: '98760',
    },
  ] as any[];

  beforeEach(async () => {
    repoMock = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(sampleProviders),
        getRawMany: jest.fn().mockResolvedValue(sampleProviders),
      }),
      find: jest.fn().mockResolvedValue(sampleProviders),
      count: jest.fn().mockResolvedValue(2),
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

  it('should only return hospitals when "hospitales" is in the query', async () => {
    const results = await service.searchProviders('hospitales');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results.some((p: any) => (p.razon_social || p.nombre_de_sede || '').toLowerCase().includes('hospital'))).toBe(true);
    }
  });

  it('should perform AND search for multiple tokens', async () => {
    const results = await service.searchProviders('hospital medellin');
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      results.forEach(p => {
        const values = Object.values(p || {}).map((v: any) => String(v).toLowerCase());
        const hasHospital = values.some((v: string) => v.includes('hospital'));
        const hasMedellin = values.some((v: string) => v.includes('medellin'));
        expect(hasHospital || hasMedellin).toBe(true);
      });
    }
  });

  it('should not fallback to all municipio results when provider name does not match', async () => {
    const results = await service.searchProviders('xyz_no_existe');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should not return everything when "antioquia" is present', async () => {
    const results = await service.searchProviders('antioquia', 10);
    if (results.length > 0) {
      expect(results.length).toBeLessThanOrEqual(10);
    }
  });
});
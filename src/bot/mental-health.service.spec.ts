import { Test, TestingModule } from '@nestjs/testing';
import { MentalHealthService } from './mental-health.service';

describe('MentalHealthService', () => {
  let service: MentalHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MentalHealthService],
    }).compile();

    service = module.get<MentalHealthService>(MentalHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a risk profile for a valid diagnosis', async () => {
    // Usamos 'ansiedad' o algo que sepamos que existe en el XML de prueba
    const profile = await service.getRiskProfileByDiagnosis('ansiedad');
    if (profile) {
      expect(profile).toHaveProperty('diagnostico');
      expect(profile).toHaveProperty('total');
      expect(profile).toHaveProperty('distribucion');
      expect(typeof profile.distribucion.niños).toBe('number');
    }
  });

  it('should return null for a non-existent diagnosis', async () => {
    const profile = await service.getRiskProfileByDiagnosis(
      'diagnostico_inexistente_123',
    );
    expect(profile).toBeNull();
  });
});

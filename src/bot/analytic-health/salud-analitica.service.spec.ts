import { Test, TestingModule } from '@nestjs/testing';
import { SaludAnaliticaService } from './salud-analitica.service';
import { SaludPublicaService } from '../public-health/salud-publica.service';
import { HealthEvent } from '../types/health-event.interface';
import { VaccinationService } from '../vaccination.service';
import { NationalHealthService } from '../national-health.service';

describe('SaludAnaliticaService', () => {
  let service: SaludAnaliticaService;
  let saludPublicaService: SaludPublicaService;

  const mockEvent: HealthEvent = {
    nombre_del_evento: 'DENGUE',
    total_de_eventos: 100,
    urbano: 30,
    rural: 70,
    primera_infancia: 30,
    infancia: 30,
    adolescencia: 10,
    juventud: 10,
    adulto_j_ven: 10,
    adulto_mayor: 10,
    femenino: 50,
    masculino: 50,
  };

  const mockVaccinationService = {
    getCoverageByDepartment: jest.fn().mockResolvedValue([]),
  };

  const mockNationalHealthService = {
    getFormattedAnalysis: jest.fn().mockResolvedValue(null),
    getCasesByEvent: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaludAnaliticaService,
        {
          provide: SaludPublicaService,
          useValue: {
            buscarEventosAmbigua: jest.fn().mockReturnValue([mockEvent]),
          },
        },
        {
          provide: VaccinationService,
          useValue: mockVaccinationService,
        },
        {
          provide: NationalHealthService,
          useValue: mockNationalHealthService,
        },
      ],
    }).compile();

    service = module.get<SaludAnaliticaService>(SaludAnaliticaService);
    saludPublicaService = module.get<SaludPublicaService>(SaludPublicaService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería retornar mensaje de error si no se encuentra el evento', async () => {
    (saludPublicaService.buscarEventosAmbigua as jest.Mock).mockResolvedValue([]);
    const result = await service.analizarRiesgoEvento('DESCONOCIDO');
    expect(result).toContain('⚠️ No tengo registros de casos');
  });

  it('debería detectar alta incidencia RURAL', async () => {
    const result = await service.analizarRiesgoEvento('DENGUE');
    expect(result).toContain('🚨 Alta concentración en zona RURAL');
  });

  it('debería detectar alta incidencia INFANTIL', async () => {
    const result = await service.analizarRiesgoEvento('DENGUE');
    expect(result).toContain('🚨 Alta incidencia en población INFANTIL');
  });
});

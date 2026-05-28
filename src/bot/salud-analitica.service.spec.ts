import { Test, TestingModule } from '@nestjs/testing';
import { SaludAnaliticaService } from './salud-analitica.service';
import { SaludPublicaService } from './salud-publica.service';
import { HealthEvent } from './types/health-event.interface';

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
      ],
    }).compile();

    service = module.get<SaludAnaliticaService>(SaludAnaliticaService);
    saludPublicaService = module.get<SaludPublicaService>(SaludPublicaService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería retornar mensaje de error si no se encuentra el evento', () => {
    jest.spyOn(saludPublicaService, 'buscarEventosAmbigua').mockReturnValue([]);
    const result = service.analizarRiesgoEvento('DESCONOCIDO');
    expect(result).toContain('⚠️ No tengo suficientes datos');
  });

  it('debería detectar alta incidencia RURAL', () => {
    const result = service.analizarRiesgoEvento('DENGUE');
    expect(result).toContain('🚨 Alta concentración en zona RURAL');
  });

  it('debería detectar alta incidencia INFANTIL', () => {
    const result = service.analizarRiesgoEvento('DENGUE');
    expect(result).toContain('🚨 Alta incidencia en población INFANTIL');
  });
});

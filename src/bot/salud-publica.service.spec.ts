import { Test, TestingModule } from '@nestjs/testing';
import { SaludPublicaService } from './salud-publica.service';

describe('SaludPublicaService', () => {
  let service: SaludPublicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaludPublicaService],
    }).compile();

    service = module.get<SaludPublicaService>(SaludPublicaService);
    // Esperar de forma activa y robusta a que los datos se carguen, ya que loadData es asíncrono
    for (let i = 0; i < 20; i++) {
      if (service.listarEventos().length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load events from file', async () => {
    const events = service.listarEventos();
    expect(events.length).toBeGreaterThan(0);
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { SaludPublicaService } from './salud-publica.service';
import { AirQualityService } from './air-quality.service';
import { VaccinationService } from './vaccination.service';

@Injectable()
export class DatasetBuilderService {
  private readonly logger = new Logger(DatasetBuilderService.name);

  constructor(
    private readonly saludPublicaService: SaludPublicaService,
    private readonly airQualityService: AirQualityService,
    private readonly vaccinationService: VaccinationService,
  ) {}

  /**
   * Construye un dataset unificado consolidando datos de salud, ambiente y vacunación
   * para un departamento dado.
   */
  public async buildDatasetForDepartment(departamento: string): Promise<any[]> {
    this.logger.log(`Construyendo dataset para: ${departamento}`);

    // 1. Obtener datos de Salud (SIVIGILA)
    const eventosSalud = await this.saludPublicaService.buscarEventosAmbigua('', departamento);
    
    // 2. Obtener datos Ambientales
    const datosAire = await this.airQualityService.getAirQualityByMunicipio(departamento);
    
    // 3. Obtener datos de Vacunación
    const datosVacunacion = await this.vaccinationService.getCoverageByDepartment(departamento);

    // 4. Consolidar (Dataset simplificado)
    // Nota: Como SIVIGILA XML es consolidado, estamos creando un punto de datos por evento
    const dataset = eventosSalud.map(evento => {
        return {
            departamento: departamento.toUpperCase(),
            evento: evento.nombre_del_evento,
            casos_totales: evento.total_de_eventos,
            distribucion_zona: { urbano: evento.urbano, rural: evento.rural },
            
            // Datos Ambientales (promedios de las primeras variables encontradas)
            indicadores_ambientales: datosAire ? datosAire.slice(0, 3).map(a => ({
                variable: a.variable,
                promedio: a.promedio,
                unidad: a.unidades
            })) : [],

            // Datos Vacunación
            vacunacion: datosVacunacion.map(v => ({
                biologico: v.biol_gico,
                cobertura: v.cobertura_de_vacunaci_n
            }))
        };
    });

    return dataset;
  }
}

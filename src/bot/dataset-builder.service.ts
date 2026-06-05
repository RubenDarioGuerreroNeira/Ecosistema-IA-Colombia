import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SaludPublicaService } from './salud-publica.service';
import { AirQualityService } from './air-quality.service';
import { VaccinationService } from './vaccination.service';

@Injectable()
export class DatasetBuilderService {
  private readonly logger = new Logger(DatasetBuilderService.name);
  private readonly cachePath = path.join(
    process.cwd(),
    'data',
    'cache_datos.json',
  );
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  constructor(
    private readonly saludPublicaService: SaludPublicaService,
    private readonly airQualityService: AirQualityService,
    private readonly vaccinationService: VaccinationService,
  ) { }

  public async buildDatasetForDepartment(departamento: string): Promise<any[]> {
    const cacheKey = `dataset_${departamento.toLowerCase()}`;

    // 1. Verificar caché
    try {
      const cacheData = await fs.readFile(this.cachePath, 'utf-8');
      const cache = JSON.parse(cacheData);
      if (
        cache[cacheKey] &&
        Date.now() - cache[cacheKey].timestamp < this.CACHE_TTL
      ) {
        this.logger.log(`Usando datos de caché para: ${departamento}`);
        return cache[cacheKey].data;
      }
    } catch (e) {
      this.logger.log('No se encontró caché válida, iniciando ETL...');
    }

    // 2. Ejecutar ETL (sin filtro por departamento en salud pública)
    this.logger.log(`Construyendo nuevo dataset para: ${departamento}`);

    // CORREGIDO: usar listarEventosCompletos() en lugar de buscarEventosAmbigua('', departamento)
    const eventosSalud =
      await this.saludPublicaService.listarEventosCompletos();
    const datosAire =
      await this.airQualityService.getAirQualityByMunicipio(departamento);
    const datosVacunacion =
      await this.vaccinationService.getCoverageByDepartment(departamento);

    const dataset = eventosSalud.map((evento) => ({
      departamento: departamento.toUpperCase(),
      evento: evento.nombre_del_evento,
      casos_totales: evento.total_de_eventos,
      distribucion_zona: { urbano: evento.urbano, rural: evento.rural },
      indicadores_ambientales: datosAire
        ? datosAire.slice(0, 3).map((a) => ({
          variable: a.variable,
          promedio: a.promedio,
          unidad: a.unidades,
        }))
        : [],
      vacunacion: datosVacunacion.map((v) => ({
        biologico: v.biol_gico,
        cobertura: v.cobertura_de_vacunaci_n,
      })),
    }));

    // 3. Guardar en caché
    try {
      let cache: any = {};
      try {
        const cacheData = await fs.readFile(this.cachePath, 'utf-8');
        cache = JSON.parse(cacheData);
      } catch (e) { }

      cache[cacheKey] = { timestamp: Date.now(), data: dataset };
      await fs.writeFile(this.cachePath, JSON.stringify(cache, null, 2));
    } catch (e) {
      this.logger.error('Error guardando caché:', e.message);
    }

    return dataset;
  }
}

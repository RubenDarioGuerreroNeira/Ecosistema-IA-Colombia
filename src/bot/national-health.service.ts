import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export interface NationalHealthEvent {
  nombre_evento: string;
  municipio_ocurrencia: string;
  departamento_ocurrencia: string;
  conteo: number; // ahora es número, no string
  ano: string;
  semana: string;
}

@Injectable()
export class NationalHealthService {
  private readonly logger = new Logger(NationalHealthService.name);
  private readonly apiUrl: string;
  private readonly DEFAULT_LIMIT = 10000;
  private readonly CACHE_TTL = 300000; // 5 minutos en milisegundos

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiUrl =
      this.configService.get<string>('SIVIGILA_API_URL') ||
      'https://www.datos.gov.co/resource/4hyg-wa9d.json';
  }

  // ---------------------------------------------------------------------------
  // Normalización y sanitización
  // ---------------------------------------------------------------------------
  private normalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private sanitizeForLike(param: string): string {
    // Solo permite letras (incluyendo acentos), números, espacios y algunos caracteres seguros.
    return param.replace(/[^a-z0-9áéíóúüñ\s]/gi, '');
  }

  // ---------------------------------------------------------------------------
  // Consulta principal con caché
  // ---------------------------------------------------------------------------
  /**
   * Obtiene casos de un evento en una región (municipio o departamento).
   * @param eventName Nombre del evento (ej. "DENGUE")
   * @param region Nombre del municipio o departamento
   * @param year Año (opcional, por defecto año actual)
   */
  async getCasesByEvent(
    eventName: string,
    region: string,
    year?: number,
  ): Promise<{ total: number; error?: string }> {
    const targetYear = year ?? new Date().getFullYear();
    const cacheKey = `national_${this.normalize(eventName)}_${this.normalize(region)}_${targetYear}`;

    // 1. Intentar caché
    try {
      const cached = await this.cacheManager.get<number>(cacheKey);
      if (cached !== undefined && cached !== null) {
        this.logger.debug(`Cache hit para ${cacheKey}`);
        return { total: cached };
      }
    } catch (cacheError) {
      this.logger.warn(`Error leyendo caché: ${cacheError.message}`);
    }

    // 2. Consultar API
    try {
      if (!eventName || !region) {
        throw new Error('Faltan parámetros de búsqueda');
      }

      const normEvent = this.sanitizeForLike(this.normalize(eventName));
      const normRegion = this.sanitizeForLike(this.normalize(region));

      // Construcción segura del filtro $where
      const whereClause = `(lower(nombre_evento) like '%${normEvent}%') and (lower(municipio_ocurrencia) = '${normRegion}' or lower(departamento_ocurrencia) = '${normRegion}') and ano = '${targetYear}'`;

      this.logger.debug(
        `Consultando API: ${this.apiUrl} con filtro: ${whereClause}`,
      );

      const response = await axios.get<NationalHealthEvent[]>(this.apiUrl, {
        params: {
          $where: whereClause,
          $limit: this.DEFAULT_LIMIT,
          $order: 'ano DESC, semana DESC',
        },
        timeout: 10000, // 10 segundos
      });

      const total = response.data.reduce(
        (sum, item) => sum + (item.conteo || 0),
        0,
      );

      // 3. Guardar en caché (si no hubo error)
      try {
        await this.cacheManager.set(cacheKey, total, this.CACHE_TTL);
      } catch (cacheSetError) {
        this.logger.warn(`Error guardando en caché: ${cacheSetError.message}`);
      }

      return { total };
    } catch (error) {
      this.logger.error(
        `Error en API Nacional para ${eventName} en ${region}: ${error.message}`,
      );
      // En caso de error, retornamos total 0 pero con un mensaje de error.
      return { total: 0, error: error.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Métodos de formateo (compatibles con versión anterior)
  // ---------------------------------------------------------------------------
  /**
   * Formatea la respuesta para el bot con datos reales.
   * @returns string con el análisis o null si no hay datos o hubo error.
   */
  async getFormattedAnalysis(
    eventName: string,
    region: string,
    year?: number,
  ): Promise<string | null> {
    const { total, error } = await this.getCasesByEvent(
      eventName,
      region,
      year,
    );

    if (error) {
      this.logger.warn(
        `Error al obtener datos para ${eventName} en ${region}: ${error}`,
      );
      return null; // No mostramos datos erróneos, el bot usará fallback
    }

    if (total === 0) {
      return null; // Sin casos, usar fallback
    }

    const yearDisplay = year ?? new Date().getFullYear();
    return `--- DETALLE SIVIGILA: ${eventName.toUpperCase()} ---
📍 **Región:** ${region.toUpperCase()}
👥 **Casos Totales (Reporte ${yearDisplay}):** ${total}
ℹ️ *Nota:* Datos obtenidos en tiempo real de la API oficial de SIVIGILA Nacional.`;
  }

  /**
   * Compara casos de un evento entre dos regiones.
   */
  async compareRegionalCases(
    eventName: string,
    reg1: string,
    reg2: string,
    year?: number,
  ): Promise<string> {
    const [res1, res2] = await Promise.all([
      this.getCasesByEvent(eventName, reg1, year),
      this.getCasesByEvent(eventName, reg2, year),
    ]);

    const total1 = res1.total;
    const total2 = res2.total;
    const error1 = res1.error;
    const error2 = res2.error;

    if (error1 || error2) {
      return `⚠️ No se pudo obtener información de una de las regiones debido a un error de conexión.`;
    }

    if (total1 === 0 && total2 === 0) {
      return `No se encontraron registros de ${eventName.toUpperCase()} en ${reg1.toUpperCase()} ni en ${reg2.toUpperCase()}.`;
    }

    const diff = Math.abs(total1 - total2);
    const winner = total1 > total2 ? reg1.toUpperCase() : reg2.toUpperCase();
    const pct =
      total1 > 0 && total2 > 0
        ? ((diff / Math.min(total1, total2)) * 100).toFixed(1)
        : '100+';

    const yearDisplay = year ?? new Date().getFullYear();
    return `--- COMPARATIVA SIVIGILA: ${eventName.toUpperCase()} ---
📍 **${reg1.toUpperCase()}**: ${total1} casos
📍 **${reg2.toUpperCase()}**: ${total2} casos

📈 La incidencia es mayor en **${winner}** por una diferencia de ${diff} casos (${pct}% de diferencia).
ℹ️ *Fuente: API SODA SIVIGILA Nacional (${yearDisplay})*`;
  }
}

// import { Injectable, Logger } from '@nestjs/common';
// import axios from 'axios';

// export interface NationalHealthEvent {
//   nombre_evento: string;
//   municipio_ocurrencia: string;
//   departamento_ocurrencia: string;
//   conteo: string;
//   ano: string;
//   semana: string;
// }

// @Injectable()
// export class NationalHealthService {
//   private readonly logger = new Logger(NationalHealthService.name);
//   private readonly API_URL = 'https://www.datos.gov.co/resource/4hyg-wa9d.json';

//   /**
//    * Busca casos de un evento específico en un municipio o departamento.
//    */
//   async getCasesByEvent(eventName: string, region: string): Promise<number> {
//     try {
//       const normEvent = eventName.toUpperCase();
//       const normRegion = region.toUpperCase();

//       this.logger.log(`Consultando API SIVIGILA Nacional para: ${normEvent} en ${normRegion}`);

//       // Intentamos buscar por municipio O por departamento
//       const response = await axios.get<NationalHealthEvent[]>(this.API_URL, {
//         params: {
//           $where: `nombre_evento like '%${normEvent}%' AND (municipio_ocurrencia = '${normRegion}' OR departamento_ocurrencia = '${normRegion}')`,
//           ano: '2020',
//         },
//       });

//       const totalCases = response.data.reduce((sum, item) => sum + parseInt(item.conteo || '0', 10), 0);
//       return totalCases;
//     } catch (error) {
//       this.logger.error(`Error consultando API Nacional: ${error.message}`);
//       return 0;
//     }
//   }

//   /**
//    * Formatea la respuesta para el bot con datos reales.
//    */
//   async getFormattedAnalysis(eventName: string, region: string): Promise<string | null> {
//     const total = await this.getCasesByEvent(eventName, region);

//     if (total === 0) return null;

//     return `--- DETALLE SIVIGILA: ${eventName.toUpperCase()} ---
// 📍 **Región:** ${region.toUpperCase()}
// 👥 **Casos Totales (Reporte 2020):** ${total}
// ℹ️ *Nota:* Datos obtenidos en tiempo real de la API oficial de SIVIGILA Nacional.`;
//   }

//   /**
//    * Compara casos de un evento entre dos regiones.
//    */
//   async compareRegionalCases(eventName: string, reg1: string, reg2: string): Promise<string> {
//     const cases1 = await this.getCasesByEvent(eventName, reg1);
//     const cases2 = await this.getCasesByEvent(eventName, reg2);

//     if (cases1 === 0 && cases2 === 0) {
//       return `No se encontraron registros de ${eventName.toUpperCase()} en ${reg1.toUpperCase()} ni en ${reg2.toUpperCase()}.`;
//     }

//     const diff = Math.abs(cases1 - cases2);
//     const winner = cases1 > cases2 ? reg1.toUpperCase() : reg2.toUpperCase();
//     const pct = cases1 > 0 && cases2 > 0 ? (diff / Math.min(cases1, cases2) * 100).toFixed(1) : '100+';

//     return `--- COMPARATIVA SIVIGILA: ${eventName.toUpperCase()} ---
// 📍 **${reg1.toUpperCase()}**: ${cases1} casos
// 📍 **${reg2.toUpperCase()}**: ${cases2} casos

// 📈 La incidencia es mayor en **${winner}** por una diferencia de ${diff} casos (${pct}% de diferencia).
// ℹ️ *Fuente: API SODA SIVIGILA Nacional 2020*`;
//   }
// }

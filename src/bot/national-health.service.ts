import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface NationalHealthEvent {
  nombre_evento: string;
  municipio_ocurrencia: string;
  departamento_ocurrencia: string;
  conteo: string;
  ano: string;
  semana: string;
}

@Injectable()
export class NationalHealthService {
  private readonly logger = new Logger(NationalHealthService.name);
  private readonly API_URL = 'https://www.datos.gov.co/resource/4hyg-wa9d.json';

  /**
   * Busca casos de un evento específico en un municipio o departamento.
   */
  async getCasesByEvent(eventName: string, region: string): Promise<number> {
    try {
      const normEvent = eventName.toUpperCase();
      const normRegion = region.toUpperCase();

      this.logger.log(`Consultando API SIVIGILA Nacional para: ${normEvent} en ${normRegion}`);

      // Intentamos buscar por municipio O por departamento
      const response = await axios.get<NationalHealthEvent[]>(this.API_URL, {
        params: {
          $where: `nombre_evento like '%${normEvent}%' AND (municipio_ocurrencia = '${normRegion}' OR departamento_ocurrencia = '${normRegion}')`,
          ano: '2020',
        },
      });

      const totalCases = response.data.reduce((sum, item) => sum + parseInt(item.conteo || '0', 10), 0);
      return totalCases;
    } catch (error) {
      this.logger.error(`Error consultando API Nacional: ${error.message}`);
      return 0;
    }
  }

  /**
   * Formatea la respuesta para el bot con datos reales.
   */
  async getFormattedAnalysis(eventName: string, region: string): Promise<string | null> {
    const total = await this.getCasesByEvent(eventName, region);
    
    if (total === 0) return null;

    return `--- DETALLE SIVIGILA: ${eventName.toUpperCase()} ---
📍 **Región:** ${region.toUpperCase()}
👥 **Casos Totales (Reporte 2020):** ${total}
ℹ️ *Nota:* Datos obtenidos en tiempo real de la API oficial de SIVIGILA Nacional.`;
  }

  /**
   * Compara casos de un evento entre dos regiones.
   */
  async compareRegionalCases(eventName: string, reg1: string, reg2: string): Promise<string> {
    const cases1 = await this.getCasesByEvent(eventName, reg1);
    const cases2 = await this.getCasesByEvent(eventName, reg2);

    if (cases1 === 0 && cases2 === 0) {
      return `No se encontraron registros de ${eventName.toUpperCase()} en ${reg1.toUpperCase()} ni en ${reg2.toUpperCase()}.`;
    }

    const diff = Math.abs(cases1 - cases2);
    const winner = cases1 > cases2 ? reg1.toUpperCase() : reg2.toUpperCase();
    const pct = cases1 > 0 && cases2 > 0 ? (diff / Math.min(cases1, cases2) * 100).toFixed(1) : '100+';

    return `--- COMPARATIVA SIVIGILA: ${eventName.toUpperCase()} ---
📍 **${reg1.toUpperCase()}**: ${cases1} casos
📍 **${reg2.toUpperCase()}**: ${cases2} casos

📈 La incidencia es mayor en **${winner}** por una diferencia de ${diff} casos (${pct}% de diferencia).
ℹ️ *Fuente: API SODA SIVIGILA Nacional 2020*`;
  }
}

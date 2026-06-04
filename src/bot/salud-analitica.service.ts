import { Injectable, Logger } from '@nestjs/common';
import { SaludPublicaService } from './salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { HealthEvent } from './health-data.service';
import { NationalHealthService } from './national-health.service';

@Injectable()
export class SaludAnaliticaService {
  private readonly logger = new Logger(SaludAnaliticaService.name);

  private readonly MAPEO_EVENTO_VACUNA: Record<string, string> = {
    tuberculosis: 'bcg',
    'tos ferina': 'penta',
    difteria: 'penta',
    tétanos: 'penta',
    meningitis: 'penta',
    'hepatitis b, c y coinfección hepatitis b y delta': 'hepatitis',
    'hepatitis a': 'hepatitis',
    'hepatitis b': 'hepatitis',
    sarampión: 'tv',
    rubéola: 'tv',
    parotiditis: 'tv',
    'agresiones por animales potencialmente transmisores de rabia': 'rabia',
    dengue: 'dengue',
    zika: 'zika',
    polio: 'polio',
    'fiebre amarilla': 'fiebre amarilla',
  };

  constructor(
    private readonly saludPublicaService: SaludPublicaService,
    private readonly vaccinationService: VaccinationService,
    private readonly nationalHealthService: NationalHealthService,
  ) {}

  /**
   * Genera un análisis de riesgo mejorado incluyendo datos de vacunación.
   */
  public async analizarRiesgoEvento(
    nombreEvento: string,
    departamento: string = 'Antioquia',
  ): Promise<string> {
    console.log(
      `DEBUG: analizarRiesgoEvento - Inicio: evento=${nombreEvento}, depto=${departamento}`,
    );

    // 1. Intentamos usar la API Nacional para CUALQUIER región detectada (excepto si queremos forzar el XML de Antioquia)
    // Pero como prioridad, si hay una región específica, la API Nacional es más fresca.
    const isAntioquia = departamento.toLowerCase() === 'antioquia';

    if (!isAntioquia) {
      console.log(
        `DEBUG: analizarRiesgoEvento - Consultando NationalHealthService para ${departamento}`,
      );
      const nationalResult =
        await this.nationalHealthService.getFormattedAnalysis(
          nombreEvento,
          departamento,
        );

      if (nationalResult) {
        const vacMsg = await this.analizarVacunacion(
          nombreEvento,
          departamento,
        );
        let finalMsg = nationalResult;

        if (vacMsg) {
          finalMsg += `\n\n--- ANÁLISIS DE RIESGO ---\n${vacMsg}`;
          if (vacMsg.includes('🚨')) {
            finalMsg += `\n\n🛡️ **ACCIÓN PREVENTIVA SUGERIDA:**\nDebido a la incidencia registrada y/o baja cobertura en ${departamento}, se recomienda reforzar los esquemas de vacunación y extremar medidas de autocuidado.`;
          }
        }
        return finalMsg;
      }
    }

    // 2. Fallback a la lógica original (SIVIGILA XML + Antioquia referencia)
    let eventos = await this.saludPublicaService.buscarEventosAmbigua(
      nombreEvento,
      departamento,
    );

    let esReferencia = false;

    if (eventos.length === 0 && departamento.toLowerCase() !== 'antioquia') {
      eventos = await this.saludPublicaService.buscarEventosAmbigua(
        nombreEvento,
        'Antioquia',
      );
      esReferencia = true;
    }

    if (eventos.length === 0) {
      return `⚠️ No tengo registros de casos para ${nombreEvento} en mi base de datos de salud pública.`;
    }

    const e = eventos[0];
    const total = e.total_de_eventos;

    if (total === 0) {
      return `ℹ️ El evento "${e.nombre_del_evento}" no registra casos actualmente.`;
    }

    let alerta = `--- ANÁLISIS DE RIESGO: ${e.nombre_del_evento} ---\n`;

    const normalizedEvento = nombreEvento
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const entry = Object.entries(this.MAPEO_EVENTO_VACUNA).find(
      ([key]) =>
        key
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase() === normalizedEvento,
    );
    const isVaccinePreventable = !!entry;

    if (esReferencia) {
      const context = isVaccinePreventable
        ? ', comparados con la vacunación local'
        : '';
      alerta += `📍 *Nota:* Los casos estadísticos corresponden a Antioquia (región de referencia)${context} en ${departamento}.\n\n`;
    }

    const indicadores: string[] = [];

    const zonaMsg = this.analizarZona(e, total);
    if (zonaMsg) indicadores.push(zonaMsg);

    const cicloMsg = this.analizarCicloDeVida(e, total);
    if (cicloMsg) indicadores.push(cicloMsg);

    const vacMsg = isVaccinePreventable
      ? await this.analizarVacunacion(nombreEvento, departamento)
      : null;
    if (vacMsg) indicadores.push(vacMsg);

    if (indicadores.length > 0) {
      alerta += indicadores.join('\n');
    } else {
      alerta += '✅ Los indicadores actuales no muestran alertas críticas.';
    }

    if (isVaccinePreventable && indicadores.some((i) => i.includes('🚨'))) {
      alerta += `\n\n🛡️ **ACCIÓN PREVENTIVA SUGERIDA:**\nDebido a la incidencia registrada y/o baja cobertura en ${departamento}, se recomienda reforzar los esquemas de vacunación y extremar medidas de autocuidado.`;
    } else if (indicadores.some((i) => i.includes('🚨'))) {
      alerta += `\n\n🛡️ **RECOMENDACIÓN:**\nSe ha detectado una situación de riesgo para **${nombreEvento.toUpperCase()}** en ${departamento}. Se recomienda fortalecer los programas de prevención y seguimiento institucional.`;
    }

    return alerta;
  }

  private analizarZona(e: HealthEvent, total: number): string | null {
    const pctRural = (e.rural / total) * 100;
    if (pctRural > 60) {
      return '🚨 Alta concentración en zona RURAL.';
    } else if (pctRural > 40) {
      return '⚠️ Distribución equilibrada.';
    }
    return null;
  }

  private analizarCicloDeVida(e: HealthEvent, total: number): string | null {
    const casosInfantiles = e.primera_infancia + e.infancia;
    const pctInfantil = (casosInfantiles / total) * 100;
    if (pctInfantil > 50) {
      return '🚨 Alta incidencia en población INFANTIL.';
    }
    return null;
  }

  private async analizarVacunacion(
    nombreEvento: string,
    departamento: string,
  ): Promise<string | null> {
    try {
      const lowerEvento = nombreEvento
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const entry = Object.entries(this.MAPEO_EVENTO_VACUNA).find(
        ([key]) =>
          key
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase() === lowerEvento,
      );

      const terminoBusqueda = entry ? entry[1] : null;
      if (!terminoBusqueda) return null;

      const coberturas =
        await this.vaccinationService.getCoverageByDepartment(departamento);

      const coberturaRelevante = coberturas.find((c) =>
        c.biol_gico.toLowerCase().includes(terminoBusqueda),
      );

      if (coberturaRelevante) {
        const rawVal = parseFloat(coberturaRelevante.cobertura_de_vacunaci_n);

        /**
         * NOTA: Se asume que valores <= 1 son proporciones (0.0–1.0) y > 1 son porcentajes directos.
         * Esta es una asunción basada en la variabilidad de la fuente de datos.
         */
        const val = rawVal <= 1 ? rawVal * 100 : rawVal;
        const esPorcentaje = rawVal <= 1;
        const textoCobertura = esPorcentaje
          ? `${val.toFixed(2)}%`
          : `${val} dosis`;

        if (esPorcentaje && val < 80) {
          return `🚨 Cobertura de vacunación baja en ${departamento} (${textoCobertura}).`;
        } else {
          return `✅ Cobertura de vacunación registrada en ${departamento} (${textoCobertura}).`;
        }
      } else {
        return null;
      }
    } catch (error) {
      this.logger.warn(
        `Error al consultar vacunación para ${departamento}: ${error.message}`,
      );
      return 'ℹ️ No se pudieron consultar datos de vacunación actuales.';
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DatasetBuilderService } from './dataset-builder.service';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { AirQualityService } from './air/air-quality.service';

/**
 * Niveles de riesgo epidemiológico con su rango de score (0-100).
 */
export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';

export interface ResultadoPrediccion {
  evento: string;
  departamento: string;
  nivel_riesgo: NivelRiesgo;
  score: number; // 0-100
  factores: FactorRiesgo[];
  recomendacion: string;
  resumen: string;
}

export interface FactorRiesgo {
  nombre: string;
  valor: string;
  contribucion: 'alto' | 'medio' | 'bajo';
  emoji: string;
}

// ─── Interfaces para tipado fuerte ──────────────────────────────────────────────

interface EventoData {
  nombre_del_evento: string;
  total_de_eventos: string | number;
  rural?: string | number;
  [key: string]: unknown;
}

interface CoberturaVacunacionItem {
  cobertura_de_vacunaci_n: string | number;
  [key: string]: unknown;
}

interface CalidadAireItem {
  variable: string;
  promedio?: string | number;
  valor?: string | number;
  unidades?: string;
  [key: string]: unknown;
}

// ─── Configuración de thresholds ────────────────────────────────────────────────

interface UmbralesCasos {
  critico: number;
  alto: number;
  medio: number;
}

interface UmbralesCobertura {
  critica: number;   // < 60% → riesgo crítico
  baja: number;      // < 80% → riesgo alto
  media: number;     // < 90% → riesgo medio
}

const UMBRALES_CASOS: UmbralesCasos = {
  critico: 50_000,
  alto: 20_000,
  medio: 5_000,
};

const UMBRALES_COBERTURA: UmbralesCobertura = {
  critica: 0.6,
  baja: 0.8,
  media: 0.9,
};

// ─── Helpers privados reutilizables ────────────────────────────────────────────

type ScoreFactorResult = { score: number; factor: FactorRiesgo };

const NIVELES_RIESGO: NivelRiesgo[] = ['BAJO', 'MEDIO', 'ALTO', 'CRÍTICO'];

const CONTRIBUCION_EMOJIS: Record<string, { emoji: string; label: string }> = {
  alto: { emoji: '🔴', label: 'alto' },
  medio: { emoji: '🟠', label: 'medio' },
  bajo: { emoji: '🟢', label: 'bajo' },
};

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly datasetBuilder: DatasetBuilderService,
    private readonly saludPublicaService: SaludPublicaService,
    private readonly vaccinationService: VaccinationService,
    private readonly airQualityService: AirQualityService,
  ) { }

  /**
   * Genera una predicción de riesgo multi-factor para un evento y departamento.
   */
  public async predictRisk(departamento: string, evento: string): Promise<string> {
    if (!departamento || typeof departamento !== 'string' || !departamento.trim()) {
      return `⚠️ Parámetros inválidos: el departamento es requerido.`;
    }
    if (!evento || typeof evento !== 'string' || !evento.trim()) {
      return `⚠️ Parámetros inválidos: el evento es requerido.`;
    }

    this.logger.log(`📊 Generando predicción multi-factor para "${evento}" en ${departamento}`);

    const resultado = await this.calcularRiesgo(departamento, evento);

    if (!resultado) {
      return `⚠️ No se encontraron datos suficientes para predecir el riesgo de **${evento}** en **${departamento}**.\n\n`
        + 'Verifica que el nombre del evento y el departamento estén escritos correctamente.';
    }

    return this.formatearRespuesta(resultado);
  }

  /**
   * Calcula el score de riesgo compuesto (0-100) cruzando múltiples fuentes de datos.
   * Paraleliza las consultas async para mejor performance.
   */
  public async calcularRiesgo(
    departamento: string,
    evento: string,
  ): Promise<ResultadoPrediccion | null> {
    try {
      // ── 1. Datos de SIVIGILA ───────────────────────────────────────────────────
      const eventos = await this.saludPublicaService.buscarEventosAmbigua(evento);
      if (!eventos || eventos.length === 0) return null;

      const eventData = eventos[0] as unknown as EventoData;
      const totalCasos = Number(eventData.total_de_eventos) || 0;
      if (totalCasos === 0) return null;

      const factores: FactorRiesgo[] = [];

      // ── 2. Factor A: Volumen de casos (peso: 35 pts) ────────────────────────────
      const scoreCasos = this.calcularScoreCasos(totalCasos);
      factores.push(this.crearFactorCasos(totalCasos, scoreCasos));

      // ── 3. Factores B, C, D en paralelo ────────────────────────────────────────
      const [scoreGeo, scoreVacuna, scoreAire] = await Promise.all([
        Promise.resolve(this.calcularScoreGeografico(eventData, totalCasos)),
        this.calcularScoreVacunacion(departamento),
        this.calcularScoreAire(departamento),
      ]);

      factores.push(scoreGeo.factor);
      factores.push(scoreVacuna.factor);
      factores.push(scoreAire.factor);

      // ── 4. Normalizar score final a 0-100 ──────────────────────────────────────
      const scoreAcumulado = scoreCasos + scoreGeo.score + scoreVacuna.score + scoreAire.score;
      const scoreFinal = Math.min(100, Math.max(0, Math.round(scoreAcumulado)));
      const nivel = this.mapearNivel(scoreFinal);

      return {
        evento: eventData.nombre_del_evento,
        departamento,
        nivel_riesgo: nivel,
        score: scoreFinal,
        factores,
        recomendacion: this.generarRecomendacion(nivel, evento, departamento),
        resumen: this.generarResumen(nivel, scoreFinal, totalCasos, departamento),
      };
    } catch (error: any) {
      this.logger.error(`Error calculando riesgo para "${evento}" en ${departamento}: ${error.message}`);
      return null;
    }
  }

  // ─── Cálculo de scores por factor ────────────────────────────────────────────

  /** Factor A: casos SIVIGILA → máx 35 pts */
  private calcularScoreCasos(total: number): number {
    if (total >= UMBRALES_CASOS.critico) return 35;
    if (total >= UMBRALES_CASOS.alto) return 25;
    if (total >= UMBRALES_CASOS.medio) return 15;
    return 5;
  }

  /** Factor B: distribución geográfica → máx 15 pts */
  private calcularScoreGeografico(
    eventData: EventoData,
    total: number,
  ): ScoreFactorResult {
    const rural = Number(eventData.rural) || 0;
    const pctRural = total > 0 ? (rural / total) * 100 : 0;

    let score = 0;
    let descripcion = '';
    let contribucion: FactorRiesgo['contribucion'] = 'bajo';

    if (pctRural >= 60) {
      score = 15;
      descripcion = `Alta concentración rural (${pctRural.toFixed(0)}%) — posible subregistro`;
      contribucion = 'alto';
    } else if (pctRural >= 40) {
      score = 8;
      descripcion = `Presencia rural significativa (${pctRural.toFixed(0)}%)`;
      contribucion = 'medio';
    } else {
      score = 3;
      descripcion = `Predominantemente urbano (${(100 - pctRural).toFixed(0)}%)`;
      contribucion = 'bajo';
    }

    return {
      score,
      factor: {
        nombre: 'Distribución geográfica',
        valor: descripcion,
        contribucion,
        emoji: CONTRIBUCION_EMOJIS[contribucion].emoji,
      },
    };
  }

  /** Factor C: cobertura de vacunación → máx 35 pts */
  private async calcularScoreVacunacion(departamento: string): Promise<ScoreFactorResult> {
    try {
      const vacunacion = await this.vaccinationService.getCoverageByDepartment(departamento);

      if (!vacunacion || vacunacion.length === 0) {
        return this.resultadoFactorDefecto(
          'Cobertura de vacunación',
          'Sin datos disponibles para este departamento',
          'medio',
        );
      }

      const coberturas = (vacunacion as unknown as CoberturaVacunacionItem[])
        .map(v => parseFloat(String(v.cobertura_de_vacunaci_n)))
        .filter((c): c is number => !isNaN(c) && c > 0);

      if (coberturas.length === 0) {
        return this.resultadoFactorDefecto(
          'Cobertura de vacunación',
          'Datos de cobertura no válidos',
          'medio',
        );
      }

      const avgCobertura = coberturas.reduce((a, b) => a + b, 0) / coberturas.length;

      if (avgCobertura < UMBRALES_COBERTURA.critica) {
        return this.resultadoFactorConPuntaje(
          'Cobertura de vacunación',
          `Cobertura crítica: ${(avgCobertura * 100).toFixed(1)}% (< 60%)`,
          35,
          'alto',
        );
      }
      if (avgCobertura < UMBRALES_COBERTURA.baja) {
        return this.resultadoFactorConPuntaje(
          'Cobertura de vacunación',
          `Cobertura baja: ${(avgCobertura * 100).toFixed(1)}% (< 80%)`,
          22,
          'alto',
        );
      }
      if (avgCobertura < UMBRALES_COBERTURA.media) {
        return this.resultadoFactorConPuntaje(
          'Cobertura de vacunación',
          `Cobertura sub-óptima: ${(avgCobertura * 100).toFixed(1)}% (< 90%)`,
          12,
          'medio',
        );
      }

      return this.resultadoFactorConPuntaje(
        'Cobertura de vacunación',
        `Cobertura adecuada: ${(avgCobertura * 100).toFixed(1)}%`,
        4,
        'bajo',
      );
    } catch (error: any) {
      this.logger.warn(`Error calculando score de vacunación: ${error.message}`);
      return this.resultadoFactorDefecto(
        'Cobertura de vacunación',
        'Error al obtener datos de vacunación',
        'medio',
      );
    }
  }

  /** Factor D: calidad del aire → máx 15 pts */
  private async calcularScoreAire(departamento: string): Promise<ScoreFactorResult> {
    try {
      const datosAire = await this.airQualityService.getAirQualityByMunicipio(departamento);

      if (!datosAire || datosAire.length === 0) {
        return this.resultadoFactorDefecto(
          'Calidad del aire',
          'Sin datos de calidad del aire disponibles',
          'bajo',
        );
      }

      const pm25 = this.buscarIndicadorAire(datosAire, ['pm2', 'pm 2']);
      const pm10 = this.buscarIndicadorAire(datosAire, ['pm10', 'pm 10']);
      const indicadorPrincipal = pm25 || pm10 || datosAire[0];

      const promedio = parseFloat(
        String(indicadorPrincipal?.promedio ?? indicadorPrincipal?.valor ?? '0'),
      );
      const variable = (indicadorPrincipal?.variable as string) || 'Indicador ambiental';

      if (!isNaN(promedio) && promedio > 0) {
        // Umbrales OMS para PM2.5 (µg/m³)
        if (promedio >= 50) {
          return this.resultadoFactorConPuntaje(
            'Calidad del aire',
            `${variable}: ${promedio.toFixed(1)} µg/m³ — Calidad PELIGROSA`,
            15,
            'alto',
          );
        }
        if (promedio >= 25) {
          return this.resultadoFactorConPuntaje(
            'Calidad del aire',
            `${variable}: ${promedio.toFixed(1)} µg/m³ — Calidad MALA`,
            10,
            'medio',
          );
        }
        if (promedio >= 10) {
          return this.resultadoFactorConPuntaje(
            'Calidad del aire',
            `${variable}: ${promedio.toFixed(1)} µg/m³ — Calidad MODERADA`,
            5,
            'medio',
          );
        }

        return this.resultadoFactorConPuntaje(
          'Calidad del aire',
          `${variable}: ${promedio.toFixed(1)} µg/m³ — Calidad BUENA`,
          2,
          'bajo',
        );
      }

      return this.resultadoFactorDefecto(
        'Calidad del aire',
        `${datosAire.length} variable(s) monitoreada(s) — sin umbral disponible`,
        'bajo',
      );
    } catch (error: any) {
      this.logger.warn(`Error calculando score de calidad del aire: ${error.message}`);
      return this.resultadoFactorDefecto(
        'Calidad del aire',
        'Error al obtener datos ambientales',
        'bajo',
      );
    }
  }

  // ─── Utilidades ──────────────────────────────────────────────────────────────

  private mapearNivel(score: number): NivelRiesgo {
    if (score >= 80) return 'CRÍTICO';
    if (score >= 60) return 'ALTO';
    if (score >= 30) return 'MEDIO';
    return 'BAJO';
  }

  private generarRecomendacion(
    nivel: NivelRiesgo,
    evento: string,
    departamento: string,
  ): string {
    const base = `**${evento}** en **${departamento}**`;
    switch (nivel) {
      case 'CRÍTICO':
        return `🚨 ${base}: ACTIVAR PROTOCOLO DE EMERGENCIA. Notificar autoridades sanitarias. `
          + 'Movilizar recursos del COE (Centro de Operaciones de Emergencia), '
          + 'reforzar capacidad hospitalaria y ejecutar campaña masiva de prevención.';
      case 'ALTO':
        return `⚠️ ${base}: ALERTA SANITARIA. Intensificar vigilancia epidemiológica activa. `
          + 'Reforzar esquemas de vacunación en poblaciones vulnerables, '
          + 'aumentar puntos de diagnóstico y preparar plan de contingencia.';
      case 'MEDIO':
        return `📋 ${base}: REQUIERE ATENCIÓN. Mantener monitoreo semanal. `
          + 'Verificar coberturas de vacunación y condiciones ambientales. '
          + 'Reforzar medidas preventivas en zonas rurales.';
      default:
        return `🟢 ${base}: BAJO RIESGO. Continuar con vigilancia rutinaria. `
          + 'Mantener esquemas de vacunación al día y monitoreo pasivo de casos.';
    }
  }

  private generarResumen(
    nivel: NivelRiesgo,
    score: number,
    casos: number,
    departamento: string,
  ): string {
    const emojis: Record<NivelRiesgo, string> = {
      CRÍTICO: '🔴',
      ALTO: '🟠',
      MEDIO: '🟡',
      BAJO: '🟢',
    };
    return `${emojis[nivel]} Riesgo **${nivel}** (score: ${score}/100) para ${departamento} `
      + `con ${casos.toLocaleString('es-CO')} casos registrados en SIVIGILA.`;
  }

  private formatearRespuesta(r: ResultadoPrediccion): string {
    const barraScore = this.generarBarraProgreso(r.score);
    const emojisNivel: Record<NivelRiesgo, string> = {
      CRÍTICO: '🔴',
      ALTO: '🟠',
      MEDIO: '🟡',
      BAJO: '🟢',
    };

    let texto = `🤖 **PREDICCIÓN DE RIESGO EPIDEMIOLÓGICO**\n\n`;
    texto += `📍 Evento: **${r.evento}**\n`;
    texto += `🗺️ Departamento: **${r.departamento}**\n\n`;
    texto += `${emojisNivel[r.nivel_riesgo]} **Nivel de Riesgo: ${r.nivel_riesgo}**\n`;
    texto += `📊 Score compuesto: ${r.score}/100\n`;
    texto += `${barraScore}\n\n`;
    texto += `─────────────────────────\n`;
    texto += `📋 **Factores analizados:**\n\n`;

    for (const factor of r.factores) {
      texto += `${factor.emoji} **${factor.nombre}**\n`;
      texto += `   └ ${factor.valor}\n\n`;
    }

    texto += `─────────────────────────\n`;
    texto += `💡 **Recomendación:**\n${r.recomendacion}\n\n`;
    texto += `_Análisis basado en: SIVIGILA, cobertura de vacunación PAI, calidad del aire (datos.gov.co)_`;

    return texto;
  }

  private generarBarraProgreso(score: number): string {
    const llenos = Math.round(score / 10);
    const vacios = 10 - llenos;
    return `[${'█'.repeat(llenos)}${'░'.repeat(vacios)}] ${score}%`;
  }

  // ─── Métodos auxiliares privados ─────────────────────────────────────────────

  private crearFactorCasos(totalCasos: number, score: number): FactorRiesgo {
    const contribucion: FactorRiesgo['contribucion'] = score >= 25 ? 'alto' : score >= 12 ? 'medio' : 'bajo';
    return {
      nombre: 'Volumen de casos (SIVIGILA)',
      valor: `${totalCasos.toLocaleString('es-CO')} casos reportados`,
      contribucion,
      emoji: CONTRIBUCION_EMOJIS[contribucion].emoji,
    };
  }

  private resultadoFactorConPuntaje(
    nombre: string,
    valor: string,
    score: number,
    contribucion: 'alto' | 'medio' | 'bajo',
  ): ScoreFactorResult {
    return {
      score,
      factor: {
        nombre,
        valor,
        contribucion,
        emoji: CONTRIBUCION_EMOJIS[contribucion].emoji,
      },
    };
  }

  private resultadoFactorDefecto(
    nombre: string,
    valor: string,
    contribucion: 'alto' | 'medio' | 'bajo',
  ): ScoreFactorResult {
    // Score bajo por defecto cuando no hay datos
    const score = contribucion === 'alto' ? 10 : contribucion === 'medio' ? 5 : 2;
    return this.resultadoFactorConPuntaje(nombre, valor, score, contribucion);
  }

  private buscarIndicadorAire(datos: CalidadAireItem[], keywords: string[]): CalidadAireItem | undefined {
    return datos.find((d: CalidadAireItem) =>
      keywords.some((kw) => (d.variable || '').toLowerCase().includes(kw)),
    );
  }
}
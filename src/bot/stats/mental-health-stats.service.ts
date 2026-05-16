import { Injectable, Logger } from '@nestjs/common';
import { MentalHealthService } from '../mental-health.service';

@Injectable()
export class MentalHealthStatsService {
  private readonly logger = new Logger(MentalHealthStatsService.name);

  constructor(private readonly mentalHealthService: MentalHealthService) {}

  /**
   * Analiza la salud mental agrupando por ciclos de vida.
   */
  async getMentalHealthLifeCycleAnalysis(
    diagnosisName: string,
  ): Promise<string> {
    this.logger.log(`Analyzing life cycle for mental health: ${diagnosisName}`);
    const stats =
      await this.mentalHealthService.getStatsForDiagnosis(diagnosisName);
    if (!stats)
      return `No hay datos de edad disponibles para el diagnóstico de salud mental '${diagnosisName}'.`;

    const total = stats.total;
    const lifeCycles = {
      'Niñez (0-14)':
        stats.menor_a_1 + stats.de_1_a_4 + stats.de_5_a_9 + stats.de_10_a_14,
      'Adolescencia y Juventud (15-24)':
        stats.de_15_a_19 + stats.de_20_a_49 * 0.1, // Estimación simple para juventud
      'Adultez (25-64)': stats.de_20_a_49 * 0.9 + stats.de_50_a_64,
      'Vejez (65+)': stats._65_y_mas,
    };

    const sortedCycles = Object.entries(lifeCycles).sort(
      ([, a], [, b]) => b - a,
    );
    const topCycle = sortedCycles[0];
    const topPerc = total > 0 ? ((topCycle[1] / total) * 100).toFixed(1) : 0;

    let details = sortedCycles
      .map(
        ([label, value]) =>
          `${label}: ${Math.round(value)} casos (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
      )
      .join('\n');

    return `
--- ANÁLISIS DE CICLO DE VIDA (SALUD MENTAL): ${stats.diagnostico_ingreso} ---
Total Casos: ${total}
🌟 Etapa más vulnerable: ${topCycle[0]} con ${topPerc}% de los casos.
Desglose por etapas:
${details}
Conclusión: El diagnóstico muestra una mayor prevalencia en la etapa de ${topCycle[0]}.
`;
  }

  /**
   * Resumen de capacidades de datos de salud mental.
   */
  async getMentalHealthKnowledgeSummary(): Promise<string> {
    const diagnoses = await this.mentalHealthService.getAllDiagnoses();
    return `
--- SALUD MENTAL (CIE-10) ---
🧠 Poseo registros de atención para ${diagnoses.length} tipos de diagnósticos según la clasificación CIE-10.
📍 Capacidad: Análisis de prevalencia por ciclos de vida, desde la niñez hasta la vejez.
`;
  }
}

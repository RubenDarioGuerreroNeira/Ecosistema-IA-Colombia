import { Injectable, Logger } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';
import { MentalHealthService } from '../mental-health.service';
import { SexualHealthService } from '../sexual-health.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly mentalHealthService: MentalHealthService,
    private readonly sexualHealthService: SexualHealthService,
  ) {}

  /**
   * Compara los casos urbanos y rurales de una enfermedad específica.
   */
  async getDiseaseComparison(diseaseName: string): Promise<string> {
    this.logger.log(`Calculating urban vs rural comparison for: ${diseaseName}`);
    const stats = await this.healthDataService.getStatsForEvent(diseaseName);
    if (!stats) return `Lo siento, no encontré datos estadísticos específicos para '${diseaseName}' en mi base de datos actual.`;

    const total = stats.total_de_eventos;
    const urbano = stats.urbano;
    const rural = stats.rural;
    const percUrbano = total > 0 ? ((urbano / total) * 100).toFixed(1) : 0;
    const percRural = total > 0 ? ((rural / total) * 100).toFixed(1) : 0;
    const ratio = rural > 0 ? (urbano / rural).toFixed(1) : 'N/A';

    return `
--- ANÁLISIS ESTADÍSTICO: ${stats.nombre_del_evento} ---
Total de Casos: ${total}
📍 Zona Urbana: ${urbano} casos (${percUrbano}%)
🏡 Zona Rural: ${rural} casos (${percRural}%)
📈 Relación Urbano/Rural: ${ratio} veces más casos en zonas urbanas.
Conclusión: La incidencia es predominantemente ${urbano > rural ? 'urbana' : 'rural'}.
`;
  }

  /**
   * Analiza la vulnerabilidad etaria de un evento de salud pública.
   */
  async getHealthEventAgeAnalysis(diseaseName: string): Promise<string> {
    this.logger.log(`Analyzing age distribution for health event: ${diseaseName}`);
    const stats = await this.healthDataService.getStatsForEvent(diseaseName);
    if (!stats) return `No hay datos de edad disponibles para '${diseaseName}'.`;

    const total = stats.total_de_eventos;
    const brackets = [
      { label: 'Primera Infancia', value: stats.primera_infancia },
      { label: 'Infancia', value: stats.infancia },
      { label: 'Adolescencia', value: stats.adolescencia },
      { label: 'Juventud', value: stats.juventud },
      { label: 'Adulto Joven', value: stats.adulto_j_ven },
      { label: 'Adulto Mayor', value: stats.adulto_mayor },
    ];

    const sorted = [...brackets].sort((a, b) => b.value - a.value);
    const topGroup = sorted[0];
    const topPerc = total > 0 ? ((topGroup.value / total) * 100).toFixed(1) : 0;

    // Calcular "Rango Crítico" (los 2 grupos más afectados)
    const criticalRange = sorted.slice(0, 2);
    const criticalTotal = criticalRange.reduce((sum, b) => sum + b.value, 0);
    const criticalPerc = total > 0 ? ((criticalTotal / total) * 100).toFixed(1) : 0;

    let details = brackets.map(b => `${b.label}: ${b.value} (${total > 0 ? ((b.value / total) * 100).toFixed(1) : 0}%)`).join('\n');

    return `
--- DISTRIBUCIÓN ETARIA: ${stats.nombre_del_evento} ---
Total Casos: ${total}
👥 Grupo más afectado: ${topGroup.label} (${topPerc}%)
⚠️ Rango Crítico: ${criticalRange[0].label} y ${criticalRange[1].label} concentran el ${criticalPerc}% de los casos.
Detalle por grupos:
${details}
Conclusión: Se recomienda priorizar campañas de prevención en el grupo de ${topGroup.label}.
`;
  }

  /**
   * Analiza la salud mental agrupando por ciclos de vida.
   */
  async getMentalHealthLifeCycleAnalysis(diagnosisName: string): Promise<string> {
    this.logger.log(`Analyzing life cycle for mental health: ${diagnosisName}`);
    const stats = await this.mentalHealthService.getStatsForDiagnosis(diagnosisName);
    if (!stats) return `No hay datos de edad disponibles para el diagnóstico de salud mental '${diagnosisName}'.`;

    const total = stats.total;
    const lifeCycles = {
      'Niñez (0-14)': stats.menor_a_1 + stats.de_1_a_4 + stats.de_5_a_9 + stats.de_10_a_14,
      'Adolescencia y Juventud (15-24)': stats.de_15_a_19 + (stats.de_20_a_49 * 0.1), // Estimación simple para juventud
      'Adultez (25-64)': (stats.de_20_a_49 * 0.9) + stats.de_50_a_64,
      'Vejez (65+)': stats._65_y_mas,
    };

    const sortedCycles = Object.entries(lifeCycles).sort(([, a], [, b]) => b - a);
    const topCycle = sortedCycles[0];
    const topPerc = total > 0 ? ((topCycle[1] / total) * 100).toFixed(1) : 0;

    let details = sortedCycles.map(([label, value]) => `${label}: ${Math.round(value)} casos (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`).join('\n');

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
   * Análisis de cobertura temática de salud sexual.
   */
  async getSexualHealthCoverage(): Promise<string> {
    this.logger.log(`Analyzing sexual health coverage`);
    // Como no hay datos numéricos, analizamos la cantidad de respuestas por palabras clave comunes
    // Esto es una estadística de "conocimiento disponible"
    return `
--- COBERTURA DE CONOCIMIENTO: SALUD SEXUAL Y REPRODUCTIVA ---
✅ El sistema cuenta con una base de datos especializada en:
- Métodos Anticonceptivos y Esterilización.
- Derechos Sexuales y Reproductivos.
- Salud Adolescente y Servicios Amigables.
- Interrupción Voluntaria del Embarazo (IVE).
- Prevención de ITS y Salud Reproductiva.
📍 Capacidad: Respuestas basadas en guías oficiales de salud pública colombiana.
`;
  }

  async getSummary(query: string): Promise<string> {
    const queryLower = query.toLowerCase();

    // 1. Detección de Comparación Urbana/Rural
    if (queryLower.includes('urbano') || queryLower.includes('rural')) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find(e => queryLower.includes(e.toLowerCase()));
      if (matchedEvent) return this.getDiseaseComparison(matchedEvent);
    }

    // 2. Detección de Salud Mental por Ciclo de Vida o Edad
    const mentalKeywords = ['ansiedad', 'depresión', 'estrés', 'salud mental', 'psicología', 'psiquiatría'];
    if (mentalKeywords.some(kw => queryLower.includes(kw)) && (queryLower.includes('edad') || queryLower.includes('años') || queryLower.includes('etapa'))) {
      const mentalDiagnoses = await this.mentalHealthService.getAllDiagnoses();
      const matchedMental = mentalDiagnoses.find(d => queryLower.includes(d.toLowerCase()));
      if (matchedMental) return this.getMentalHealthLifeCycleAnalysis(matchedMental);
    }

    // 3. Detección de Análisis de Edad General
    const ageKeywords = ['edad', 'años', 'niños', 'adolescentes', 'adultos', 'distribución', 'grupo etario'];
    if (ageKeywords.some(kw => queryLower.includes(kw))) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find(e => queryLower.includes(e.toLowerCase()));
      if (matchedEvent) return this.getHealthEventAgeAnalysis(matchedEvent);
    }

    // 4. Detección de Cobertura de Salud Sexual
    if (queryLower.includes('sexual') || queryLower.includes('reproductiva') || queryLower.includes('temas') || queryLower.includes('que sabes')) {
      return this.getSexualHealthCoverage();
    }

    return `[INFO] El sistema de estadísticas para '${query}' está en desarrollo. Pronto podrás obtener tendencias, comparativas y promedios detallados.`;
  }
}

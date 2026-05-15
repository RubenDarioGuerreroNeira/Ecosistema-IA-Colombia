import { Injectable, Logger } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';
import { MentalHealthService } from '../mental-health.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly mentalHealthService: MentalHealthService,
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
   * Analiza la distribución por edad de un evento de salud pública.
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

    const sorted = brackets.sort((a, b) => b.value - a.value);
    const topGroup = sorted[0];
    const topPerc = total > 0 ? ((topGroup.value / total) * 100).toFixed(1) : 0;

    let details = brackets.map(b => `${b.label}: ${b.value} (${total > 0 ? ((b.value / total) * 100).toFixed(1) : 0}%)`).join('\n');

    return `
--- DISTRIBUCIÓN ETARIA: ${stats.nombre_del_evento} ---
Total Casos: ${total}
👥 Grupo más afectado: ${topGroup.label} con ${topGroup.value} casos (${topPerc}%)
Detalle por grupos:
${details}
Conclusión: La mayor incidencia se concentra en el grupo de ${topGroup.label}.
`;
  }

  /**
   * Analiza la distribución por edad de un diagnóstico de salud mental.
   */
  async getMentalHealthAgeAnalysis(diagnosisName: string): Promise<string> {
    this.logger.log(`Analyzing age distribution for mental health: ${diagnosisName}`);
    const stats = await this.mentalHealthService.getStatsForDiagnosis(diagnosisName);
    if (!stats) return `No hay datos de edad disponibles para el diagnóstico de salud mental '${diagnosisName}'.`;

    const total = stats.total;
    const brackets = [
      { label: 'Menor a 1 año', value: stats.menor_a_1 },
      { label: '1-4 años', value: stats.de_1_a_4 },
      { label: '5-9 años', value: stats.de_5_a_9 },
      { label: '10-14 años', value: stats.de_10_a_14 },
      { label: '15-19 años', value: stats.de_15_a_19 },
      { label: '20-49 años', value: stats.de_20_a_49 },
      { label: '50-64 años', value: stats.de_50_a_64 },
      { label: '65+ años', value: stats._65_y_mas },
    ];

    const sorted = brackets.sort((a, b) => b.value - a.value);
    const topGroup = sorted[0];
    const topPerc = total > 0 ? ((topGroup.value / total) * 100).toFixed(1) : 0;

    let details = brackets.map(b => `${b.label}: ${b.value} (${total > 0 ? ((b.value / total) * 100).toFixed(1) : 0}%)`).join('\n');

    return `
--- ANÁLISIS DE EDADES (SALUD MENTAL): ${stats.diagnostico_ingreso} ---
Total Casos: ${total}
👥 Grupo más afectado: ${topGroup.label} con ${topGroup.value} casos (${topPerc}%)
Detalle por edades:
${details}
Conclusión: Este diagnóstico afecta predominantemente a personas en el rango de ${topGroup.label}.
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

    // 2. Detección de Análisis de Edad (General o Salud Mental)
    const ageKeywords = ['edad', 'años', 'niños', 'adolescentes', 'adultos', 'distribución', 'grupo etario'];
    if (ageKeywords.some(kw => queryLower.includes(kw))) {
      // Intentar buscar primero en Salud Mental
      const mentalDiagnoses = await this.mentalHealthService.getAllDiagnoses();
      const matchedMental = mentalDiagnoses.find(d => queryLower.includes(d.toLowerCase()));
      if (matchedMental) return this.getMentalHealthAgeAnalysis(matchedMental);

      // Intentar buscar en Eventos Generales
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find(e => queryLower.includes(e.toLowerCase()));
      if (matchedEvent) return this.getHealthEventAgeAnalysis(matchedEvent);
    }

    return `[INFO] El sistema de estadísticas para '${query}' está en desarrollo. Pronto podrás obtener tendencias, comparativas y promedios detallados.`;
  }
}


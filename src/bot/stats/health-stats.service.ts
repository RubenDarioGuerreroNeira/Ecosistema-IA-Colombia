import { Injectable, Logger } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';

@Injectable()
export class HealthStatsService {
  private readonly logger = new Logger(HealthStatsService.name);

  constructor(private readonly healthDataService: HealthDataService) {}

  /**
   * Compara los casos urbanos y rurales de una enfermedad específica.
   */
  async getDiseaseComparison(diseaseName: string): Promise<string> {
    this.logger.log(
      `Calculating urban vs rural comparison for: ${diseaseName}`,
    );
    const stats = await this.healthDataService.getStatsForEvent(diseaseName);
    if (!stats)
      return `Lo siento, no encontré datos estadísticos específicos para '${diseaseName}' en mi base de datos actual.`;

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
    this.logger.log(
      `Analyzing age distribution for health event: ${diseaseName}`,
    );
    const stats = await this.healthDataService.getStatsForEvent(diseaseName);
    if (!stats)
      return `No hay datos de edad disponibles para '${diseaseName}'.`;

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
    const criticalPerc =
      total > 0 ? ((criticalTotal / total) * 100).toFixed(1) : 0;

    let details = brackets
      .map(
        (b) =>
          `${b.label}: ${b.value} (${total > 0 ? ((b.value / total) * 100).toFixed(1) : 0}%)`,
      )
      .join('\n');

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
   * Resumen de capacidades de datos de salud pública.
   */
  async getHealthKnowledgeSummary(): Promise<string> {
    const events = await this.healthDataService.getAllEvents();
    return `
--- EVENTOS DE SALUD PÚBLICA (SIVIGILA) ---
📊 Manejo datos epidemiológicos reales de más de ${events.length} eventos de salud pública en Colombia (Dengue, Varicela, Malaria, etc.).
📍 Capacidad: Análisis de incidencia por zona (Urbano/Rural) y distribución detallada por grupos etarios.
`;
  }
}

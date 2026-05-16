import { Injectable } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';
import { MentalHealthService } from '../mental-health.service';
import { HealthStatsService } from './health-stats.service';
import { MentalHealthStatsService } from './mental-health-stats.service';
import { SexualHealthStatsService } from './sexual-health-stats.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly mentalHealthService: MentalHealthService,
    private readonly healthStatsService: HealthStatsService,
    private readonly mentalHealthStatsService: MentalHealthStatsService,
    private readonly sexualHealthStatsService: SexualHealthStatsService,
  ) {}

  async getSummary(query: string): Promise<string> {
    const queryLower = query.toLowerCase();

    // 0. Detección de Capacidades Generales
    const generalKeywords = [
      'que sabes',
      'que puedes hacer',
      'quien eres',
      'ayudame',
      'temas',
      'informacion tienes',
      'base de datos',
    ];
    if (generalKeywords.some((kw) => queryLower.includes(kw))) {
      return this.getGlobalCapabilities();
    }

    // 1. Detección de Comparación Urbana/Rural
    if (queryLower.includes('urbano') || queryLower.includes('rural')) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find((e) =>
        queryLower.includes(e.toLowerCase()),
      );
      if (matchedEvent)
        return this.healthStatsService.getDiseaseComparison(matchedEvent);
    }

    // 2. Detección de Salud Mental por Ciclo de Vida o Edad
    const mentalKeywords = [
      'ansiedad',
      'depresión',
      'estrés',
      'salud mental',
      'psicología',
      'psiquiatría',
    ];
    if (
      mentalKeywords.some((kw) => queryLower.includes(kw)) &&
      (queryLower.includes('edad') ||
        queryLower.includes('años') ||
        queryLower.includes('etapa'))
    ) {
      const mentalDiagnoses = await this.mentalHealthService.getAllDiagnoses();
      const matchedMental = mentalDiagnoses.find((d) =>
        queryLower.includes(d.toLowerCase()),
      );
      if (matchedMental)
        return this.mentalHealthStatsService.getMentalHealthLifeCycleAnalysis(
          matchedMental,
        );
    }

    // 3. Detección de Análisis de Edad General
    const ageKeywords = [
      'edad',
      'años',
      'niños',
      'adolescentes',
      'adultos',
      'distribución',
      'grupo etario',
    ];
    if (ageKeywords.some((kw) => queryLower.includes(kw))) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find((e) =>
        queryLower.includes(e.toLowerCase()),
      );
      if (matchedEvent)
        return this.healthStatsService.getHealthEventAgeAnalysis(matchedEvent);
    }

    // 4. Detección de Cobertura de Salud Sexual
    if (queryLower.includes('sexual') || queryLower.includes('reproductiva')) {
      return this.sexualHealthStatsService.getSexualHealthCoverage();
    }

    return `[INFO] El sistema de estadísticas para '${query}' está en desarrollo. Pronto podrás obtener tendencias, comparativas y promedios detallados.`;
  }

  /**
   * Reúne la capacidad total de conocimiento basada en los archivos XML cargados.
   */
  private async getGlobalCapabilities(): Promise<string> {
    const health = await this.healthStatsService.getHealthKnowledgeSummary();
    const sexual =
      await this.sexualHealthStatsService.getSexualHealthCoverage();
    const mental =
      await this.mentalHealthStatsService.getMentalHealthKnowledgeSummary();

    return `Soy un Asistente de IA especializado en Salud Pública para Colombia. Mi conocimiento se basa en datos oficiales cargados en mi sistema:\n${health}${sexual}${mental}\n¿Sobre cuál de estos temas te gustaría profundizar hoy?`;
  }
}

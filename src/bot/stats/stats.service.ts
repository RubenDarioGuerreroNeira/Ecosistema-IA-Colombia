import { Injectable } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';
import { MentalHealthService } from '../mental-health.service';
import { HealthStatsService } from './health-stats.service';
import { MentalHealthStatsService } from './mental-health-stats.service';
import { SexualHealthStatsService } from './sexual-health-stats.service';
import { AntioquiaHealthService } from '../antioquia-health.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly mentalHealthService: MentalHealthService,
    private readonly healthStatsService: HealthStatsService,
    private readonly mentalHealthStatsService: MentalHealthStatsService,
    private readonly sexualHealthStatsService: SexualHealthStatsService,
    private readonly antioquiaHealthService: AntioquiaHealthService,
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

    // 1. Detección de Ranking de Enfermedades (Top 5)
    const rankingKeywords = [
      'ranking',
      'top',
      'más frecuentes',
      'peores',
      'mayor incidencia',
      'peor enfermedad',
    ];
    if (rankingKeywords.some((kw) => queryLower.includes(kw))) {
      return this.healthStatsService.getTopDiseasesRanking();
    }

    // 2. Detección de Análisis de Género Global (Hombres vs Mujeres)
    const globalGenderKeywords = [
      'género global',
      'brecha de género',
      'hombres o mujeres',
      'más hombres',
      'más mujeres',
    ];
    if (globalGenderKeywords.some((kw) => queryLower.includes(kw))) {
      return this.healthStatsService.getGlobalGenderAnalysis();
    }

    // 3. Detección de Comparación Urbana/Rural
    if (queryLower.includes('urbano') || queryLower.includes('rural')) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find((e) =>
        queryLower.includes(e.toLowerCase()),
      );
      if (matchedEvent)
        return this.healthStatsService.getDiseaseComparison(matchedEvent);
    }

    // 4. Detección de Salud Mental por Ciclo de Vida o Edad
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

    // 5. Detección de Análisis de Edad General
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

    // 6. Detección de Cobertura de Salud Sexual
    if (queryLower.includes('sexual') || queryLower.includes('reproductiva')) {
      return this.sexualHealthStatsService.getSexualHealthCoverage();
    }

    // 7. Búsqueda de prestadores por subregión: Valle de Aburrá (Antioquia)
    const valleRegex = /valle de aburr[áa]/i;
    if (valleRegex.test(queryLower) || queryLower.includes('valle aburr')) {
      // Municipios que conforman el Valle de Aburrá
      const municipios = [
        'medellín',
        'envigado',
        'itagüí',
        'sabaneta',
        'bello',
        'la estrella',
        'girardota',
        'copacabana',
        'caldas',
        'barbosa',
      ];

      const resultsMap = new Map<string, any>();
      for (const m of municipios) {
        const found = this.antioquiaHealthService.searchProviders(m);
        for (const p of found) {
          const key = `${p.nombre_sede}-${p.municipio}-${p.nombreprestador}`;
          if (!resultsMap.has(key)) resultsMap.set(key, p);
        }
      }

      const providers = Array.from(resultsMap.values()).slice(0, 20);
      if (providers.length === 0) {
        return `No encontré centros de salud registrados específicamente para el Valle de Aburrá en mi base local de Antioquia.`;
      }

      const lines = providers.map((p) => {
        const nombre =
          p.nombre_sede || p.nombreprestador || 'Nombre no disponible';
        const municipio = p.municipio || '—';
        const direccion = p.direccion || 'N/A';
        const telefono = p.telefono || 'N/A';
        const webOrEmail = p.email || p.pagina_web || 'N/A';

        const nit = p.nit || 'N/A';
        const nivel = p.nivel || 'N/A';
        const caracter = p.caracter || 'N/A';

        return `- ${nombre} — ${municipio}\n  Dirección: ${direccion}\n  Teléfono: ${telefono}\n  Email/Web: ${webOrEmail}\n  NIT: ${nit} — Nivel: ${nivel} — Caracter: ${caracter}`;
      });

      return `Centros de salud en el Valle de Aburrá (según archivos locales):\n${lines.join('\n\n')}`;
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

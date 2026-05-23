import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface MentalHealthEvent {
  diagnostico_ingreso: string;
  codigo_dx_ingreso: string;
  // Age brackets
  menor_a_1: number;
  de_1_a_4: number;
  de_5_a_9: number;
  de_10_a_14: number;
  de_15_a_19: number;
  de_20_a_49: number;
  de_50_a_64: number;
  _65_y_mas: number;
  total: number;
  a_o_diagn_stico: string;
}

export interface MentalHealthEventWithTotal extends MentalHealthEvent {
  total_en_ciclo: number;
}

@Injectable()
export class MentalHealthService {
  private readonly xmlPath = path.join(
    process.cwd(),
    'data',
    'Salud_Mental.xml',
  );
  private events: MentalHealthEvent[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const xmlData = fs.readFileSync(this.xmlPath, 'utf8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);

      const rows = jsonObj.response?.rows?.row;

      if (Array.isArray(rows)) {
        this.events = rows.map((row) => ({
          diagnostico_ingreso: row.diagnostico_ingreso,
          codigo_dx_ingreso: row.codigo_dx_ingreso,
          menor_a_1: Number(row.menor_a_1) || 0,
          de_1_a_4: Number(row.de_1_a_4) || 0,
          de_5_a_9: Number(row.de_5_a_9) || 0,
          de_10_a_14: Number(row.de_10_a_14) || 0,
          de_15_a_19: Number(row.de_15_a_19) || 0,
          de_20_a_49: Number(row.de_20_a_49) || 0,
          de_50_a_64: Number(row.de_50_a_64) || 0,
          _65_y_mas: Number(row._65_y_mas) || 0,
          total: Number(row.total) || 0,
          a_o_diagn_stico: row.a_o_diagn_stico,
        }));
      } else if (rows) {
        this.events = [
          {
            diagnostico_ingreso: rows.diagnostico_ingreso,
            codigo_dx_ingreso: rows.codigo_dx_ingreso,
            menor_a_1: Number(rows.menor_a_1) || 0,
            de_1_a_4: Number(rows.de_1_a_4) || 0,
            de_5_a_9: Number(rows.de_5_a_9) || 0,
            de_10_a_14: Number(rows.de_10_a_14) || 0,
            de_15_a_19: Number(rows.de_15_a_19) || 0,
            de_20_a_49: Number(rows.de_20_a_49) || 0,
            de_50_a_64: Number(rows.de_50_a_64) || 0,
            _65_y_mas: Number(rows._65_y_mas) || 0,
            total: Number(rows.total) || 0,
            a_o_diagn_stico: rows.a_o_diagn_stico,
          },
        ];
      }

      console.log(
        `✅ MentalHealthService: Loaded ${this.events.length} mental health records from XML.`,
      );
    } catch (error) {
      console.error('❌ Error loading mental health XML:', error);
    }
  }

  async getStatsForDiagnosis(query: string): Promise<MentalHealthEvent | null> {
    const queryLower = query.toLowerCase().trim();
    // Priorizar coincidencia exacta
    const exactMatch = this.events.find(
      (e) =>
        e.diagnostico_ingreso.toLowerCase() === queryLower ||
        e.codigo_dx_ingreso.toLowerCase() === queryLower,
    );
    if (exactMatch) return exactMatch;

    // Si no hay exacta, buscar por inclusión pero asegurando que sea relevante
    const event = this.events.find(
      (e) =>
        e.diagnostico_ingreso.toLowerCase().includes(queryLower) ||
        e.codigo_dx_ingreso.toLowerCase().includes(queryLower),
    );
    return event || null;
  }

  async getAllDiagnoses(): Promise<string[]> {
    return this.events.map((e) => e.diagnostico_ingreso);
  }

  /**
   * Busca todos los diagnósticos que coincidan con el término
   */
  async searchDiagnoses(query: string): Promise<MentalHealthEvent[]> {
    const queryLower = query.toLowerCase();
    return this.events.filter(
      (e) =>
        e.diagnostico_ingreso.toLowerCase().includes(queryLower) ||
        e.codigo_dx_ingreso.toLowerCase().includes(queryLower),
    );
  }

  /**
   * Compara la prevalencia total de dos diagnósticos específicos.
   */
  async getComparisonBetweenDiagnoses(
    diag1Name: string,
    diag2Name: string,
  ): Promise<{ d1: MentalHealthEvent; d2: MentalHealthEvent } | null> {
    const d1 = await this.getStatsForDiagnosis(diag1Name);
    const d2 = await this.getStatsForDiagnosis(diag2Name);

    if (!d1 || !d2) return null;
    return { d1, d2 };
  }

  /**
   * Obtiene los diagnósticos con mayor número de casos
   */
  async getTopDiagnoses(limit: number = 5): Promise<MentalHealthEvent[]> {
    return [...this.events].sort((a, b) => b.total - a.total).slice(0, limit);
  }

  /**
   * Obtiene los diagnósticos con mayor impacto en un rango de edad específico.
   * Los rangos válidos son: menor_a_1, de_1_a_4, de_5_a_9, de_10_a_14, de_15_a_19, de_20_a_49, de_50_a_64, _65_y_mas
   */
  async getTopDiagnosisByAge(
    ageGroup: string,
    limit: number = 3,
  ): Promise<MentalHealthEvent[]> {
    const validFields = [
      'menor_a_1',
      'de_1_a_4',
      'de_5_a_9',
      'de_10_a_14',
      'de_15_a_19',
      'de_20_a_49',
      'de_50_a_64',
      '_65_y_mas',
    ];

    if (!validFields.includes(ageGroup)) return [];

    const field = ageGroup as keyof MentalHealthEvent;

    return [...this.events]
      .sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0))
      .slice(0, limit);
  }

  /**
   * Obtiene los diagnósticos de salud mental más frecuentes agregando grupos de edad (Ciclos de Vida).
   * Mapeo aproximado según rangos del XML:
   * - niños: menor_a_1 + de_1_a_4 + de_5_a_9
   * - adolescentes: de_10_a_14 + de_15_a_19
   * - jovenes: de_15_a_19 + de_20_a_49
   * - adultos: de_20_a_49 + de_50_a_64
   * - mayores: _65_y_mas
   */
  async getTopByLifeCycle(
    cycle: string,
    limit: number = 5,
  ): Promise<MentalHealthEventWithTotal[]> {
    const mapping = {
      niños: ['menor_a_1', 'de_1_a_4', 'de_5_a_9'],
      adolescentes: ['de_10_a_14', 'de_15_a_19'],
      jovenes: ['de_15_a_19', 'de_20_a_49'],
      adultos: ['de_20_a_49', 'de_50_a_64'],
      mayores: ['_65_y_mas'],
    };

    const fields = mapping[cycle.toLowerCase()] || [];
    if (fields.length === 0) return [];

    return [...this.events]
      .sort((a, b) => {
        const sumB = fields.reduce(
          (sum, f) => sum + (Number(b[f as keyof MentalHealthEvent]) || 0),
          0,
        );
        const sumA = fields.reduce(
          (sum, f) => sum + (Number(a[f as keyof MentalHealthEvent]) || 0),
          0,
        );
        return sumB - sumA;
      })
      .map((e) => {
        const totalEnCiclo = fields.reduce(
          (sum, f) => sum + (Number(e[f as keyof MentalHealthEvent]) || 0),
          0,
        );
        return { ...e, total_en_ciclo: totalEnCiclo };
      })
      .slice(0, limit);
  }

  /**
   * Obtiene el total de casos acumulados por cada rango de edad
   */
  async getAgeDistribution(): Promise<Record<string, number>> {
    return this.events.reduce(
      (acc, curr) => {
        acc.menor_a_1 += curr.menor_a_1;
        acc.de_1_a_4 += curr.de_1_a_4;
        acc.de_5_a_9 += curr.de_5_a_9;
        acc.de_10_a_14 += curr.de_10_a_14;
        acc.de_15_a_19 += curr.de_15_a_19;
        acc.de_20_a_49 += curr.de_20_a_49;
        acc.de_50_a_64 += curr.de_50_a_64;
        acc._65_y_mas += curr._65_y_mas;
        acc.total_global += curr.total;
        return acc;
      },
      {
        menor_a_1: 0,
        de_1_a_4: 0,
        de_5_a_9: 0,
        de_10_a_14: 0,
        de_15_a_19: 0,
        de_20_a_49: 0,
        de_50_a_64: 0,
        _65_y_mas: 0,
        total_global: 0,
      },
    );
  }

  /** Obtiene un resumen simple de la cantidad de datos */
  getKnowledgeSummary(): string {
    return `Tengo registros de ${this.events.length} tipos de diagnósticos de salud mental en Colombia filtrados por rangos de edad.`;
  }
}

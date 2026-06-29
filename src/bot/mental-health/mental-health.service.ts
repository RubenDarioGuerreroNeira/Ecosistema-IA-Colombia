import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { normalizeString } from '../../shared/health-utils';

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
    const normalizedQuery = normalizeString(query);

    // Priorizar coincidencia exacta
    const exactMatch = this.events.find((e) => {
      const normalizedDiag = normalizeString(e.diagnostico_ingreso);
      const normalizedCode = normalizeString(e.codigo_dx_ingreso);
      return (
        normalizedDiag === normalizedQuery || normalizedCode === normalizedQuery
      );
    });
    if (exactMatch) return exactMatch;

    const foundByText = await this.findDiagnosisInText(query);
    if (foundByText) return foundByText;

    // Si no hay exacta, buscar por inclusión en ambos sentidos.
    // Esto permite que una pregunta completa contenga el nombre del diagnóstico.
    const sortedEvents = [...this.events].sort(
      (a, b) =>
        normalizeString(b.diagnostico_ingreso).length -
        normalizeString(a.diagnostico_ingreso).length,
    );

    const event = sortedEvents.find((e) => {
      const normalizedDiag = normalizeString(e.diagnostico_ingreso);
      const normalizedCode = normalizeString(e.codigo_dx_ingreso);
      return (
        normalizedDiag.includes(normalizedQuery) ||
        normalizedCode.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedDiag) ||
        normalizedQuery.includes(normalizedCode)
      );
    });
    return event || null;
  }

  async findDiagnosisInText(text: string): Promise<MentalHealthEvent | null> {
    const normalizedQuery = normalizeString(text);
    if (!normalizedQuery) return null;

    type Candidate = { event: MentalHealthEvent; score: number };
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);

    const candidates: Candidate[] = this.events
      .map((event) => {
        const normalizedDiag = normalizeString(event.diagnostico_ingreso);
        const normalizedCode = normalizeString(event.codigo_dx_ingreso);
        let score = 0;

        if (!normalizedDiag) return { event, score: 0 };
        if (normalizedQuery === normalizedDiag) score += 2000;
        if (normalizedQuery.includes(normalizedDiag)) score += 1500;
        if (normalizedDiag.includes(normalizedQuery)) score += 1400;
        if (
          normalizedQuery.includes(normalizedCode) ||
          normalizedCode.includes(normalizedQuery)
        )
          score += 1200;

        const diagTokens = normalizedDiag.split(' ').filter(Boolean);
        const matchedTokens = diagTokens.filter((token) =>
          queryTokens.includes(token),
        );
        score += matchedTokens.length * 10;

        return { event, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return candidates.length ? candidates[0].event : null;
  }

  /**
   * Busca todos los diagnósticos que coincidan con el término
   */
  async searchDiagnoses(query: string): Promise<MentalHealthEvent[]> {
    const normalizedQuery = normalizeString(query);
    return this.events.filter((e) => {
      const normalizedDiag = normalizeString(e.diagnostico_ingreso);
      const normalizedCode = normalizeString(e.codigo_dx_ingreso);
      return (
        normalizedDiag.includes(normalizedQuery) ||
        normalizedCode.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedDiag) ||
        normalizedQuery.includes(normalizedCode)
      );
    });
  }

  async getAllDiagnoses(): Promise<string[]> {
    return this.events.map((e) => e.diagnostico_ingreso);
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
   * Genera un resumen ejecutivo del perfil de riesgo (distribución por ciclos de vida) para un diagnóstico específico.
   */
  async getRiskProfileByDiagnosis(diagName: string): Promise<{
    diagnostico: string;
    total: number;
    distribucion: Record<string, number>;
  } | null> {
    const diag = await this.getStatsForDiagnosis(diagName);
    if (!diag) return null;

    const mapping = {
      niños: ['menor_a_1', 'de_1_a_4', 'de_5_a_9'],
      adolescentes: ['de_10_a_14', 'de_15_a_19'],
      jovenes: ['de_15_a_19', 'de_20_a_49'],
      adultos: ['de_20_a_49', 'de_50_a_64'],
      mayores: ['_65_y_mas'],
    };

    const distribucion: Record<string, number> = {};

    for (const [cycle, fields] of Object.entries(mapping)) {
      distribucion[cycle] = fields.reduce(
        (sum, f) => sum + (Number(diag[f as keyof MentalHealthEvent]) || 0),
        0,
      );
    }

    return {
      diagnostico: diag.diagnostico_ingreso,
      total: diag.total,
      distribucion,
    };
  }

  /**
   * Obtiene los diagnósticos con mayor número de casos
   */
  async getTopDiagnoses(limit: number = 5): Promise<MentalHealthEvent[]> {
    return [...this.events].sort((a, b) => b.total - a.total).slice(0, limit);
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
}
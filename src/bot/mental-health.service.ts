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

@Injectable()
export class MentalHealthService {
  private readonly xmlPath = path.join(process.cwd(), 'data', 'Salud_Mental.xml');
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
        this.events = rows.map(row => ({
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
        this.events = [{
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
        }];
      }
      
      console.log(`✅ MentalHealthService: Loaded ${this.events.length} mental health records from XML.`);
    } catch (error) {
      console.error('❌ Error loading mental health XML:', error);
    }
  }

  async getStatsForDiagnosis(query: string): Promise<MentalHealthEvent | null> {
    const queryLower = query.toLowerCase();
    const event = this.events.find(e => 
      e.diagnostico_ingreso.toLowerCase().includes(queryLower) || 
      e.codigo_dx_ingreso.toLowerCase().includes(queryLower)
    );
    return event || null;
  }

  async getAllDiagnoses(): Promise<string[]> {
    return this.events.map(e => e.diagnostico_ingreso);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { VaccinationCoverage } from './types/vaccination-coverage.interface';

@Injectable()
export class VaccinationService {
  private readonly logger = new Logger(VaccinationService.name);
  private readonly dataPath = path.join(process.cwd(), 'data', 'Coberturas_administrativas_de_vacunación_por_departamento_20260528.xml');
  private data: VaccinationCoverage[] = [];

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      const xmlData = await fs.readFile(this.dataPath, 'utf-8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      const rows = jsonObj.response?.rows?.row;

      if (Array.isArray(rows)) {
        this.data = rows.map(this.mapRowToCoverage);
      } else if (rows) {
        this.data = [this.mapRowToCoverage(rows)];
      }
      this.logger.log(`VaccinationService: Loaded ${this.data.length} records.`);
    } catch (error) {
      this.logger.error('Error loading vaccination data:', error);
    }
  }

  private mapRowToCoverage(row: any): VaccinationCoverage {
    return {
      coddepto: row.coddepto || '',
      departamento: row.departamento || 'Desconocido',
      a_o: row.a_o || '',
      biol_gico: row.biol_gico || '',
      cobertura_de_vacunaci_n: String(row.cobertura_de_vacunaci_n || '0'),
    };
  }

  async getCoverageByDepartment(departamento: string): Promise<VaccinationCoverage[]> {
    return this.data.filter(c => c.departamento.toLowerCase() === departamento.toLowerCase());
  }
}

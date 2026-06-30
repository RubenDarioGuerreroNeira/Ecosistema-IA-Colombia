import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { VaccinationCoverage } from './types/vaccination-coverage.interface';
import { Departamento, DEPARTAMENTOS_LIST } from '../interfaces/departamentos.js';

@Injectable()
export class VaccinationService {
  private readonly logger = new Logger(VaccinationService.name);
  private data: VaccinationCoverage[] = [];

  constructor() {
    this.loadAllData();
  }

  private async loadAllData() {
    const files = [
      {
        path: 'Coberturas_administrativas_de_vacunación_por_departamento_20260528.xml',
        mapper: this.mapGeneralDepto,
      },
      {
        path: 'Cobertura_de_Vacunación_PAI_en_el_Valle_del_Cauca.xml',
        mapper: this.mapValleCauca,
      },
      {
        path: 'DATOS_DE_VACUNACIÓN_EN_NIÑOS_Y_NIÑAS.xml',
        mapper: this.mapHistoricalChildren,
      },
    ];

    for (const file of files) {
      try {
        const filePath = path.join(process.cwd(), 'data', file.path);
        const xmlData = await fs.readFile(filePath, 'utf-8');
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlData);
        const rows = jsonObj.response?.rows?.row;

        if (Array.isArray(rows)) {
          const mapped = rows.map(file.mapper.bind(this));
          this.data = [...this.data, ...mapped];
        } else if (rows) {
          this.data.push(file.mapper.call(this, rows));
        }
        this.logger.log(`VaccinationService: Loaded data from ${file.path}`);
      } catch (error) {
        this.logger.warn(`Error loading vaccination file ${file.path}: ${error.message}`);
      }
    }
    this.logger.log(`VaccinationService: Total records loaded: ${this.data.length}`);
  }

  private mapGeneralDepto(row: any): VaccinationCoverage {
    return {
      coddepto: row.coddepto || '',
      departamento: row.departamento || 'Desconocido',
      a_o: String(row.a_o || ''),
      biol_gico: row.biol_gico || '',
      cobertura_de_vacunaci_n: String(row.cobertura_de_vacunaci_n || '0'),
    };
  }

  private mapValleCauca(row: any): VaccinationCoverage {
    return {
      coddepto: row.codigo_departamento || '76',
      departamento: row.departamento || 'VALLE DEL CAUCA',
      a_o: String(row.a_o || ''),
      biol_gico: row.biologico || '',
      cobertura_de_vacunaci_n: String(row.cobertura || '0'),
      indicator1: row.municipio, // Usamos un campo extra para municipio si es necesario
    };
  }

  private mapHistoricalChildren(row: any): VaccinationCoverage {
    // Estos datos suelen ser porcentajes multiplicados por 100
    const rawVal = parseFloat(row.dato_num_rico || '0');
    const coverage = (rawVal / 100).toFixed(2);

    return {
      coddepto: '',
      departamento: row.entidad || 'Risaralda', // Muchos registros de este archivo son de Risaralda
      a_o: String(row.a_o || ''),
      biol_gico: row.indicador || '',
      cobertura_de_vacunaci_n: coverage,
    };
  }

  // Solicita la info de Vacunación un departamento determinado
  async getCoverageByDepartment(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = departamento.toLowerCase();
    return this.data.filter(c =>
      c.departamento.toLowerCase().includes(searchDepto) ||
      (c.indicator1 && c.indicator1.toLowerCase().includes(searchDepto))
    );
  }

  // Limpia encoding corrupto (Ã± -> ñ, Ã¡ -> á, etc.)
  private cleanEncoding(text: string): string {
    if (!text) return '';
    return text
      .replace(/Ã‘/g, 'Ñ').replace(/Ã±/g, 'ñ')
      .replace(/Ã“/g, 'Ó').replace(/Ã³/g, 'ó')
      .replace(/Ã/g, 'Í').replace(/Ã­/g, 'í')
      .replace(/Ã‰/g, 'É').replace(/Ã©/g, 'é')
      .replace(/Ãš/g, 'Ú').replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Á').replace(/Ã¡/g, 'á')
      .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
      .replace(/Â°/g, '°').replace(/NÂº/g, 'N°')
      .replace(/\s+/g, ' ').trim();
  }

  // Normaliza texto: minúscula, sin acentos, sin espacios extra
  private normalizeDepto(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Retorna lista única de departamentos/municipios con datos de vacunación
  async getAllDepartament(): Promise<string[]> {
    const rawDeptos = [...new Set(this.data.map(c => this.cleanEncoding(c.departamento)))];
    return rawDeptos
      .filter(d => d && d !== 'Desconocido' && d.length > 2)
      .sort();
  }

  // Retorna todos los municipios disponibles en los datos de vacunación
  async getAllMunicipios(): Promise<string[]> {
    const raw = [...new Set(this.data.map(c => this.cleanEncoding(c.indicator1 || '')))];
    return raw.filter(m => m && m.length > 2).sort();
  }


}


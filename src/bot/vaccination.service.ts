import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Vaccination } from '../entities/vaccination.entity';
import { VaccinationCoverage } from './types/vaccination-coverage.interface';

@Injectable()
export class VaccinationService {
  private readonly logger = new Logger(VaccinationService.name);

  constructor(
    @InjectRepository(Vaccination)
    private readonly repo: Repository<Vaccination>,
  ) {
    this.logger.log('VaccinationService initialized (SQLite mode)');
  }

  async getCoverageByDepartment(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = departamento.toLowerCase();
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orWhere('LOWER(v.indicator1) LIKE :q', { q: `%${searchDepto}%` })
      .getMany();

    return rows.map(r => ({
      coddepto: r.coddepto || '',
      departamento: r.departamento || 'Desconocido',
      a_o: String(r.a_o || ''),
      biol_gico: r.biol_gico || '',
      cobertura_de_vacunaci_n: String(r.cobertura_de_vacunaci_n || '0'),
      indicator1: r.indicator1 || undefined,
      indicator1_1: r.indicator1_1 || undefined,
      indicator1_2: r.indicator1_2 || undefined,
      indicator1_3: r.indicator1_3 || undefined,
      indicator1_4: r.indicator1_4 || undefined,
      indicator1_5: r.indicator1_5 || undefined,
    }));
  }

  private cleanEncoding(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
      'Ã‘': 'Ñ', 'Ã±': 'ñ',
      'Ã“': 'Ó', 'Ã³': 'ó',
      'ÃÍ': 'Í', 'Ã­': 'í',
      'Ã‰': 'É', 'Ã©': 'é',
      'Ãš': 'Ú', 'Ãº': 'ú',
      'Ã': 'Á', 'Ã¡': 'á',
      'Ã¼': 'ü', 'Ãœ': 'Ü',
      'Â°': '°', 'NÂº': 'N°',
    };
    let out = text;
    for (const [k, v] of Object.entries(map)) {
      out = out.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v);
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  private normalizeDepto(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getAllDepartament(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v.departamento', 'departamento')
      .where('LENGTH(v.departamento) >= 3')
      .orderBy('v.departamento', 'ASC')
      .getRawMany();

    return rows
      .map(r => this.cleanEncoding(r.departamento))
      .filter(d => d && d !== 'Desconocido' && d.length > 2);
  }

  async getAllMunicipios(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v.indicator1', 'indicator1')
      .where('v.indicator1 IS NOT NULL')
      .andWhere('LENGTH(v.indicator1) >= 3')
      .orderBy('v.indicator1', 'ASC')
      .getRawMany();

    return rows
      .map(r => this.cleanEncoding(r.indicator1 || ''))
      .filter(m => m && m.length > 2);
  }
}


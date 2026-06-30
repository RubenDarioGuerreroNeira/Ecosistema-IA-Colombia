import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AntioquiaProvider } from '../../entities/antioquia-provider.entity';
import { normalizeString, normalizeNit, STOPWORDS } from '../../shared/health-utils';

@Injectable()
export class AntioquiaHealthService {
  private readonly logger = new Logger(AntioquiaHealthService.name);

  constructor(
    @InjectRepository(AntioquiaProvider)
    private readonly antioquiaRepo: Repository<AntioquiaProvider>,
  ) {
    this.logger.log('AntioquiaHealthService initialized (SQLite mode)');
  }

  async searchProviders(query: string, limit = 100): Promise<AntioquiaProvider[]> {
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const rawTokens = this.getSignificantTokens(query);
    if (rawTokens.length === 0) return [];

    const tokens = rawTokens.map(t => {
      if (t.endsWith('es') && t.length > 5) return t.substring(0, t.length - 2);
      if (t.endsWith('s') && t.length > 4) return t.substring(0, t.length - 1);
      return t;
    });

    const queryBuilder = this.antioquiaRepo.createQueryBuilder('p');
    tokens.forEach((tok, i) => {
      const condition = `(LOWER(p.municipio) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombreprestador) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombre_sede) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.gerente) LIKE '%' || LOWER(:tok${i}) || '%')`;
      if (i === 0) {
        queryBuilder.where(condition, { [`tok${i}`]: tok });
      } else {
        queryBuilder.andWhere(condition, { [`tok${i}`]: tok });
      }
    });

    return queryBuilder.limit(safeLimit).getMany();
  }

  async findByIdentifier(query: string): Promise<AntioquiaProvider[]> {
    const q = query.toString().trim().toLowerCase();

    const byCode = await this.antioquiaRepo.find({
      where: [{ codigohabilitacion: q }],
      take: 10,
    });
    if (byCode.length > 0) return byCode;

    const normNit = normalizeNit(q);
    if (normNit) {
      const byNit = await this.antioquiaRepo.find({
        where: { nit: Like(`%${normNit}%`) },
        take: 10,
      });
      if (byNit.length > 0) return byNit;
    }

    return this.searchProviders(query, 10);
  }

  async getMunicipios(): Promise<string[]> {
    const result = await this.antioquiaRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.municipio')
      .where('p.municipio IS NOT NULL')
      .andWhere('LENGTH(p.municipio) >= 3')
      .orderBy('p.municipio', 'ASC')
      .getRawMany();

    return result
      .map(r => r.p_municipio)
      .filter((m: string) => m && !STOPWORDS.has(m.toLowerCase()));
  }

  getKnowledgeSummary(): string {
    return 'He encontrado prestadores y centros de salud en Antioquia registrados en mi base local.';
  }

  protected getSignificantTokens(query: string, maxTokens = 10): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t))
      .slice(0, maxTokens);
  }
}
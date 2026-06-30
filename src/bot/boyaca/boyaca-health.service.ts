import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BoyacaProvider } from '../../entities/boyaca-provider.entity';
import { normalizeString, normalizeNit, STOPWORDS } from '../../shared/health-utils';

@Injectable()
export class BoyacaHealthService {
  private readonly logger = new Logger(BoyacaHealthService.name);

  constructor(
    @InjectRepository(BoyacaProvider)
    private readonly boyacaRepo: Repository<BoyacaProvider>,
  ) {
    this.logger.log('BoyacaHealthService initialized (SQLite mode)');
  }

  /** Search providers by query with an optional limit */
  async searchProviders(query: string, limit = 100): Promise<BoyacaProvider[]> {
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const rawTokens = this.getSignificantTokens(query);
    if (rawTokens.length === 0) return [];

    const tokens = rawTokens.map(t => {
      if (t.endsWith('es') && t.length > 5) return t.substring(0, t.length - 2);
      if (t.endsWith('s') && t.length > 4) return t.substring(0, t.length - 1);
      return t;
    });

    const queryBuilder = this.boyacaRepo.createQueryBuilder('p');
    tokens.forEach((tok, i) => {
      if (i === 0) {
        queryBuilder.where(
          `(LOWER(p.municipio) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.razon_social) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombre_de_sede) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.gerente) LIKE '%' || LOWER(:tok${i}) || '%')`,
          { [`tok${i}`]: tok }
        );
      } else {
        queryBuilder.andWhere(
          `(LOWER(p.municipio) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.razon_social) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombre_de_sede) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.gerente) LIKE '%' || LOWER(:tok${i}) || '%')`,
          { [`tok${i}`]: tok }
        );
      }
    });

    return queryBuilder.limit(safeLimit).getMany();
  }

  /**
   * Busca prestadores por un identificador libre: puede ser código de prestador,
   * NIT, o fragmento de nombre/sede/razón social.
   */
  async findByIdentifier(query: string): Promise<BoyacaProvider[]> {
    const q = query.toString().trim().toLowerCase();

    // 1. Try Code index via SQL
    const byCode = await this.boyacaRepo.find({
      where: [
        { codigo_prestador: q },
        { codigo_habilitacion: q },
      ],
      take: 10,
    });
    if (byCode.length > 0) return byCode;

    // 2. Try NIT
    const normNit = normalizeNit(q);
    if (normNit) {
      const byNit = await this.boyacaRepo.find({
        where: { nit: Like(`%${normNit}%`) },
        take: 10,
      });
      if (byNit.length > 0) return byNit;
    }

    // 3. Fallback to text search
    return this.searchProviders(query, 10);
  }

  async getMunicipios(): Promise<string[]> {
    const result = await this.boyacaRepo
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
    return `He encontrado prestadores y centros de salud en Boyacá registrados en mi base local. Si deseas consultar alguno, especifica el municipio o nombre.`;
  }

  async getHospitalCount(): Promise<number> {
    return this.boyacaRepo.count({
      where: [
        { razon_social: Like('%HOSPITAL%') },
        { nombre_de_sede: Like('%HOSPITAL%') },
      ],
    });
  }

  /** Extract significant tokens from query. */
  protected getSignificantTokens(query: string, maxTokens = 10): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t))
      .slice(0, maxTokens);
  }
}
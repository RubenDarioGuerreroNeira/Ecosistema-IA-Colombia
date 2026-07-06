import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccination } from '../entities/vaccination.entity';
import { VaccinationCoverage } from './types/vaccination-coverage.interface';
import { normalizeString } from '@shared/health-utils';

@Injectable()
export class VaccinationService {
  private readonly logger = new Logger(VaccinationService.name);

  constructor(
    @InjectRepository(Vaccination)
    private readonly repo: Repository<Vaccination>,
  ) {
    this.logger.log('VaccinationService initialized (SQLite mode)');
  }

  // Preguntas de vacunación disponibles
  async getAvailabeQuestions(): Promise<string> {
    return `💉 **Vacunación**

• Puedo mostrarte los indicadores de vacunación de: 
  **Departamentos**: Amazonas, Antioquia, Arauca, Archipiélago de San Andrés Providencia y Santa Catalina
  **Municipios**: ANSERMANUEVO, ARGELIA, BOLÍVAR, BUGALAGRANDE, CAICEDONIA, 
    CALIMA, CANDELARIA, CARTAGO

 • ¿Qué indicadores de vacunación tienes disponibles en Amazonas?
• ¿Qué indicadores de vacunación tienes disponibles en Cartago?
• ¿Puedes mostrarme los 5 indicadores de vacunación más altos y bajos en Antioquia?
• ¿Puedes mostrarme los 5 indicadores de vacunación más altos y bajos en Alcalá?
• Estadísticas completas de vacunación por departamento
• Estadísticas completas de vacunación por municipio
• Top 5 departamentos por cobertura promedio
• Filtra vacunas por tipo biológico
• Búsqueda flexible por múltiples criterios
• Resumen general de cobertura por año
• Indicadores disponibles por departamento

💡 **Ejemplos de uso:**
• *"Vacunación en el departamento de Tunja"*
• *"Vacunación en el municipio de Yopal"*

¿Cuáles son los indicadores de vacunación más altos y bajos en tu departamento?`;
  }

  // Método correcto (alias) para compatibilidad con otros servicios
  async getAvailableQuestions(): Promise<string> {
    return this.getAvailabeQuestions();
  }

  // Limpia la codificación de caracteres
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

  // Normaliza texto para búsqueda (departamento/municipio)
  private normalizeDepto(text: string): string {
    return this.cleanEncoding(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normaliza municipio
  private normalizeMunicipio(text: string): string {
    return this.cleanEncoding(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Mapea una fila de la base de datos a la interfaz VaccinationCoverage
  private mapToCoverage(r: Vaccination): VaccinationCoverage {
    return {
      coddepto: this.cleanEncoding(r.coddepto || ''),
      departamento: this.cleanEncoding(r.departamento || 'Desconocido'),
      a_o: this.cleanEncoding(String(r.a_o || '')),
      biol_gico: this.cleanEncoding(r.biol_gico || ''),
      cobertura_de_vacunaci_n: String(r.cobertura_de_vacunaci_n || '0'),
      indicator1: r.indicator1 ? this.cleanEncoding(r.indicator1) : undefined,
      indicator1_1: r.indicator1_1 ? this.cleanEncoding(r.indicator1_1) : undefined,
      indicator1_2: r.indicator1_2 ? this.cleanEncoding(r.indicator1_2) : undefined,
      indicator1_3: r.indicator1_3 ? this.cleanEncoding(r.indicator1_3) : undefined,
      indicator1_4: r.indicator1_4 ? this.cleanEncoding(r.indicator1_4) : undefined,
      indicator1_5: r.indicator1_5 ? this.cleanEncoding(r.indicator1_5) : undefined,
    };
  }

  // Detecta pregunta de vacunación y retorna interrogantes o respuesta
  async detectVaccinationQuestion(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    // Detectar si es una pregunta general sobre vacunación
    const isGeneralVaccinationQuestion = norm.includes('vacunación') ||
      norm.includes('vacunacion') ||
      (norm.includes('que') && norm.includes('informacion') && norm.includes('vacunacion')) ||
      (norm.includes('que') && norm.includes('info') && norm.includes('vacunacion')) ||
      (norm.includes('datos') && (norm.includes('vacunacion') || norm.includes('vacunación')));

    if (isGeneralVaccinationQuestion && !norm.includes('departamento') && !norm.includes('municipio')) {
      return this.getAvailabeQuestions();
    }

    // Si el usuario quiere que le muestre los municipios y departamentos disponibles
    if (norm.includes('vacunas') && norm.includes('municipios') && norm.includes('departamentos')) {
      const departamentos = await this.getAllDepartament();
      const municipios = await this.getAllMunicipios();
      return `📌 **Departamentos disponibles:**\n${departamentos.join(', ')}\n\n📌 **Municipios disponibles:**\n${municipios.join(', ')}`;
    }

    // Si el Usuario solo pregunta por departamentos 
    if (norm.includes('departamentos')) {
      const departamentos = await this.getAllDepartament();
      return `📌 **Departamentos disponibles:**\n${departamentos.join(', ')}`;
    }

    // Si el Usuario solo pregunta por municipios 
    if (norm.includes('municipios')) {
      const municipios = await this.getAllMunicipios();
      return `📌 **Municipios disponibles:**\n${municipios.join(', ')}`;
    }


    return null;
  }

  // Obtiene la cobertura de vacunación por departamento
  async getCoverageByDepartment(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = this.normalizeDepto(departamento);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orWhere('LOWER(v.indicator1) LIKE :q', { q: `%${searchDepto}%` })
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // Cobertura de vacunación por municipio
  async getCoverageByMunicipio(municipio: string): Promise<VaccinationCoverage[]> {
    const searchMunicipio = this.normalizeMunicipio(municipio);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.indicator1) LIKE :q', { q: `%${searchMunicipio}%` })
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // Obtiene todos los departamentos de vacunación
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

  // Obtiene todos los municipios de vacunación
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

  // Obtiene los indicadores de vacunación con cobertura por departamento
  async getIndicatorsByDepartment(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = this.normalizeDepto(departamento);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // Obtiene los indicadores de vacunación con cobertura por municipio
  async getIndicatorsByMunicipio(municipio: string): Promise<VaccinationCoverage[]> {
    const searchMunicipio = this.normalizeMunicipio(municipio);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.indicator1) LIKE :q', { q: `%${searchMunicipio}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // Obtiene los 5 indicadores con menor cobertura por departamento
  async getLowestIndicatorsByDepartamento(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = this.normalizeDepto(departamento);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'ASC')
      .limit(5)
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }
  // Obtiene los 5 indicadores con mayor cobertura por departamento
  async getHighestIndicatorsByDepartamento(departamento: string): Promise<VaccinationCoverage[]> {
    const searchDepto = this.normalizeDepto(departamento);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .limit(5)
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // Obtiene los 5 indicadores con mayor cobertura por municipio
  async getHighestIndicatorsByMunicipio(municipio: string): Promise<VaccinationCoverage[]> {
    const searchMunicipio = this.normalizeMunicipio(municipio);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.indicator1) LIKE :q', { q: `%${searchMunicipio}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .limit(5)
      .getRawMany();

    return rows.map(r => this.mapToCoverage(r as unknown as Vaccination));
  }

  // Obtiene los 5 indicadores con menor cobertura por municipio
  async getLowestIndicatorsByMunicipio(municipio: string): Promise<VaccinationCoverage[]> {
    const searchMunicipio = this.normalizeMunicipio(municipio);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.indicator1) LIKE :q', { q: `%${searchMunicipio}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'ASC')
      .limit(5)
      .getRawMany();

    return rows.map(r => this.mapToCoverage(r as unknown as Vaccination));
  }

  // NUEVO: Obtiene estadísticas completas de vacunación por departamento
  async getVaccinationStatsByDepartment(departamento: string): Promise<string> {
    const data = await this.getIndicatorsByDepartment(departamento);

    if (!data || data.length === 0) {
      return `No se encontraron datos de vacunación para el departamento ${departamento}.`;
    }

    const totalIndicators = data.length;
    const avgCoverage = data.reduce((sum, d) => sum + parseFloat(d.cobertura_de_vacunaci_n || '0'), 0) / totalIndicators;

    // Agrupar por biol_gico
    const biologicoGroups: Record<string, number> = {};
    for (const item of data) {
      const bio = item.biol_gico || 'Sin especificar';
      biologicoGroups[bio] = (biologicoGroups[bio] || 0) + 1;
    }

    return `📊 **Estadísticas de Vacunación - ${departamento}**

📈 **Total de indicadores:** ${totalIndicators}
📊 **Cobertura promedio:** ${avgCoverage.toFixed(2)}%

💉 **Vacunas biológicas disponibles:**
${Object.entries(biologicoGroups).map(([bio, count]) => `• ${bio}: ${count} registros`).join('\n')}

📅 **Años disponibles:** ${[...new Set(data.map(d => d.a_o))].join(', ')}`;
  }

  // NUEVO: Obtiene estadísticas completas de vacunación por municipio
  async getVaccinationStatsByMunicipio(municipio: string): Promise<string> {
    const data = await this.getIndicatorsByMunicipio(municipio);

    if (!data || data.length === 0) {
      return `No se encontraron datos de vacunación para el municipio ${municipio}.`;
    }

    const totalIndicators = data.length;
    const avgCoverage = data.reduce((sum, d) => sum + parseFloat(d.cobertura_de_vacunaci_n || '0'), 0) / totalIndicators;

    return `📊 **Estadísticas de Vacunación - ${municipio}**

📈 **Total de indicadores:** ${totalIndicators}
📊 **Cobertura promedio:** ${avgCoverage.toFixed(2)}%

💉 **Vacunas biológicas:** ${[...new Set(data.map(d => d.biol_gico))].join(', ')}
📅 **Años disponibles:** ${[...new Set(data.map(d => d.a_o))].join(', ')}`;
  }

  // NUEVO: Obtiene top 5 departamentos por cobertura promedio
  async getTopDepartmentsByCoverage(): Promise<VaccinationCoverage[]> {
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('v.departamento', 'departamento')
      .addSelect('AVG(CAST(v.cobertura_de_vacunaci_n AS REAL))', 'avgCoverage')
      .where('v.departamento IS NOT NULL')
      .groupBy('v.departamento')
      .orderBy('avgCoverage', 'DESC')
      .limit(5)
      .getRawMany();

    // Obtener datos completos para cada departamento top
    const topDepartments: VaccinationCoverage[] = [];
    for (const row of rows) {
      const dept = this.cleanEncoding(row.departamento);
      const deptData = await this.getCoverageByDepartment(dept);
      if (deptData.length > 0) {
        topDepartments.push({
          ...deptData[0],
          cobertura_de_vacunaci_n: row.avgCoverage.toFixed(2),
        });
      }
    }

    return topDepartments;
  }

  // NUEVO: Busca vacunas por tipo biológico
  async getVaccinationByBiologico(biologico: string): Promise<VaccinationCoverage[]> {
    const searchBio = this.normalizeDepto(biologico);
    const rows = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.biol_gico) LIKE :q', { q: `%${searchBio}%` })
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // NUEVO: Búsqueda flexible por múltiples criterios
  async searchVaccinationData(criteria: {
    departamento?: string;
    municipio?: string;
    biologico?: string;
    year?: string;
  }): Promise<VaccinationCoverage[]> {
    const query = this.repo.createQueryBuilder('v');

    if (criteria.departamento) {
      query.andWhere('LOWER(v.departamento) LIKE :depto', { depto: `%${this.normalizeDepto(criteria.departamento)}%` });
    }
    if (criteria.municipio) {
      query.andWhere('LOWER(v.indicator1) LIKE :municipio', { municipio: `%${this.normalizeMunicipio(criteria.municipio)}%` });
    }
    if (criteria.biologico) {
      query.andWhere('LOWER(v.biol_gico) LIKE :bio', { bio: `%${this.normalizeDepto(criteria.biologico)}%` });
    }
    if (criteria.year) {
      query.andWhere('v.a_o = :year', { year: criteria.year });
    }

    const rows = await query
      .orderBy('CAST(v.cobertura_de_vacunaci_n AS REAL)', 'DESC')
      .limit(50)
      .getMany();

    return rows.map(r => this.mapToCoverage(r));
  }

  // NUEVO: Obtiene resumen general de cobertura por año
  async getCoverageSummary(): Promise<string> {
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('v.a_o', 'year')
      .addSelect('AVG(CAST(v.cobertura_de_vacunaci_n AS REAL))', 'avgCoverage')
      .addSelect('MIN(CAST(v.cobertura_de_vacunaci_n AS REAL))', 'minCoverage')
      .addSelect('MAX(CAST(v.cobertura_de_vacunaci_n AS REAL))', 'maxCoverage')
      .where('v.a_o IS NOT NULL')
      .groupBy('v.a_o')
      .orderBy('v.a_o', 'DESC')
      .getRawMany();

    if (rows.length === 0) {
      return 'No hay datos de vacunación disponibles.';
    }

    return `📊 **Resumen de Cobertura de Vacunación por Año**

${rows.map(row => {
      const year = this.cleanEncoding(row.year) || 'Sin año';
      const avg = parseFloat(row.avgCoverage || '0').toFixed(2);
      const min = parseFloat(row.minCoverage || '0').toFixed(2);
      const max = parseFloat(row.maxCoverage || '0').toFixed(2);
      return `📅 **${year}:**\n   Promedio: ${avg}% | Mín: ${min}% | Máx: ${max}%`;
    }).join('\n\n')}`;
  }

  // NUEVO: Obtiene indicadores disponibles por departamento
  async getAvailableIndicatorsByDepartment(departamento: string): Promise<string[]> {
    const searchDepto = this.normalizeDepto(departamento);
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v.indicator1', 'indicator1')
      .where('LOWER(v.departamento) LIKE :q', { q: `%${searchDepto}%` })
      .orderBy('v.indicator1', 'ASC')
      .getRawMany();

    return rows
      .map(r => this.cleanEncoding(r.indicator1 || ''))
      .filter(m => m && m.length > 2);
  }

  // NUEVO: Obtiene indicadores disponibles por municipio
  async getAvailableIndicatorsByMunicipio(municipio: string): Promise<string[]> {
    const searchMunicipio = this.normalizeMunicipio(municipio);
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v.indicator1', 'indicator1')
      .where('LOWER(v.indicator1) LIKE :q', { q: `%${searchMunicipio}%` })
      .orderBy('v.indicator1', 'ASC')
      .getRawMany();

    return rows
      .map(r => this.cleanEncoding(r.indicator1 || ''))
      .filter(m => m && m.length > 2);
  }

  // obtiene los municipios de la provincia que tienen datos
  async getMunicipios() {
    const rows = await this.createQueryBuilder('v')
      .select('DISTINCT v.municipio')
      .where('v.municipio IS NOT NULL')
      .orderBy('v.municipio', 'ASC')
      .getRawMany();

    return rows
      .map(r => this.cleanEncoding(r.municipio || ''))
      .filter(m => m && m.length > 2);
  }

  // Construye la consulta de la entidad que se desea consultar
  createQueryBuilder(entity: string) {
    return this.repo.createQueryBuilder(entity);
  }
}
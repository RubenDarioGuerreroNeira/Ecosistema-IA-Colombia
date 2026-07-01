import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AntioquiaProvider } from '../../entities/antioquia-provider.entity';
import { normalizeString, STOPWORDS } from '../../shared/health-utils';

@Injectable()
export class AntioquiaHealthService implements OnModuleInit {
  private readonly logger = new Logger(AntioquiaHealthService.name);
  private providers: any[] = [];
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectRepository(AntioquiaProvider)
    private readonly antioquiaRepo: Repository<AntioquiaProvider>,
  ) { }

  async onModuleInit() {
    await this.loadData();
  }

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  async loadData() {
    try {
      const count = await this.antioquiaRepo.count();
      this.logger.log(`Datos de Antioquia cargados desde SQLite: ${count} prestadores.`);
    } catch (error) {
      this.logger.error('Error cargando datos de Antioquia', error);
      this.providers = [];
    }
  }

  // ---------------------------------------------------------------------------
  // Caché
  // ---------------------------------------------------------------------------
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCached<T>(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ---------------------------------------------------------------------------
  // Conocimiento del bot - Preguntas disponibles
  // ---------------------------------------------------------------------------
  /**
   * Retorna las preguntas que el bot puede responder sobre Antioquia.
   * Se muestra cuando el usuario pregunta "¿Qué información tienes de Antioquia?" o similar.
   */
  getAvailableQuestions(): string {
    return `🏥 **Preguntas que puedo responder sobre Antioquia:**

📍 **Búsqueda de prestadores:**
• "Buscar hospitales en Medellín"
• "¿Qué centros de salud hay en Bello?"
• "Prestadores de salud en Itagüí"
• "Clínicas en Envigado"

🔍 **Búsqueda por nombre:**
• "¿Dónde queda el Hospital General de Medellín?"
• "Información de la Clínica Las Vegas"
• "Buscar por NIT o código de habilitación"

📊 **Estadísticas:**
• "¿Cuántos prestadores hay en Antioquia?"
• "Lista de municipios con centros de salud"
• "Resumen de la red de salud de Antioquia"

🏢 **Por categoría:**
• "Hospitales en Antioquia"
• "Clínicas en Antioquia"
• "IPS en Antioquia"

✨ *Puedes preguntar con lenguaje natural y te ayudaré a encontrar la información que necesitas.*`;
  }

  /**
   * Detecta si la consulta del usuario es sobre qué información tiene el bot de Antioquia.
   * Resuelve la pregunta: "¿Qué información tienes de Antioquia?" / "¿Qué sabes de Antioquia?"
   */
  isKnowledgeQuery(text: string): boolean {
    const q = this.normalizeString(text);
    const knowledgePatterns = [
      'antioquia',
      'que sabes de antioquia',
      'que informacion tienes de antioquia',
      'que informacion hay sobre antioquia',
      'que servicios de salud hay en antioquia',
      'prestadores de salud en antioquia',
      'centros de salud en antioquia',
      'que puedes decirme de antioquia',
      'dime sobre antioquia',
      'salud en antioquia',
      'red de salud de antioquia',
      'servicios medicos en antioquia',

    ];
    return knowledgePatterns.some(pattern => q.includes(pattern));
  }

  /**
   * Resumen de conocimiento para el bot.
   * Resuelve la pregunta: "¿Cuántos prestadores hay?" / "Resumen de Antioquia"
   */
  getKnowledgeSummary(): string {
    const stats = this.getTerritoryStats();
    const municipios = this.getMunicipios();

    return `🏥 **Red de Salud - Antioquia**

📊 **Estadísticas:**
• Total de prestadores registrados: ${stats.totalProviders}
• Municipios cubiertos: ${stats.totalMunicipios}

🏆 **Principales municipios:**
${stats.topMunicipios.slice(0, 5).map(m => `• ${m.municipio} (${m.count} prestadores)`).join('\n')}

ℹ️ *Puedes buscar prestadores por municipio, nombre, NIT o código de habilitación.*`;
  }

  // ---------------------------------------------------------------------------
  // Procesamiento principal de consultas
  // ---------------------------------------------------------------------------
  /**
   * Procesa una consulta de texto sobre Antioquia y retorna una respuesta formateada.
   * Es el método principal que debe ser llamado desde bot.update.ts.
   *
   * Ruta de procesamiento:
   * 1. isKnowledgeQuery() → getAvailableQuestions()
   * 2. getMunicipios() → "¿Qué municipios tienes?"
   * 3. Búsqueda por código/NIT → findByIdentifier()
   * 4. Búsqueda general → searchProviders()
   */
  async processAntioquiaQuery(text: string): Promise<{ respuesta: string; tipo: string } | null> {
    const q = this.normalizeString(text);

    // ── [1] CONSULTA DE CONOCIMIENTO ─────────────────────────────────────────
    // Responde: "¿Qué sabes de Antioquia?", "¿Qué información tienes de Antioquia?"
    if (this.isKnowledgeQuery(text)) {
      return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
    }

    // ── [2] LISTA DE MUNICIPIOS ───────────────────────────────────────────────
    // Responde: "¿Qué municipios tienes?", "Lista de municipios de Antioquia"
    if (
      q.includes('municipios') ||
      q.includes('municipio') ||
      q.includes('ciudades') ||
      q.includes('ciudad')
    ) {
      const municipios = await this.getMunicipios();
      if (municipios && municipios.length > 0) {
        const list = municipios.slice(0, 20).map(m => `• ${m}`).join('\n');
        return {
          respuesta: `📍 **Municipios de Antioquia con prestadores registrados (${municipios.length} total):**\n\n${list}${municipios.length > 20 ? '\n\n*... y ' + (municipios.length - 20) + ' municipios más.*' : ''}`,
          tipo: 'listado',
        };
      }
    }

    // ── [3] BÚSQUEDA POR IDENTIFICADOR (código/NIT) ──────────────────────────
    // Responde: "Buscar por código de habilitación", "Buscar por NIT"
    if (
      q.includes('codigo') ||
      q.includes('habilitacion') ||
      q.includes('nit') ||
      q.includes('identificador') ||
      /^\d{5,}$/.test(q.replace(/\s/g, '')) // Solo dígitos, longitud >= 5
    ) {
      const results = await this.findByIdentifier(text);
      if (results.length > 0) {
        const formatted = results.slice(0, 5).map(p => this.formatProviderResponse(p)).join('\n\n');
        return {
          respuesta: `🔍 *Resultados para "${text}":*\n\n${formatted}`,
          tipo: 'resultados',
        };
      }
    }

    // ── [4] BÚSQUEDA GENERAL ──────────────────────────────────────────────────
    // Responde cualquier otra consulta: "Hospitales en Medellín", "Clínicas en Bello"
    const results = await this.searchProviders(text, 10);
    if (results.length > 0) {
      const unique = this.getUniqueProviders(results).slice(0, 5);
      let response = '🔍 *Resultados de búsqueda en Antioquia:*\n\n';
      for (const p of unique) {
        response += this.formatProviderResponse(p) + '\n\n';
      }
      if (results.length > 5) {
        response += `*... y ${results.length - 5} resultados más.*`;
      }
      return { respuesta: response, tipo: 'resultados' };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Búsquedas
  // ---------------------------------------------------------------------------
  /**
   * Busca prestadores de salud en Antioquia por query de texto.
   * Utiliza búsqueda en múltiples campos: municipio, nombre del prestador, sede, gerente.
   *
   * Resuelve preguntas como:
   * - "Buscar hospitales en Medellín"
   * - "Clínicas en Bello"
   * - "Prestadores de salud en Itagüí"
   */
  async searchProviders(query: string, limit = 100): Promise<any[]> {
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const rawTokens = this.getSignificantTokens(query);
    if (rawTokens.length === 0) return [];

    const tokens = rawTokens.map(t => {
      if (t.endsWith('es') && t.length > 5) return t.substring(0, t.length - 2);
      if (t.endsWith('s') && t.length > 4) return t.substring(0, t.length - 1);
      return t;
    });

    const cacheKey = `search_${tokens.join('_')}_${safeLimit}`;
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.antioquiaRepo.createQueryBuilder('p');
    queryBuilder.where('LOWER(p.departamento) LIKE :dept', { dept: '%antioquia%' });
    tokens.forEach((tok, i) => {
      const condition = `(LOWER(p.municipio) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombreprestador) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.nombre_sede) LIKE '%' || LOWER(:tok${i}) || '%' OR LOWER(p.gerente) LIKE '%' || LOWER(:tok${i}) || '%')`;
      queryBuilder.andWhere(condition, { [`tok${i}`]: tok });
    });

    const rawResult = await queryBuilder.limit(safeLimit).getMany();
    const result = rawResult.filter((p: any) => {
      const dept = (p.departamento || '').toLowerCase();
      const muni = (p.municipio || '').toLowerCase();
      return dept.includes('antioquia') && !['yopal', 'casanare', 'tame', 'saravena', 'arauca'].includes(muni);
    });
    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Busca un prestador por código de habilitación, NIT o nombre.
   * Resuelve preguntas como:
   * - "Buscar por código de habilitación 012345"
   * - "Buscar por NIT 890123456"
   * - "¿Dónde queda el Hospital General de Medellín?"
   */
  async findByIdentifier(query: string): Promise<any[]> {
    const q = query.toString().trim().toLowerCase();
    const cacheKey = `findById_${q}`;
    const cached = this.getCached<any[]>(cacheKey);
    if (cached) return cached;

    // Búsqueda por código de habilitación
    const byCode = await this.antioquiaRepo.find({
      where: [{ codigohabilitacion: q }],
      take: 10,
    });
    const codeFiltered = byCode.filter(p => {
      const dept = (p.departamento || '').toLowerCase();
      const muni = (p.municipio || '').toLowerCase();
      return dept.includes('antioquia') && !['yopal', 'casanare', 'tame', 'saravena', 'arauca'].includes(muni);
    });
    if (codeFiltered.length > 0) {
      this.setCached(cacheKey, codeFiltered);
      return codeFiltered;
    }

    // Búsqueda por NIT
    const normNit = this.normalizeNit(q);
    if (normNit) {
      const byNit = await this.antioquiaRepo.find({
        where: { nit: this.normalizeNitLike(normNit) },
        take: 10,
      });
      const nitFiltered = byNit.filter(p => {
        const dept = (p.departamento || '').toLowerCase();
        const muni = (p.municipio || '').toLowerCase();
        return dept.includes('antioquia') && !['yopal', 'casanare', 'tame', 'saravena', 'arauca'].includes(muni);
      });
      if (nitFiltered.length > 0) {
        this.setCached(cacheKey, nitFiltered);
        return nitFiltered;
      }
    }

    // Fallback: búsqueda por texto general
    const results = await this.searchProviders(query, 10);
    this.setCached(cacheKey, results);
    return results;
  }

  /**
   * Obtiene la lista de municipios de Antioquia que tienen prestadores registrados.
   * Resuelve la pregunta: "¿Qué municipios tienes?" / "Lista de municipios de Antioquia"
   */
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

  // ---------------------------------------------------------------------------
  // Formateo de respuestas
  // ---------------------------------------------------------------------------
  /**
   * Formatea la información de un prestador de salud para mostrarla en el bot.
   * Resuelve la presentación de datos para cualquier consulta de prestadores.
   */
  formatProviderResponse(provider: any): string {
    const escape = (text?: string): string => {
      if (!text) return 'No disponible';
      return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    let response = `🏥 *${escape(provider.nombreprestador || provider.nombre_sede || 'Sin nombre')}*\n`;
    response += `📍 ${escape(provider.municipio)}`;
    if (provider.direccion) response += ` - ${escape(provider.direccion)}`;
    response += '\n';
    if (provider.codigohabilitacion) response += `🔖 Código: ${escape(provider.codigohabilitacion)}\n`;
    if (provider.nit) response += `📄 NIT: ${escape(provider.nit)}\n`;
    if (provider.telefono) response += `📞 ${escape(provider.telefono)}\n`;
    if (provider.gerente) response += `👤 Gerente: ${escape(provider.gerente)}\n`;
    if (provider.nombre_sede) response += `🏢 Sede: ${escape(provider.nombre_sede)}\n`;
    return response.replace(/\n?Fuente: (Antioquia|Yopal)/g, '');
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  private normalizeString(value?: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[-\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizeNit(nit: string): string | null {
    const clean = nit.replace(/[^0-9]/g, '');
    return clean.length >= 5 ? clean : null;
  }

  private normalizeNitLike(nit: string): any {
    // Retorna un objeto Like para TypeORM
    return { nit: `%${nit}%` } as any;
  }

  protected getSignificantTokens(query: string, maxTokens = 10): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t))
      .slice(0, maxTokens);
  }

  private getUniqueProviders(providers: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const provider of providers) {
      const key = `${provider.codigohabilitacion || ''}_${provider.nombreprestador || ''}_${provider.nombre_sede || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(provider);
      }
    }

    return unique;
  }

  // ---------------------------------------------------------------------------
  // Estadísticas territoriales
  // ---------------------------------------------------------------------------
  private getTerritoryStats(): { totalProviders: number; totalMunicipios: number; topMunicipios: { municipio: string; count: number }[] } {
    // Se calcula de forma básica. Para datos más precisos, se puede consultar la BD.
    return {
      totalProviders: 0,
      totalMunicipios: 0,
      topMunicipios: [],
    };
  }
}
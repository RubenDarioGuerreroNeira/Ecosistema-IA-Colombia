import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface CaliHealthProvider {
  complejidad?: string;
  sede?: string;
  grupo?: string;
  servicio?: string;
  direccion?: string;
  geolocalizacion?: string;
  departamento?: string;
  ciudad?: string;
  telefono?: string;
  extension?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class CaliHealthService implements OnModuleInit {
  private readonly logger = new Logger(CaliHealthService.name);
  private providers: CaliHealthProvider[] = [];
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  async onModuleInit() {
    await this.loadData();
  }

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'SERVICIOS_OFERTADOS_RED_DE_SALUD_DEL_CENTRO_ESE_POR_SEDE_CALI.xml',
      );
      this.logger.log(`Attempting to load XML from: ${filePath}`);
      const xmlData = fs.readFileSync(filePath, 'utf-8');

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      const rawRows = result.response?.rows?.row;
      this.providers = Array.isArray(rawRows)
        ? rawRows.map((r) => this.mapRow(r))
        : rawRows
          ? [this.mapRow(rawRows)]
          : [];

      this.logger.log(`Loaded ${this.providers.length} providers for Cali.`);
    } catch (error) {
      this.logger.error('Failed to load Cali health services XML', error);
      this.providers = [];
    }
  }

  private mapRow(row: any): CaliHealthProvider {
    return {
      complejidad: row.complejidad || row.complejidad_sede || undefined,
      sede: row.sede || row.nombre_sede || undefined,
      grupo: row.grupo || undefined,
      servicio: row.servicio || undefined,
      direccion: row.direcci_n || row.direccion || undefined,
      geolocalizacion: row.geolocalizaci_n || undefined,
      departamento: row.departamento || undefined,
      ciudad: row.ciudad || row.municipio || undefined,
      telefono: row.tel_fono || row.telefono || undefined,
      extension: row.extensi_n || undefined,
    };
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
  // Normalización (mejorada)
  // ---------------------------------------------------------------------------
  private normalizeString(value?: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[-\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private getSignificantTokens(query: string): string[] {
    const normalized = this.normalizeString(query);
    if (!normalized) return [];

    const stopWords = new Set([
      'de', 'del', 'en', 'el', 'la', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'y', 'o', 'u', 'e', 'con', 'sin', 'por', 'para', 'a', 'al', 'que', 'como', 'cual',
      'cuantos', 'hay', 'tiene', 'esta', 'donde', 'queda', 'buscar', 'busco', 'centros',
      'centro', 'salud', 'prestadores', 'informacion', 'sobre', 'dónde', 'cuál', 'cómo',
      'cuáles', 'son', 'clinica', 'clinicas', 'hospital', 'hospitales', 'servicios',
      'servicio', 'sede', 'sedes', 'grupo', 'grupos', 'departamento', 'ciudad',
      'municipio', 'direccion'
    ]);

    return normalized
      .split(/\s+/)
      .map((token) => token.trim())
      .map((t) => t.replace(/[¿?.,;:!¡"'()\[\]{}]/g, ''))
      .filter((token) => token.length >= 3 && !stopWords.has(token));
  }

  // ---------------------------------------------------------------------------
  // Búsquedas (mejoradas)
  // ---------------------------------------------------------------------------
  searchProviders(query: string): CaliHealthProvider[] {
    const q = this.normalizeString(query);
    if (!q) return [];

    const cacheKey = `search_${q}`;
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const stopWords = new Set([
      'de', 'del', 'en', 'el', 'la', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'y', 'o', 'u', 'e', 'con', 'sin', 'por', 'para', 'a', 'al', 'que', 'como', 'cual',
      'cuantos', 'hay', 'tiene', 'esta', 'donde', 'queda', 'buscar', 'busco', 'centros',
      'centro', 'salud', 'prestadores', 'informacion', 'sobre', 'dónde', 'cuál', 'cómo',
      'cuáles', 'son', 'clinica', 'clinicas', 'hospital', 'hospitales', 'servicios',
      'servicio', 'sede', 'sedes', 'grupo', 'grupos', 'departamento', 'ciudad',
      'municipio', 'direccion'
    ]);

    const isStopWord = stopWords.has(q);

    const exactSedeMatches = this.providers.filter((p) =>
      this.normalizeString(p.sede).includes(q),
    );

    if (exactSedeMatches.length > 0 && !isStopWord) {
      this.setCached(cacheKey, exactSedeMatches);
      return exactSedeMatches;
    }

    const tokens = this.getSignificantTokens(query);
    if (tokens.length === 0) return [];

    const result = this.providers.filter((p) => {
      const fields = [
        this.normalizeString(p.ciudad),
        this.normalizeString(p.sede),
        this.normalizeString(p.servicio),
        this.normalizeString(p.grupo),
        this.normalizeString(p.direccion),
      ];

      return tokens.some((token) =>
        fields.some((field) => field && field.includes(token)),
      );
    });

    this.setCached(cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Búsqueda por grupo
  // ---------------------------------------------------------------------------
  getProvidersByGroup(group: string): CaliHealthProvider[] {
    const q = this.normalizeString(group);
    if (!q) return [];

    const cacheKey = `group_${q}`;
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const result = this.providers.filter((p) =>
      this.normalizeString(p.grupo).includes(q)
    );

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Obtiene los grupos disponibles con conteo de servicios
   */
  getGruposDisponibles(): { grupo: string; count: number }[] {
    const stats: Record<string, Set<string>> = {};
    for (const p of this.providers) {
      if (p.grupo) {
        const key = p.grupo;
        if (!stats[key]) stats[key] = new Set();
        stats[key].add(p.servicio || '');
      }
    }
    return Object.entries(stats)
      .map(([grupo, servicios]) => ({
        grupo,
        count: servicios.size,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Búsqueda por complejidad
  // ---------------------------------------------------------------------------
  getProvidersByComplejidad(complejidad: string): CaliHealthProvider[] {
    const q = this.normalizeString(complejidad);
    if (!q) return [];

    const cacheKey = `complejidad_${q}`;
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const result = this.providers.filter((p) =>
      this.normalizeString(p.complejidad).includes(q)
    );

    this.setCached(cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Búsqueda por servicio específico
  // ---------------------------------------------------------------------------
  searchByService(serviceName: string): CaliHealthProvider[] {
    const q = this.normalizeString(serviceName);
    if (!q) return [];

    const cacheKey = `service_${q}`;
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const result = this.providers.filter((p) =>
      this.normalizeString(p.servicio).includes(q)
    );

    this.setCached(cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Servicios de urgencias
  // ---------------------------------------------------------------------------
  getEmergencyServices(): CaliHealthProvider[] {
    const cacheKey = 'emergency_services';
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const result = this.providers.filter((p) =>
      p.grupo?.toLowerCase().includes('urgencia') ||
      p.servicio?.toLowerCase().includes('urgencia') ||
      p.servicio?.toLowerCase().includes('emergencia')
    );

    this.setCached(cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Detalles completos de una sede
  // ---------------------------------------------------------------------------
  getProviderDetails(sedeName: string): {
    sede: string;
    direccion: string;
    telefono: string;
    servicios: { grupo: string; servicio: string; complejidad: string }[];
    totalServicios: number;
  } | null {
    const q = this.normalizeString(sedeName);
    if (!q) return null;

    const providers = this.providers.filter((p) =>
      this.normalizeString(p.sede).includes(q)
    );

    if (providers.length === 0) return null;

    const first = providers[0];
    const servicios = providers.map(p => ({
      grupo: p.grupo || 'No especificado',
      servicio: p.servicio || 'No especificado',
      complejidad: p.complejidad || 'No especificada',
    }));

    // Agrupar servicios únicos por grupo
    const serviciosUnicos = Array.from(
      new Map(servicios.map(s => [s.servicio, s])).values()
    );

    return {
      sede: first.sede || 'Sin nombre',
      direccion: first.direccion || 'Dirección no disponible',
      telefono: first.telefono || 'Teléfono no disponible',
      servicios: serviciosUnicos.slice(0, 10), // Top 10 servicios
      totalServicios: serviciosUnicos.length,
    };
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Estadísticas por sede
  // ---------------------------------------------------------------------------
  getServiceStats(): {
    totalSedes: number;
    totalServicios: number;
    topSedes: { sede: string; count: number }[];
    topGrupos: { grupo: string; count: number }[];
  } {
    const cacheKey = 'service_stats';
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const sedes = new Map<string, Set<string>>();
    const grupos = new Map<string, Set<string>>();

    for (const p of this.providers) {
      if (p.sede) {
        if (!sedes.has(p.sede)) sedes.set(p.sede, new Set());
        sedes.get(p.sede)!.add(p.servicio || '');
      }
      if (p.grupo) {
        if (!grupos.has(p.grupo)) grupos.set(p.grupo, new Set());
        grupos.get(p.grupo)!.add(p.servicio || '');
      }
    }

    const topSedes = Array.from(sedes.entries())
      .map(([sede, servicios]) => ({ sede, count: servicios.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topGrupos = Array.from(grupos.entries())
      .map(([grupo, servicios]) => ({ grupo, count: servicios.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const result = {
      totalSedes: sedes.size,
      totalServicios: this.providers.length,
      topSedes,
      topGrupos,
    };

    this.setCached(cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Obtener todas las sedes únicas
  // ---------------------------------------------------------------------------
  getUniqueSedes(): string[] {
    const sedes = new Set<string>();
    for (const p of this.providers) {
      if (p.sede) sedes.add(p.sede);
    }
    return Array.from(sedes).sort();
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Formatear respuesta para el bot
  // ---------------------------------------------------------------------------
  formatProviderResponse(provider: CaliHealthProvider): string {
    const escapeMarkdown = (text: string): string => {
      return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    let response = `🏥 *${escapeMarkdown(provider.sede || 'Sin nombre')}*\n`;
    response += `📍 ${escapeMarkdown(provider.direccion || 'Dirección no disponible')}\n`;
    if (provider.telefono) {
      response += `📞 ${escapeMarkdown(provider.telefono)}`;
      if (provider.extension) response += ` (Ext: ${escapeMarkdown(provider.extension)})`;
      response += '\n';
    }
    if (provider.grupo) response += `📂 Grupo: ${escapeMarkdown(provider.grupo)}\n`;
    if (provider.servicio) response += `🩺 Servicio: ${escapeMarkdown(provider.servicio)}\n`;
    if (provider.complejidad) response += `📊 Complejidad: ${escapeMarkdown(provider.complejidad)}\n`;
    if (provider.ciudad) response += `📍 ${escapeMarkdown(provider.ciudad)}`;
    return response;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Formatear respuesta completa de una sede
  // ---------------------------------------------------------------------------
  formatSedeDetails(sedeName: string): string | null {
    const details = this.getProviderDetails(sedeName);
    if (!details) return null;

    const escapeMarkdown = (text: string): string => {
      return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    let response = `🏥 *${escapeMarkdown(details.sede)}*\n`;
    response += `📍 ${escapeMarkdown(details.direccion)}\n`;
    response += `📞 ${escapeMarkdown(details.telefono)}\n\n`;
    response += `📊 *Total de servicios:* ${details.totalServicios}\n\n`;

    if (details.servicios.length > 0) {
      response += `🩺 *Servicios principales:*\n`;
      for (const s of details.servicios.slice(0, 10)) {
        response += `• ${escapeMarkdown(s.servicio)} (${escapeMarkdown(s.grupo)})`;
        if (s.complejidad) response += ` - ${escapeMarkdown(s.complejidad)}`;
        response += '\n';
      }
      if (details.totalServicios > 10) {
        response += `\n*... y ${details.totalServicios - 10} servicios más.*`;
      }
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Preguntas disponibles para el bot
  // ---------------------------------------------------------------------------
  getAvailableQuestions(): string {
    const stats = this.getServiceStats();
    const grupos = this.getGruposDisponibles();
    const sedesPrincipales = this.getUniqueSedes().slice(0, 5);

    return `🏥 **Preguntas que puedo responder sobre la Red de Salud del Centro - Cali:**

📂 **Categorías (Grupos) disponibles:**
${grupos.slice(0, 8).map(g => `• ${g.grupo} (${g.count} servicios)`).join('\n')}
• *y ${grupos.length - 8} categorías más...*

🔍 **Búsqueda por servicio específico**
"¿Dónde hay servicios de odontología en Cali?"
"Centros con fisioterapia en Cali"
"¿Qué sedes ofrecen laboratorio clínico?"
"Rayos X o radiología en Cali"
"Servicios de psicología en Cali"

🆘 **Urgencias / Emergencias**
"¿Qué hospitales tienen urgencias en Cali?"
"Servicios de urgencias 24 horas en Cali"
"Atención inmediata o emergencias en Cali"

🏥 **Búsqueda por sede**
"Detalles del Hospital Primitivo Iglesias"
"¿Qué servicios ofrece la sede Centro?"
"Teléfono y dirección de la sede Norte"

📊 **Estadísticas y resúmenes**
"¿Cuántos servicios de salud hay en Cali?"
"Resumen de la red de salud de Cali"
"¿Cuántas sedes tiene la Red de Salud del Centro?"

📋 **Búsqueda general**
"Buscar centros de salud en Cali"
"Prestadores de salud en Cali"
"Sedes con servicios de medicina general"
"Categorias de servicios en Cali" te muestro -> (Total de Categorias de servicios en Cali)

✨ *Puedes preguntar con lenguaje natural y te ayudaré a encontrar los servicios que necesitas.*`;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Detecta si la consulta es sobre qué sabe el bot de Cali
  // ---------------------------------------------------------------------------
  isKnowledgeQuery(text: string): boolean {
    const q = this.normalizeString(text);
    const knowledgePatterns = [
      'que sabes de cali',
      'que informacion tienes de cali',
      'que informacion hay sobre cali',
      'que servicios de salud hay en cali',
      'prestadores de salud en cali',
      'centros de salud en cali',
      'centros de atencion en cali',
      'que puedes decirme de cali',
      'dime sobre cali',
      'salud en cali',
      'red de salud de cali',
      'servicios medicos en cali',
    ];
    return knowledgePatterns.some(pattern => q.includes(pattern));
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Procesa una consulta de texto para Cali
  // RUTA DE PROCESAMIENTO (orden de detección):
  //   1. isKnowledgeQuery() → getAvailableQuestions()  → "¿Qué sabes de Cali?"
  //   2. Emergencias/Urgencias     → getEmergencyServices() → "urgencias/24h/atencion inmediata"
  //   3. Categorías/Grupos         → getGruposDisponibles() → "categorías/grupos disponibles"
  //   4. Estadísticas/Resumen      → getKnowledgeSummary()  → "cuántos/resumen/total"
  //   5. Detalle de sede           → formatSedeDetails()    → "sede Centro/Hospital Primitivo Iglesias"
  //   6. Hospitales/Clínicas       → búsqueda en campos     → "hospitales/clínicas en Cali"
  //   7. Servicio específico       → searchByService()      → "odontología/fisioterapia/laboratorio..."
  //   8. Búsqueda general          → searchProviders()      → cualquier otra consulta
  // ---------------------------------------------------------------------------
  async processCaliQuery(text: string): Promise<{ respuesta: string; tipo: string } | null> {
    const q = this.normalizeString(text);

    // ── [1] CONSULTA DE CONOCIMIENTO ─────────────────────────────────────────
    // Responde: "¿Qué sabes de Cali?", "¿Qué información tienes sobre Cali?"
    if (this.isKnowledgeQuery(text)) {
      return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
    }

    // ── [2] URGENCIAS / EMERGENCIAS ──────────────────────────────────────────
    // Responde: "urgencias", "emergencias", "24 horas", "atención inmediata" en Cali
    if (
      q.includes('urgencia') ||
      q.includes('urgencias') ||
      q.includes('emergencia') ||
      q.includes('emergencias') ||
      q.includes('24 horas') ||
      q.includes('atencion inmediata')
    ) {
      const results = this.getEmergencyServices();
      if (results.length > 0) {
        const unique = this.getUniqueProvidersByCenter(results).slice(0, 5);
        let response = '🚨 *Servicios de Urgencias en Cali:*\n\n';
        for (const p of unique) {
          response += this.formatProviderResponse(p) + '\n';
        }
        return { respuesta: response, tipo: 'resultados' };
      }
    }

    // ── [3] CATEGORÍAS / GRUPOS ──────────────────────────────────────────────
    // Responde: "¿Qué categorías hay?", "grupos disponibles"
    if (
      q.includes('categorias de servicios') ||
      q.includes('servicios de salud') ||
      q.includes('grupo') ||
      q.includes('categorias') ||
      q.includes('grupos') ||
      q.includes('disponible')
    ) {
      const grupos = this.getGruposDisponibles();
      let response = '📂 *Categorías de servicios disponibles en Cali:*\n\n';
      for (const g of grupos.slice(0, 10)) {
        response += `• ${g.grupo} (${g.count} servicios)\n`;
      }
      if (grupos.length > 10) {
        response += `\n*y ${grupos.length - 10} categorías más...*`;
      }
      return { respuesta: response, tipo: 'listado' };
    }

    // ── [4] ESTADÍSTICAS / RESUMEN ───────────────────────────────────────────
    // Responde: "¿Cuántos servicios hay?", "resumen de la red de salud", "total de sedes"
    if (
      q.includes('estadistica') ||
      q.includes('cuantos') ||
      q.includes('resumen') ||
      q.includes('cuantas') ||
      q.includes('total')
    ) {
      return { respuesta: this.getKnowledgeSummary(), tipo: 'resumen' };
    }

    // ── [5] DETALLE DE SEDE ESPECÍFICA ───────────────────────────────────────
    // Responde: "Detalles del Hospital Primitivo Iglesias", "¿Qué servicios ofrece la sede Centro?",
    //           "Teléfono y dirección de la sede Norte"
    // Busca coincidencia de nombre de sede dentro de la consulta normalizada
    const sedes = this.getUniqueSedes();
    const sedeMatch = sedes.find(s => q.includes(this.normalizeString(s)));
    if (sedeMatch) {
      const details = this.formatSedeDetails(sedeMatch);
      if (details) {
        return { respuesta: details, tipo: 'detalle_sede' };
      }
    }

    // ── [6] HOSPITALES / CLÍNICAS ─────────────────────────────────────────────
    // Responde: "¿Qué hospitales hay en Cali?", "clínicas en Cali"
    // NOTA: esta sección se ejecuta antes que la búsqueda por servicio para dar prioridad
    // a consultas como "¿qué hospitales tienen urgencias?" (que ya fue capturada en [2])
    const isHospitalesClinicas =
      q.includes('hospital') ||
      q.includes('hospitales') ||
      q.includes('clinica') ||
      q.includes('clinicas') ||
      q.includes('clínic');
    if (isHospitalesClinicas) {
      const results = this.providers.filter((p) => {
        const sede = this.normalizeString(p.sede);
        const grupo = this.normalizeString(p.grupo);
        const servicio = this.normalizeString(p.servicio);
        const telefono = this.normalizeString(p.telefono);
        const direccion = this.normalizeString(p.direccion);
        return (
          sede.includes('hospital') ||
          sede.includes('clinica') ||
          grupo.includes('hospital') ||
          grupo.includes('clinica') ||
          servicio.includes('hospital') ||
          servicio.includes('clinica')
        );
      });
      if (results.length > 0) {
        const unique = this.getUniqueProvidersByCenter(results).slice(0, 5);
        let response = '🏥 *Hospitales y Clínicas en Cali:*\n\n';
        for (const p of unique) {
          response += this.formatProviderResponse(p) + '\n';
        }
        if (results.length > 5) {
          response += `\n*y ${results.length - 5} resultados más...*`;
        }
        return { respuesta: response, tipo: 'resultados' };
      }
    }

    // ── [7] BÚSQUEDA POR SERVICIO ESPECÍFICO ──────────────────────────────────
    // Responde: "odontología", "fisioterapia", "laboratorio clínico", "radiología",
    //           "psicología", "medicina general", "pediatría", etc.
    const servicios = ['odontologia', 'fisioterapia', 'laboratorio', 'radiologia', 'rayos x',
      'psicologia', 'medicina general', 'consulta externa', 'pediatria', 'ginecologia',
      'medicina interna', 'cirugia', 'dermatologia', 'nutricion', 'optometria',
      'oftalmologia', 'ecografia', 'mamografia', 'vacunacion', 'farmacia'];
    const servicioMatch = servicios.find(s => q.includes(s));
    if (servicioMatch) {
      const results = this.searchByService(servicioMatch);
      if (results.length > 0) {
        const unique = this.getUniqueProvidersByCenter(results).slice(0, 5);
        let response = `🔍 *Resultados para "${servicioMatch}" en Cali:*\n\n`;
        for (const p of unique) {
          response += this.formatProviderResponse(p) + '\n';
        }
        if (results.length > 5) {
          response += `\n*y ${results.length - 5} resultados más...*`;
        }
        return { respuesta: response, tipo: 'resultados' };
      }
    }

    // ── [8] BÚSQUEDA GENERAL (FALLBACK) ───────────────────────────────────────
    // Responde: cualquier otra consulta no capturada arriba, busca en todos los campos
    const results = this.searchProviders(text);
    if (results.length > 0) {
      const unique = this.getUniqueProvidersByCenter(results).slice(0, 5);
      let response = '🔍 *Resultados de búsqueda en Cali:*\n\n';
      for (const p of unique) {
        response += this.formatProviderResponse(p) + '\n';
      }
      if (results.length > 5) {
        response += `\n*y ${results.length - 5} resultados más...*`;
      }
      return { respuesta: response, tipo: 'resultados' };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // NUEVO: Resumen de conocimiento para el bot
  // ---------------------------------------------------------------------------
  getKnowledgeSummary(): string {
    const stats = this.getServiceStats();
    const grupos = this.getGruposDisponibles();
    const gruposList = grupos.slice(0, 5).map(g => `• ${g.grupo} (${g.count} servicios)`).join('\n');

    return `🏥 **Red de Salud del Centro - Cali**

📊 **Estadísticas:**
• Total de sedes: ${stats.totalSedes}
• Total de servicios: ${stats.totalServicios}

📂 **Categorías principales:**
${gruposList}

🏆 **Sedes con más servicios:**
${stats.topSedes.map(s => `• ${s.sede} (${s.count} servicios)`).join('\n')}

ℹ️ *Puedes consultar servicios por sede, grupo o complejidad.*`;
  }

  // ---------------------------------------------------------------------------
  // Métodos existentes (mantenidos)
  // ---------------------------------------------------------------------------
  private buildCenterKey(provider: CaliHealthProvider): string {
    const sede = this.normalizeString(provider.sede || provider.servicio);
    const direccion = this.normalizeString(provider.direccion);
    const ciudad = this.normalizeString(provider.ciudad);
    return `${sede}|${direccion}|${ciudad}`;
  }

  getUniqueProvidersByCenter(providers: CaliHealthProvider[]): CaliHealthProvider[] {
    const seen = new Set<string>();
    const unique: CaliHealthProvider[] = [];

    for (const provider of providers) {
      const key = this.buildCenterKey(provider);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(provider);
      }
    }

    return unique;
  }

  getMunicipios(): string[] {
    const seen = new Set<string>();
    return this.providers
      .map((p) => (p.ciudad || '').toString().trim())
      .filter((m) => m.length > 0)
      .filter((m) => {
        const nm = m.toLowerCase();
        if (seen.has(nm)) return false;
        seen.add(nm);
        return true;
      });
  }

  getExampleSearchHints(): string {
    const seen = new Set<string>();
    const examples: string[] = [];

    const addExample = (value?: string) => {
      const trimmed = (value || '').toString().trim();
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      examples.push(trimmed);
    };

    for (const provider of this.providers) {
      if (examples.length >= 6) break;
      if (provider.sede) addExample(`Sede ${provider.sede}`);
      if (provider.servicio) addExample(`Servicio ${provider.servicio}`);
      if (provider.grupo) addExample(`Grupo ${provider.grupo}`);
      if (provider.direccion) addExample(`Dirección ${provider.direccion}`);
    }

    if (examples.length === 0) return '';

    const selection = examples.slice(0, 4);
    return `Puedes filtrar con datos reales como ${selection.join(', ')}.`;
  }

  findByIdentifier(query: string): CaliHealthProvider[] {
    const q = this.normalizeString(query);
    if (!q) return [];

    const cacheKey = `ident_${q}`;
    const cached = this.getCached<CaliHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const tokens = this.getSignificantTokens(query);
    if (tokens.length === 0) return [];

    const result = this.providers.filter((p) => {
      const fields = [
        this.normalizeString(p.ciudad),
        this.normalizeString(p.sede),
        this.normalizeString(p.servicio),
        this.normalizeString(p.grupo),
        this.normalizeString(p.direccion),
      ];

      const exactMatch = fields.some((f) => f && (f.includes(q) || q.includes(f)));
      if (exactMatch) return true;

      if (tokens.length > 0) {
        return tokens.some((token) =>
          fields.some((field) => field && field.includes(token)),
        );
      }

      return false;
    });

    this.setCached(cacheKey, result);
    return result;
  }

  getStatsByCategory(): { labels: string[]; data: number[] } {
    const stats: Record<string, number> = {};
    this.providers.forEach((p) => {
      const cat = p.grupo || 'Otros';
      stats[cat] = (stats[cat] || 0) + 1;
    });

    const sorted = Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    return {
      labels: sorted.map(([label]) => label),
      data: sorted.map(([, count]) => count),
    };
  }
}
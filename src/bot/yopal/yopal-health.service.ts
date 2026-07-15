import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface YopalHealthProvider {
  departamento?: string;
  municipio?: string;
  orden?: string;
  sector?: string;
  idioma?: string;
  entidad_2?: string;
  gerente?: string;
  direccion?: string;
  telefono?: string;
  correo_electronico?: string;
  latitud?: string;
  longitud?: string;
}

export interface NormalizedCoordinate {
  lat: number;
  lon: number;
  valid: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class YopalHealthService implements OnModuleInit {
  private readonly logger = new Logger(YopalHealthService.name);
  private providers: YopalHealthProvider[] = [];
  private normalizedNameIndex = new Map<string, YopalHealthProvider[]>();
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  async onModuleInit() {
    await this.loadData();
    this.buildIndex();
  }

  // ---------------------------------------------------------------------------
  // Indexación y caché
  // ---------------------------------------------------------------------------
  private buildIndex() {
    this.normalizedNameIndex.clear();
    for (const p of this.providers) {
      const name = (p.entidad_2 || '').toLowerCase().trim();
      if (name) {
        const normalized = this.normalizeString(name);
        if (!this.normalizedNameIndex.has(normalized)) {
          this.normalizedNameIndex.set(normalized, []);
        }
        this.normalizedNameIndex.get(normalized)!.push(p);
      }
    }
    this.logger.log(`Índice de nombres construido con ${this.normalizedNameIndex.size} entradas`);
  }

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

  private normalizeString(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  // ---------------------------------------------------------------------------
  // Carga de datos (mejorada)
  // ---------------------------------------------------------------------------
  async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'Centros_de_salud_Yopal._.xml',
      );
      this.logger.log(`Cargando XML desde: ${filePath}`);
      const xmlData = fs.readFileSync(filePath, 'utf-8');

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      const rawRows = result.response?.rows?.row;
      const rows = Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [];

      this.providers = rows.map((p) => {
        const cleaned: any = {};
        Object.keys(p).forEach((key) => {
          let val = p[key];
          if (typeof val === 'string') {
            val = this.cleanEncoding(val);
          }
          cleaned[key] = val;
        });
        return cleaned;
      });
      this.logger.log(`Cargados ${this.providers.length} prestadores de Yopal.`);
    } catch (error) {
      this.logger.error('Error cargando datos de Yopal', error);
      this.providers = [];
    }
  }

  private cleanEncoding(text: string): string {
    return text
      .replace(/Ã‘/g, 'Ñ')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã“/g, 'Ó')
      .replace(/Ã³/g, 'ó')
      .replace(/Ã/g, 'Í')
      .replace(/Ã­/g, 'í')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã©/g, 'é')
      .replace(/Ãš/g, 'Ú')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Á')
      .replace(/Ã¡/g, 'á')
      .replace(/Â°/g, '°')
      .replace(/NÂº/g, 'N°');
  }

  // ---------------------------------------------------------------------------
  // Normalización de coordenadas (mejorada)
  // ---------------------------------------------------------------------------
  normalizeCoordinates(latStr?: string, lonStr?: string): NormalizedCoordinate {
    if (!latStr || !lonStr || latStr === 'N/A' || lonStr === 'N/A') {
      return { lat: 0, lon: 0, valid: false };
    }

    const cleanNumber = (s: string): number | null => {
      let clean = s.replace(/,/g, '').trim();
      // Caso especial: solo dígitos, sin punto decimal
      if (/^\d+$/.test(clean)) {
        // Latitud en Yopal: alrededor de 5.3 (un dígito entero)
        // Longitud: alrededor de -72.4 (dos dígitos enteros)
        if (clean.length === 7) {
          clean = clean.slice(0, 1) + '.' + clean.slice(1);
        } else if (clean.length === 8) {
          clean = clean.slice(0, 2) + '.' + clean.slice(2);
        } else {
          return null;
        }
      }
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };

    let lat = cleanNumber(latStr);
    let lon = cleanNumber(lonStr);
    if (lat === null || lon === null) return { lat: 0, lon: 0, valid: false };

    // Validar rangos geográficos de Yopal/Casanare
    if (lat < 4 || lat > 6) return { lat: 0, lon: 0, valid: false };
    if (lon > -70 || lon < -74) {
      if (lon > 0 && lon < 180) lon = -lon;
      else return { lat: 0, lon: 0, valid: false };
    }
    return { lat, lon, valid: true };
  }

  // ---------------------------------------------------------------------------
  // Métodos existentes (mantenidos)
  // ---------------------------------------------------------------------------
  getProvidersWithCoords() {
    return this.providers
      .map((p) => {
        const coords = this.normalizeCoordinates(p.latitud, p.longitud);
        return { ...p, normalizedCoords: coords };
      })
      .filter((p) => p.normalizedCoords.valid);
  }

  classifyProvider(entityName: string): string[] {
    const name = entityName.toUpperCase();
    const categories: string[] = [];

    const mapping = {
      EPS: ['CAPRESOCA', 'COOMEVA', 'MEDIMAS', 'SANITAS', 'NUEVA EPS', 'COOSALUD'],
      'HOSPITAL/CLINICA': ['HOSPITAL', 'CLINICA', 'CENTRO MEDICO', 'CAIMED'],
      ODONTOLOGIA: ['ODONTO', 'DENTAL', 'DENTISALUD', 'ORTHOPHOS', 'PANOREX', 'CEDENT'],
      LABORATORIO: ['LABORATORIO', 'FAMELAB'],
      'RADIOLOGIA/DIAGNOSTICO': ['RADIOLOG', 'RX', 'ESCANOGRAFIA', 'TOMOGRAFO', 'MAMOGRAFIA', 'RESONANCIA', 'RADIOGRAFIA'],
      'OPTICA/OFTALMOLOGIA': ['OPTICA', 'OFTALMO', 'OPTISALUD'],
      ESPECIALIDAD_MEDICA: ['CARDIO', 'ONCO', 'HEMATO', 'ORL', 'CIRUGIA PLASTICA'],
      REHABILITACION: ['REHABILITAR', 'KAIROS', 'FISIOTERAPIA'],
      'TRANSPORTE/AMBULANCIA': ['AMBULANCIA', 'TEVA', 'AEREA Y TERRESTRE'],
      'FARMACIA/OXIGENO': ['BIHOSPHARMA', 'OXIGENOS'],
    };

    for (const [category, keywords] of Object.entries(mapping)) {
      if (keywords.some((keyword) => name.includes(keyword))) {
        categories.push(category);
      }
    }

    if (categories.length === 0) categories.push('CONSULTORIO_INDEPENDIENTE');
    return categories;
  }

  getProvidersByCategory(category: string) {
    return this.providers.filter((p) => {
      const cats = this.classifyProvider(p.entidad_2 || '');
      return cats.includes(category);
    });
  }

  getCategoryStats() {
    const stats: Record<string, number> = {};
    this.providers.forEach((p) => {
      const cats = this.classifyProvider(p.entidad_2 || '');
      cats.forEach((cat) => {
        stats[cat] = (stats[cat] || 0) + 1;
      });
    });
    return stats;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  findNearby(lat: number, lon: number, radiusKm: number = 5) {
    const cacheKey = `nearby_${lat}_${lon}_${radiusKm}`;
    const cached = this.getCached<ReturnType<typeof this.findNearby>>(cacheKey);
    if (cached) return cached;

    const providersWithCoords = this.getProvidersWithCoords();
    const result = providersWithCoords
      .map((p) => ({
        ...p,
        distance: this.calculateDistance(lat, lon, p.normalizedCoords.lat, p.normalizedCoords.lon),
      }))
      .filter((p) => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    this.setCached(cacheKey, result);
    return result;
  }

  findByAddressZone(zone: string) {
    const q = zone.toLowerCase().trim();
    if (!q) return [];
    return this.providers.filter((p) => (p.direccion || '').toLowerCase().includes(q));
  }

  parsePhones(phoneString: string): string[] {
    if (!phoneString) return [];
    return phoneString
      .replace(/[-/|]/g, ',')
      .split(',')
      .map((p) => p.replace(/\D/g, '').trim())
      .filter((p) => p.length >= 7);
  }

  parseEmails(emailString: string): string[] {
    if (!emailString) return [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = emailString.match(emailRegex);
    return matches ? matches.map((e) => e.toLowerCase()) : [];
  }

  getProviderContacts(provider: YopalHealthProvider) {
    const phones = this.parsePhones(provider.telefono || '');
    const emails = this.parseEmails(provider.correo_electronico || '');
    return {
      phones,
      emails,
      primaryPhone: phones.length > 0 ? phones[0] : null,
      primaryEmail: emails.length > 0 ? emails[0] : null,
    };
  }

  hasEmergencyService(p: YopalHealthProvider): boolean {
    const name = (p.entidad_2 || '').toUpperCase();
    const emergencyKeywords = ['24 HORAS', 'URGENCIA', 'VITAL', 'URMEDICAS', 'UVAC', 'EMERGENCIA', 'AEREA Y TERRESTRE'];
    return emergencyKeywords.some((keyword) => name.includes(keyword));
  }

  getEmergencyProviders() {
    return this.providers
      .filter((p) => this.hasEmergencyService(p))
      .map((p) => ({
        ...p,
        is24Hours: (p.entidad_2 || '').toUpperCase().includes('24 HORAS'),
      }));
  }

  getTerritoryStats() {
    const total = this.providers.length;
    const categoryStats = this.getCategoryStats();
    const roadTypeStats: Record<string, number> = {};
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    let coordsCount = 0;
    let multiPhoneCount = 0;

    this.providers.forEach((p) => {
      const dir = (p.direccion || '').toUpperCase();
      const roadType = dir.split(' ')[0];
      if (['CALLE', 'CRA', 'CARRERA', 'TRANSVERSAL', 'DIAGONAL', 'AVENIDA', 'AV'].includes(roadType)) {
        const normalizedRoad = roadType === 'CRA' ? 'CARRERA' : roadType === 'AV' ? 'AVENIDA' : roadType;
        roadTypeStats[normalizedRoad] = (roadTypeStats[normalizedRoad] || 0) + 1;
      }

      const coords = this.normalizeCoordinates(p.latitud, p.longitud);
      if (coords.valid) {
        coordsCount++;
        if (coords.lat < minLat) minLat = coords.lat;
        if (coords.lat > maxLat) maxLat = coords.lat;
        if (coords.lon < minLon) minLon = coords.lon;
        if (coords.lon > maxLon) maxLon = coords.lon;
      }

      if (this.parsePhones(p.telefono || '').length > 1) multiPhoneCount++;
    });

    return {
      totalProviders: total,
      byCategory: categoryStats,
      byRoadType: roadTypeStats,
      geographicCoverage: coordsCount > 0
        ? { minLat, maxLat, minLon, maxLon, providersWithCoords: coordsCount, percentage: ((coordsCount / total) * 100).toFixed(2) + '%' }
        : null,
      connectivity: { multiPhoneProviders: multiPhoneCount, singlePhoneOrNone: total - multiPhoneCount },
    };
  }

  validateProviderData() {
    const report: { entity: string; errors: string[]; warnings: string[] }[] = [];
    this.providers.forEach((p) => {
      const entityName = p.entidad_2 || 'SIN NOMBRE';
      const errors: string[] = [];
      const warnings: string[] = [];

      const coords = this.normalizeCoordinates(p.latitud, p.longitud);
      if (!coords.valid) {
        if (p.latitud === 'N/A' || p.longitud === 'N/A') warnings.push('Coordenadas no disponibles (N/A)');
        else errors.push(`Coordenadas malformadas: Lat(${p.latitud}) Lon(${p.longitud})`);
      }

      const emails = this.parseEmails(p.correo_electronico || '');
      if (p.correo_electronico && emails.length === 0) errors.push(`Email inválido: ${p.correo_electronico}`);

      const phones = this.parsePhones(p.telefono || '');
      if (phones.length === 0) warnings.push('No se encontraron teléfonos válidos');

      if (!p.direccion || p.direccion.length < 5) errors.push('Dirección faltante o demasiado corta');

      if (errors.length > 0 || warnings.length > 0) report.push({ entity: entityName, errors, warnings });
    });
    return { totalAudited: this.providers.length, issuesFound: report.length, details: report };
  }

  findByManagerName(name: string): YopalHealthProvider[] {
    const q = name.toLowerCase().trim();
    if (!q) return [];
    return this.providers.filter((p) => (p.gerente || '').toLowerCase().includes(q));
  }

  getIndependentPractitioners(): YopalHealthProvider[] {
    return this.providers.filter((p) => {
      const entity = (p.entidad_2 || '').toLowerCase().trim();
      const manager = (p.gerente || '').toLowerCase().trim();
      if (!entity || !manager) return false;
      return entity.includes(manager) || manager.includes(entity);
    });
  }

  // ---------------------------------------------------------------------------
  // NUEVOS MÉTODOS
  // ---------------------------------------------------------------------------
  getAvailableCategories(): string[] {
    return Object.keys(this.getCategoryStats());
  }

  searchByService(serviceKeyword: string): YopalHealthProvider[] {
    const keyword = serviceKeyword.toLowerCase().trim();
    if (!keyword) return [];
    return this.providers.filter(p => {
      const name = (p.entidad_2 || '').toLowerCase();
      const cats = this.classifyProvider(p.entidad_2 || '');
      return name.includes(keyword) || cats.some(cat => cat.toLowerCase().includes(keyword));
    });
  }

  getProvidersBySchedule(schedule: '24h' | 'urgent'): YopalHealthProvider[] {
    return this.providers.filter(p => {
      const name = (p.entidad_2 || '').toUpperCase();
      if (schedule === '24h') return name.includes('24 HORAS');
      if (schedule === 'urgent') return this.hasEmergencyService(p);
      return false;
    });
  }

  suggestProvidersForCondition(condition: string): YopalHealthProvider[] {
    const mapping: Record<string, string[]> = {
      diabetes: ['endocrinolog', 'medicina interna'],
      hipertension: ['cardiolog', 'medicina interna'],
      embarazo: ['obstetricia', 'ginecolog'],
      'dolor de cabeza': ['neurolog', 'medicina general'],
      fractura: ['ortopedia', 'traumatolog'],
      caries: ['odontolog', 'endodoncia'],
      'problemas de vision': ['oftalmolog', 'optometria'],
    };
    const keywords = mapping[condition.toLowerCase()] || [];
    if (keywords.length === 0) return [];
    return this.providers.filter(p => {
      const name = (p.entidad_2 || '').toLowerCase();
      return keywords.some(kw => name.includes(kw));
    });
  }

  getProviderById(index: number): YopalHealthProvider | null {
    return this.providers[index] || null;
  }

  exportToJson(): string {
    return JSON.stringify(this.providers, null, 2);
  }

  // ---------------------------------------------------------------------------
  // Búsqueda difusa y findByIdentifier (mejorados con caché)
  // ---------------------------------------------------------------------------
  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    const len1 = s1.length;
    const len2 = s2.length;
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);
    let matches = 0;
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      for (let j = start; j < end; j++) {
        if (!matches2[j] && s1[i] === s2[j]) {
          matches1[i] = true;
          matches2[j] = true;
          matches++;
          break;
        }
      }
    }
    if (matches === 0) return 0.0;
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (matches1[i]) {
        while (!matches2[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
      }
    }
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    let prefix = 0;
    const maxPrefix = Math.min(4, Math.min(len1, len2));
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    return jaro + prefix * 0.1 * (1 - jaro);
  }

  suggestSimilar(query: string, maxSuggestions: number = 3) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const cacheKey = `similar_${q}`;
    const cached = this.getCached<ReturnType<typeof this.suggestSimilar>>(cacheKey);
    if (cached) return cached;

    const result = this.providers
      .map((p) => {
        const name = (p.entidad_2 || '').toLowerCase();
        const score = this.jaroWinkler(q, name);
        return { ...p, score };
      })
      .filter((p) => p.score > 0.7)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
    this.setCached(cacheKey, result);
    return result;
  }

  findByIdentifier(query: string): YopalHealthProvider[] {
    const q = query.toString().trim().toLowerCase();
    if (!q) return [];

    const cacheKey = `findById_${q}`;
    const cached = this.getCached<YopalHealthProvider[]>(cacheKey);
    if (cached) return cached;

    const stopWords = new Set([
      'que', 'cual', 'como', 'donde', 'queda', 'buscar', 'busco', 'hay', 'tiene', 'esta',
      'los', 'las', 'del', 'por', 'para', 'con', 'sin', 'una', 'uno', 'centros', 'centro',
      'salud', 'yopal', 'casanare', 'prestadores', 'informacion', 'sobre', 'dónde', 'cuál',
      'cómo', 'cuáles', 'son', 'hospital', 'hospitales',
    ]);
    const tokens = q
      .split(/\s+/)
      .map((t) => t.replace(/[¿?.,;:!¡"'()\[\]{}]/g, ''))
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    const matches = this.providers.filter((p) => {
      const nombre = (p.entidad_2 || '').toLowerCase();
      const gerente = (p.gerente || '').toLowerCase();
      const direccion = (p.direccion || '').toLowerCase();
      const telefono = (p.telefono || '').toLowerCase();
      const correo = (p.correo_electronico || '').toLowerCase();
      const fields = [nombre, gerente, direccion, telefono, correo];

      const cleanQ = q.replace(/\s+/g, '').replace(/k/g, 'c');
      const exactMatch = fields.some((f) => {
        const cleanF = f.replace(/\s+/g, '').replace(/k/g, 'c');
        return f.includes(q) || q.includes(f) || cleanF.includes(cleanQ);
      });
      if (exactMatch) return true;
      if (tokens.length > 0) {
        return tokens.some((token) => fields.some((f) => f.includes(token)));
      }
      return false;
    });

    if (matches.length > 0) {
      this.setCached(cacheKey, matches);
      return matches;
    }

    if (tokens.length > 0) {
      const fuzzyMatches: { p: YopalHealthProvider; score: number }[] = [];
      this.providers.forEach((p) => {
        const name = (p.entidad_2 || '').toLowerCase();
        const bestTokenScore = Math.max(...tokens.map((t) => this.jaroWinkler(t, name)));
        if (bestTokenScore > 0.8) fuzzyMatches.push({ p, score: bestTokenScore });
      });
      if (fuzzyMatches.length > 0) {
        const result = fuzzyMatches.sort((a, b) => b.score - a.score).map((m) => m.p);
        this.setCached(cacheKey, result);
        return result;
      }
    }

    const similar = this.suggestSimilar(q);
    this.setCached(cacheKey, similar);
    return similar;
  }

  // ---------------------------------------------------------------------------
  // answerNaturalQuestion (mejorado con nuevas intenciones)
  // ---------------------------------------------------------------------------
  /**
 * Escapa caracteres especiales para MarkdownV2 de Telegram.
 * Lista completa: _ * [ ] ( ) ~ > # + - = | { } . !
 */
  private escapeMarkdown(text: string | undefined): string {
    if (!text) return '';
    return text.replace(/[_*\[\]()~>#+=|{}.!-]/g, '\\$&');
  }

  async answerNaturalQuestion(question: string): Promise<{ content: string; found: boolean }> {
    // Normalizar: minúsculas y eliminar acentos
    let q = question.toLowerCase().trim();
    q = q.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quita tildes

    if (!q) return { content: '', found: false };

    // -------------------------------------------------------------------------
    // Entidad específica (nombres concretos de prestadores)
    // -------------------------------------------------------------------------
    // Lista de nombres de entidades conocidas en Yopal (para búsqueda prioritaria)
    const entityNames = [
      'cruz roja',
      'capresoca',
      'coomeva',
      'medimas',
      'sanitas',
      'nueva eps',
      'medisalud',
      'hospital regional de la orinoquia',
      'centro de escanografia',
      'visionamos salud',
      'instituto de fracturas',
      'optisalud',
      'clinica casanare',
      'clinica del oriente',
      'esesalud',
      'servinsalud',
      'rehabilitar',
      'asistir ips',
      'ses salud',
      'panorex',
      'cedent',
      'nora alvarez',
      'avanti salud',
      'medytec',
      'gamma ips',
      'ortophos',
      'salud llanos',
      'health care',
      'fundacion promover',
      'nueva ips optica',
      'ser saludable',
      'prosalud',
      'puertabierta',
      'famedic',
      'famelab',
      'centro odontologico',
      'trinisalud',
      'rx ayudas',
      'dentisalud',
      'simalink',
      'domisalud',
      'centro de reconocimiento',
      'smio',
      'mundo radiologico',
      'cemediq',
      'orl vital',
      'gyomedical',
      'colmedica',
      'clinica vascular',
      'hemato oncologia',
      'enrique guerrero',
      'medicenter',
      'medical help',
      'sanas ips',
      'medical sky',
      'angiografia',
      'lacor',
      'cardio andes',
      'ips gmi',
      'vital alliance',
      'centro de especialidades pediatricas',
      'servicios integrales',
      'onco oriente',
      'oxi care',
      'erika munoz',
      'fundesarrollo',
      'kairos',
      'jersalud',
      'sies salud',
      'oftalmo optica',
      'centro de rehabilitacion',
      'ips orinoco',
      'crc del llano',
      'suly yarid',
      'manejo del dolor',
      'ambulancias sar',
      'bihospharma',
      'ambulancias de colombia',
      'caimed',
      'coosalud'
    ];

    // Verificar si la consulta coincide exactamente (o es muy similar) con algún nombre de entidad
    let matchedEntity: YopalHealthProvider | null = null;
    let matchedName = '';
    for (const name of entityNames) {
      // Si la consulta contiene el nombre completo de la entidad (ej: "cruz roja")
      if (q.includes(name)) {
        // Buscar esa entidad específica
        const providers = this.findByIdentifier(name);
        if (providers.length > 0) {
          matchedEntity = providers[0];
          matchedName = name;
          break;
        }
      }
    }

    if (matchedEntity) {
      const contacts = this.getProviderContacts(matchedEntity);
      let response = `🏢 *${this.escapeMarkdown(matchedEntity.entidad_2 || 'N/A')}*\n`;
      response += `📍 ${this.escapeMarkdown(matchedEntity.direccion)}\n`;
      response += `📞 ${contacts.primaryPhone || 'N/A'}`;
      if (contacts.primaryEmail) response += `\n📧 ${this.escapeMarkdown(contacts.primaryEmail)}`;
      if (matchedEntity.gerente) response += `\n👤 Gerente: ${this.escapeMarkdown(matchedEntity.gerente)}`;
      return { content: response, found: true };
    }




    // 1. Servicios específicos (radiografía, odontología, etc.)
    // Mapeo de palabra clave de servicio a categoría en classifyProvider
    const serviceToCategory: Record<string, string[]> = {
      'radiografia': ['RADIOLOGIA/DIAGNOSTICO'],
      'mamografia': ['RADIOLOGIA/DIAGNOSTICO'],
      'tomografia': ['RADIOLOGIA/DIAGNOSTICO'],
      'ecografia': ['RADIOLOGIA/DIAGNOSTICO'],
      'odontologia': ['ODONTOLOGIA'],
      'endodoncia': ['ODONTOLOGIA'],
      'fisioterapia': ['REHABILITACION'],
      'laboratorio': ['LABORATORIO'],
      'optometria': ['OPTICA/OFTALMOLOGIA'],
      'oftalmologia': ['OPTICA/OFTALMOLOGIA'],
    };
    const serviceKeywords = Object.keys(serviceToCategory);
    for (const sk of serviceKeywords) {
      if (q.includes(sk)) {
        // Buscar primero por nombre del servicio en los nombres de entidades
        let providers = this.searchByService(sk);

        // Si no encuentra, buscar por categoría mapeada
        if (providers.length === 0) {
          const targetCats = serviceToCategory[sk];
          for (const cat of targetCats) {
            providers = this.getProvidersByCategory(cat);
            if (providers.length > 0) break;
          }
        }

        if (providers.length > 0) {
          let response = `🔍 *Prestadores que ofrecen ${sk.toUpperCase()} en Yopal:*\n\n`;
          providers.slice(0, 5).forEach(p => {
            const contacts = this.getProviderContacts(p);
            response += `🏥 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
          });
          return { content: response, found: true };
        }
      }
    }

    // 2. Atención 24 horas
    if (q.includes('24 horas') || q.includes('24h') || (q.includes('urgencia') && !q.includes('cercano'))) {
      const providers = this.getProvidersBySchedule('24h');
      if (providers.length > 0) {
        let response = `⏱️ *Prestadores con atención 24 HORAS en Yopal:*\n\n`;
        providers.slice(0, 5).forEach(p => {
          const contacts = this.getProviderContacts(p);
          response += `🏥 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
        });
        return { content: response, found: true };
      }
    }

    // 3. Recomendación por condición médica
    const conditions = ['diabetes', 'hipertension', 'embarazo', 'dolor de cabeza', 'fractura', 'caries', 'problemas de vision'];
    for (const cond of conditions) {
      if (q.includes(cond)) {
        const providers = this.suggestProvidersForCondition(cond);
        if (providers.length > 0) {
          let response = `🩺 *Prestadores sugeridos para ${cond.toUpperCase()} en Yopal:*\n\n`;
          providers.slice(0, 5).forEach(p => {
            const contacts = this.getProviderContacts(p);
            response += `🏥 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
          });
          return { content: response, found: true };
        }
      }
    }

    // 4. Detección existente (urgencia, proximidad, categoría, gerente, estadísticas, etc.)
    const isUrgency = /(urgencia|emergencia|24 horas|24h|grave|herida|accidente)/i.test(q);
    const isProximity = /(cerca|cercano|proximidad|donde queda|donde esta|ubicacion|direccion)/i.test(q);
    const isCategory = /(eps|hospital|clinica|odontolog|laboratorio|optica|farmacia|ambulancia|medico|medica)/i.test(q);
    const isManager = /(gerente|director|quien manda|quien es el jefe|quien dirige|persona a cargo)/i.test(q);
    const isStats = /(cuantos|cuantas|estadistica|resumen|total|cantidad)/i.test(q);

    let response = '';

    if (isUrgency) {
      const providers = this.getEmergencyProviders();
      if (providers.length > 0) {
        response = `🚨 *URGENCIAS EN YOPAL (24H / VITALES)* 🚨\n\nHe encontrado estos centros de atención inmediata:\n\n`;
        providers.slice(0, 5).forEach(p => {
          const contacts = this.getProviderContacts(p);
          response += `🏥 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 Tel: ${contacts.primaryPhone || 'N/A'}\n${p.is24Hours ? '⏱️ ATENCIÓN 24 HORAS\n' : ''}\n`;
        });
        return { content: response, found: true };
      }
    }

    if (isProximity) {
      const entityQuery = q.replace(/(cerca|cercano|proximidad|donde queda|donde esta|ubicacion|direccion)/gi, '').trim();
      const providers = this.findByIdentifier(entityQuery || q);
      if (providers.length > 0) {
        response = `📍 *UBICACIÓN EN YOPAL*\n\n`;
        providers.slice(0, 3).forEach(p => {
          const contacts = this.getProviderContacts(p);
          response += `🏢 *${this.escapeMarkdown(p.entidad_2)}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 Tel: ${contacts.primaryPhone || 'N/A'}\n\n`;
        });
        return { content: response, found: true };
      }
    }

    if (isCategory) {
      const cats = ['EPS', 'HOSPITAL/CLINICA', 'ODONTOLOGIA', 'LABORATORIO', 'RADIOLOGIA/DIAGNOSTICO', 'OPTICA/OFTALMOLOGIA', 'TRANSPORTE/AMBULANCIA'];
      const targetCat = cats.find(c => q.includes(c.toLowerCase().split('/')[0]));
      if (targetCat) {
        const providers = this.getProvidersByCategory(targetCat);
        if (providers.length > 0) {
          response = `🏥 *${targetCat} EN YOPAL*\n\nAquí tienes algunos resultados:\n\n`;
          providers.slice(0, 5).forEach(p => {
            const contacts = this.getProviderContacts(p);
            response += `🔹 *${this.escapeMarkdown(p.entidad_2)}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
          });
          return { content: response, found: true };
        }
      }
    }

    if (isManager) {
      const results = this.findByIdentifier(q);
      if (results.length > 0) {
        response = `👤 *CONTACTOS DIRECTIVOS YOPAL*\n\n`;
        results.slice(0, 3).forEach(p => {
          response += `🏢 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n👤 Gerente: ${this.escapeMarkdown(p.gerente)}\n📧 ${this.escapeMarkdown(p.correo_electronico || 'N/A')}\n\n`;
        });
        return { content: response, found: true };
      }
    }

    if (isStats) {
      const stats = this.getTerritoryStats();
      response = `📊 *ESTADÍSTICAS DE SALUD - YOPAL*\n\n`;
      response += `🏢 Total Prestadores: ${stats.totalProviders}\n`;
      response += `🏥 Hospitales/Clínicas: ${stats.byCategory['HOSPITAL/CLINICA'] || 0}\n`;
      response += `🏥 EPS registradas: ${stats.byCategory['EPS'] || 0}\n`;
      response += `🧪 Laboratorios: ${stats.byCategory['LABORATORIO'] || 0}\n\n`;
      response += `📍 Cobertura Geolocalizada: ${stats.geographicCoverage?.percentage || '0%'}`;
      return { content: response, found: true };
    }

    // -------------------------------------------------------------------------
    // Consulta de correo electrónico específico (ahora con regex mejorada)
    // -------------------------------------------------------------------------
    // Acepta: "correo electronico", "correo electrónico", "email", "e-mail"
    const emailRegex = /(correo\s*electronico|correo\s*electrónico|email|e-mail)\s*(?:de)?\s*(.+)/i;
    const emailMatch = q.match(emailRegex);
    if (emailMatch) {
      let searchTerm = emailMatch[2].trim();
      // Si el término capturado empieza con "de", lo quitamos (por si acaso)
      searchTerm = searchTerm.replace(/^de\s+/, '');
      const providers = this.findByIdentifier(searchTerm);
      if (providers.length > 0) {
        const contacts = this.getProviderContacts(providers[0]);
        if (contacts.primaryEmail) {
          console.log(`DEBUG: emailMatch found, searchTerm=${searchTerm}, providers.length=${providers.length}, primaryEmail=${contacts.primaryEmail}`);
          return {
            content: `📧 *Correo electrónico de ${this.escapeMarkdown(providers[0].entidad_2 || 'N/A')} en Yopal:*\n${this.escapeMarkdown(contacts.primaryEmail)}`,
            found: true,
          };
        } else {
          return {
            content: `⚠️ No encontré correo electrónico registrado para "${providers[0].entidad_2}" en Yopal.`,
            found: true,
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // Fallback: búsqueda general (incluye email)
    // -------------------------------------------------------------------------
    const genericMatches = this.findByIdentifier(q);
    if (genericMatches.length > 0) {
      response = `🔍 *RESULTADOS PARA YOPAL*\n\n`;
      genericMatches.slice(0, 3).forEach(p => {
        const contacts = this.getProviderContacts(p);
        response += `🏢 *${this.escapeMarkdown(p.entidad_2 || 'N/A')}*\n📍 ${this.escapeMarkdown(p.direccion)}\n📞 ${contacts.primaryPhone || 'N/A'}`;
        if (contacts.primaryEmail) response += `\n📧 ${this.escapeMarkdown(contacts.primaryEmail)}`;
        response += `\n\n`;
      });
      return { content: response, found: true };
    }

    return { content: '', found: false };
  }

  // ---------------------------------------------------------------------------
  // Métodos auxiliares existentes
  // ---------------------------------------------------------------------------
  searchProviders(query: string): YopalHealthProvider[] {
    const q = query.toLowerCase().trim();
    if (!q) return [...this.providers];
    return this.providers.filter((p) => {
      const municipio = (p.municipio || '').toLowerCase();
      const depto = (p.departamento || '').toLowerCase();
      const nombre = (p.entidad_2 || '').toLowerCase();
      const gerente = (p.gerente || '').toLowerCase();
      const municipioMatch = municipio.includes(q) || q.includes(municipio) || depto.includes(q) || q.includes(depto);
      const nombreMatch = nombre.includes(q) || q.includes(nombre) || gerente.includes(q) || q.includes(gerente);
      return municipioMatch || nombreMatch;
    });
  }

  getMunicipios(): string[] {
    const seen = new Set<string>();
    return this.providers
      .map((p) => p.municipio?.toString().trim() || '')
      .filter((municipio) => municipio.length > 0)
      .filter((municipio) => {
        const normalized = municipio.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }

  getKnowledgeSummary(): string {
    return `He encontrado ${this.providers.length} prestadores y centros de salud en Yopal (Casanare) registrados en mi base local.`;
  }



}


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

@Injectable()
export class YopalHealthService implements OnModuleInit {
  private readonly logger = new Logger(YopalHealthService.name);
  private providers: YopalHealthProvider[] = [];

  async onModuleInit() {
    await this.loadData();
  }

  /**
   * Normaliza las coordenadas del formato colombiano (comas y posibles errores de signo)
   * a números decimales válidos.
   */
  normalizeCoordinates(latStr?: string, lonStr?: string): NormalizedCoordinate {
    if (!latStr || !lonStr || latStr === 'N/A' || lonStr === 'N/A') {
      return { lat: 0, lon: 0, valid: false };
    }

    try {
      // El formato "5,349,719" suele representar "5.349719" en este contexto
      // Eliminamos todas las comas y ponemos el punto después del primer dígito
      const cleanLat = latStr.replace(/,/g, '').trim();
      const cleanLon = lonStr.replace(/,/g, '').trim();

      const formatNum = (s: string, isLat: boolean) => {
        if (!s) return NaN;
        const isNegative = s.startsWith('-');
        const absS = isNegative ? s.substring(1) : s;

        // Si el número es largo (ej: 5349719 para lat o 72402040 para lon)
        if (absS.length > 3) {
          // Latitud en Colombia: 0 a 13 (1 dígito entero usualmente)
          // Longitud en Colombia: -67 a -79 (2 dígitos enteros)
          const integerPartLength = isLat ? 1 : 2;
          const formatted =
            (isNegative ? '-' : '') +
            absS.substring(0, integerPartLength) +
            '.' +
            absS.substring(integerPartLength);
          return parseFloat(formatted);
        }
        return parseFloat(s);
      };

      let lat = formatNum(cleanLat, true);
      let lon = formatNum(cleanLon, false);

      // Validación de longitud positiva (error común en datos de Sanitas/Colombia)
      if (lon > 0) {
        lon = -lon;
      }

      const isValid = !isNaN(lat) && !isNaN(lon);
      return {
        lat: isValid ? lat : 0,
        lon: isValid ? lon : 0,
        valid: isValid,
      };
    } catch (e) {
      return { lat: 0, lon: 0, valid: false };
    }
  }

  /**
   * Devuelve todos los proveedores que tienen coordenadas válidas parseadas.
   */
  getProvidersWithCoords() {
    return this.providers
      .map((p) => {
        const coords = this.normalizeCoordinates(p.latitud, p.longitud);
        return {
          ...p,
          normalizedCoords: coords,
        };
      })
      .filter((p) => p.normalizedCoords.valid);
  }

  /**
   * Clasifica una entidad en categorías basadas en palabras clave presentes en su nombre.
   */
  classifyProvider(entityName: string): string[] {
    const name = entityName.toUpperCase();
    const categories: string[] = [];

    const mapping = {
      EPS: ['CAPRESOCA', 'COOMEVA', 'MEDIMAS', 'SANITAS', 'NUEVA EPS', 'COOSALUD'],
      'HOSPITAL/CLINICA': ['HOSPITAL', 'CLINICA', 'CENTRO MEDICO', 'CAIMED'],
      ODONTOLOGIA: ['ODONTO', 'DENTAL', 'DENTISALUD', 'ORTHOPHOS', 'PANOREX', 'CEDENT'],
      LABORATORIO: ['LABORATORIO', 'FAMELAB'],
      'RADIOLOGIA/DIAGNOSTICO': ['RADIOLOG', 'RX', 'ESCANOGRAFIA', 'TOMOGRAFO', 'MAMOGRAFIA', 'RESONANCIA'],
      'OPTICA/OFTALMOLOGIA': ['OPTICA', 'OFTALMO', 'OPTISALUD'],
      ESPECIALIDAD_MEDICA: ['CARDIO', 'ONCO', 'HEMATO', 'ORL', 'CIRUGIA PLASTICA'],
      REHABILITARION: ['REHABILITAR', 'KAIROS', 'FISIOTERAPIA'],
      'TRANSPORTE/AMBULANCIA': ['AMBULANCIA', 'TEVA', 'AEREA Y TERRESTRE'],
      'FARMACIA/OXIGENO': ['BIHOSPHARMA', 'OXIGENOS'],
    };

    for (const [category, keywords] of Object.entries(mapping)) {
      if (keywords.some((keyword) => name.includes(keyword))) {
        categories.push(category);
      }
    }

    if (categories.length === 0) {
      categories.push('CONSULTORIO_INDEPENDIENTE');
    }

    return categories;
  }

  /**
   * Obtiene proveedores filtrados por categoría.
   */
  getProvidersByCategory(category: string) {
    return this.providers.filter((p) => {
      const cats = this.classifyProvider(p.entidad_2 || '');
      return cats.includes(category);
    });
  }

  /**
   * Obtiene estadísticas de proveedores por categoría.
   */
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

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine.
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en km
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

  /**
   * Encuentra prestadores cercanos a una ubicación dada dentro de un radio en KM.
   */
  findNearby(lat: number, lon: number, radiusKm: number = 5) {
    const providersWithCoords = this.getProvidersWithCoords();
    return providersWithCoords
      .map((p) => ({
        ...p,
        distance: this.calculateDistance(
          lat,
          lon,
          p.normalizedCoords.lat,
          p.normalizedCoords.lon,
        ),
      }))
      .filter((p) => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Permite búsquedas por zona o dirección (ej: "Carrera 20", "Calle 9").
   */
  findByAddressZone(zone: string) {
    const q = zone.toLowerCase().trim();
    if (!q) return [];
    return this.providers.filter((p) =>
      (p.direccion || '').toLowerCase().includes(q),
    );
  }

  /**
   * Extrae y normaliza teléfonos de una cadena que puede contener múltiples números.
   */
  parsePhones(phoneString: string): string[] {
    if (!phoneString) return [];
    // 1. Reemplazar separadores comunes por comas
    // 2. Dividir por coma
    // 3. Para cada fragmento, limpiar todo lo que no sea dígito y validar longitud
    return phoneString
      .replace(/[-/|]/g, ',')
      .split(',')
      .map((p) => p.replace(/\D/g, '').trim())
      .filter((p) => p.length >= 7); // Mínimo 7 dígitos
  }

  /**
   * Extrae correos electrónicos de una cadena que puede contener múltiples direcciones.
   */
  parseEmails(emailString: string): string[] {
    if (!emailString) return [];
    // Regex estándar para emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = emailString.match(emailRegex);
    return matches ? matches.map((e) => e.toLowerCase()) : [];
  }

  /**
   * Obtiene los contactos detallados de un proveedor.
   */
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

  /**
   * Detecta si un proveedor ofrece servicios de urgencias o atención 24h.
   */
  hasEmergencyService(p: YopalHealthProvider): boolean {
    const name = (p.entidad_2 || '').toUpperCase();
    const emergencyKeywords = [
      '24 HORAS',
      'URGENCIA',
      'VITAL',
      'URMEDICAS',
      'UVAC',
      'EMERGENCIA',
      'AEREA Y TERRESTRE',
    ];
    return emergencyKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Obtiene la lista de proveedores que ofrecen servicios de urgencias.
   */
  getEmergencyProviders() {
    return this.providers
      .filter((p) => this.hasEmergencyService(p))
      .map((p) => ({
        ...p,
        is24Hours: (p.entidad_2 || '').toUpperCase().includes('24 HORAS'),
      }));
  }

  /**
   * Expón estadísticas detalladas del territorio de Yopal.
   */
  getTerritoryStats() {
    const total = this.providers.length;
    const categoryStats = this.getCategoryStats();

    // Distribución por tipo de vía
    const roadTypeStats: Record<string, number> = {};
    // Cobertura geográfica (Bounding Box)
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    let coordsCount = 0;
    let multiPhoneCount = 0;

    this.providers.forEach((p) => {
      // Analizar dirección
      const dir = (p.direccion || '').toUpperCase();
      const roadType = dir.split(' ')[0]; // Tomar la primera palabra (CALLE, CARRERA, etc.)
      if (['CALLE', 'CRA', 'CARRERA', 'TRANSVERSAL', 'DIAGONAL', 'AVENIDA', 'AV'].includes(roadType)) {
        const normalizedRoad = roadType === 'CRA' ? 'CARRERA' : (roadType === 'AV' ? 'AVENIDA' : roadType);
        roadTypeStats[normalizedRoad] = (roadTypeStats[normalizedRoad] || 0) + 1;
      }

      // Analizar coordenadas para bounding box
      const coords = this.normalizeCoordinates(p.latitud, p.longitud);
      if (coords.valid) {
        coordsCount++;
        if (coords.lat < minLat) minLat = coords.lat;
        if (coords.lat > maxLat) maxLat = coords.lat;
        if (coords.lon < minLon) minLon = coords.lon;
        if (coords.lon > maxLon) maxLon = coords.lon;
      }

      // Analizar teléfonos
      if (this.parsePhones(p.telefono || '').length > 1) {
        multiPhoneCount++;
      }
    });

    return {
      totalProviders: total,
      byCategory: categoryStats,
      byRoadType: roadTypeStats,
      geographicCoverage: coordsCount > 0 ? {
        minLat, maxLat, minLon, maxLon,
        providersWithCoords: coordsCount,
        percentage: ((coordsCount / total) * 100).toFixed(2) + '%'
      } : null,
      connectivity: {
        multiPhoneProviders: multiPhoneCount,
        singlePhoneOrNone: total - multiPhoneCount
      }
    };
  }

  /**
   * Realiza una auditoría de calidad sobre los datos de los prestadores.
   */
  validateProviderData() {
    const report: {
      entity: string;
      errors: string[];
      warnings: string[];
    }[] = [];

    this.providers.forEach((p) => {
      const entityName = p.entidad_2 || 'SIN NOMBRE';
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Validar Coordenadas
      const coords = this.normalizeCoordinates(p.latitud, p.longitud);
      if (!coords.valid) {
        if (p.latitud === 'N/A' || p.longitud === 'N/A') {
          warnings.push('Coordenadas no disponibles (N/A)');
        } else {
          errors.push(`Coordenadas malformadas: Lat(${p.latitud}) Lon(${p.longitud})`);
        }
      }

      // 2. Validar Emails
      const emails = this.parseEmails(p.correo_electronico || '');
      if (p.correo_electronico && emails.length === 0) {
        errors.push(`Email inválido o malformado: ${p.correo_electronico}`);
      }

      // 3. Validar Teléfonos
      const phones = this.parsePhones(p.telefono || '');
      if (phones.length === 0) {
        warnings.push('No se encontraron teléfonos válidos');
      }

      // 4. Validar Dirección
      if (!p.direccion || p.direccion.length < 5) {
        errors.push('Dirección faltante o demasiado corta');
      }

      if (errors.length > 0 || warnings.length > 0) {
        report.push({ entity: entityName, errors, warnings });
      }
    });

    return {
      totalAudited: this.providers.length,
      issuesFound: report.length,
      details: report,
    };
  }

  /**
   * Busca prestadores por nombre del gerente o director médico.
   */
  findByManagerName(name: string): YopalHealthProvider[] {
    const q = name.toLowerCase().trim();
    if (!q) return [];
    return this.providers.filter((p) =>
      (p.gerente || '').toLowerCase().includes(q),
    );
  }

  /**
   * Obtiene una lista de profesionales independientes (consultorios personales).
   * Se detecta cuando el nombre de la entidad es muy similar al del gerente.
   */
  getIndependentPractitioners(): YopalHealthProvider[] {
    return this.providers.filter((p) => {
      const entity = (p.entidad_2 || '').toLowerCase().trim();
      const manager = (p.gerente || '').toLowerCase().trim();
      if (!entity || !manager) return false;

      // Un consultorio independiente suele tener el nombre del médico como entidad
      return entity.includes(manager) || manager.includes(entity);
    });
  }

  /**
   * Procesa una pregunta en lenguaje natural sobre Yopal y devuelve una respuesta formateada.
   */
  async answerNaturalQuestion(question: string): Promise<{
    content: string;
    found: boolean;
  }> {
    const q = question.toLowerCase().trim();
    if (!q) return { content: '', found: false };

    // 1. Detección de Intención (Mejorada con plurales y variaciones)
    const isUrgency = /(urgencia|emergencia|24 horas|24h|grave|herida|accidente)/i.test(q);
    const isProximity = /(cerca|cercano|proximidad|donde queda|donde queda n|donde esta|ubicacion|direccion)/i.test(q);
    const isCategory = /(eps|hospital|clinica|odontolog|laboratorio|optica|farmacia|ambulancia|medico|medica)/i.test(q);
    const isManager = /(gerente|director|quien manda|quien es el jefe|quien dirige|persona a cargo)/i.test(q);
    const isStats = /(cuantos|cuantas|estadistica|resumen|total|cantidad)/i.test(q);

    // 2. Ejecutar lógica según intención
    let response = '';

    if (isUrgency) {
      const providers = this.getEmergencyProviders();
      if (providers.length > 0) {
        response = `🚨 *URGENCIAS EN YOPAL (24H / VITALES)* 🚨\n\nHe encontrado estos centros de atención inmediata:\n\n`;
        providers.forEach((p) => {
          const contacts = this.getProviderContacts(p);
          response += `🏥 *${p.entidad_2}*\n📍 ${p.direccion}\n📞 Tel: ${contacts.primaryPhone || 'N/A'}\n${p.is24Hours ? '⏱️ ATENCIÓN 24 HORAS\n' : ''}\n`;
        });
        return { content: response, found: true };
      }
    }

    if (isCategory) {
      const cats = [
        'EPS', 'HOSPITAL/CLINICA', 'ODONTOLOGIA', 'LABORATORIO', 
        'RADIOLOGIA/DIAGNOSTICO', 'OPTICA/OFTALMOLOGIA', 'TRANSPORTE/AMBULANCIA'
      ];
      const targetCat = cats.find(c => q.includes(c.toLowerCase().split('/')[0]));
      if (targetCat) {
        const providers = this.getProvidersByCategory(targetCat);
        if (providers.length > 0) {
          response = `🏥 *${targetCat} EN YOPAL*\n\nAquí tienes algunos resultados:\n\n`;
          providers.slice(0, 5).forEach(p => {
            const contacts = this.getProviderContacts(p);
            response += `🔹 *${p.entidad_2}*\n📍 ${p.direccion}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
          });
          return { content: response, found: true };
        }
      }
    }

    if (isManager) {
      // Extraer posible nombre (esto es simplificado, en producción usaría NLP)
      const results = this.findByIdentifier(q); // findByIdentifier ya busca en gerentes
      if (results.length > 0) {
        response = `👤 *CONTACTOS DIRECTIVOS YOPAL*\n\n`;
        results.slice(0, 3).forEach(p => {
          response += `🏢 *${p.entidad_2}*\n👤 Gerente: ${p.gerente}\n📧 ${p.correo_electronico || 'N/A'}\n\n`;
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

    // 3. Fallback: Búsqueda general por identificador
    const genericMatches = this.findByIdentifier(q);
    if (genericMatches.length > 0) {
      response = `🔍 *RESULTADOS PARA YOPAL*\n\n`;
      genericMatches.slice(0, 3).forEach(p => {
        const contacts = this.getProviderContacts(p);
        response += `🏢 *${p.entidad_2}*\n📍 ${p.direccion}\n📞 ${contacts.primaryPhone || 'N/A'}\n\n`;
      });
      return { content: response, found: true };
    }

    return { content: '', found: false };
  }

  async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'Centros_de_salud_Yopal._.xml',
      );
      this.logger.log(`Attempting to load XML from: ${filePath}`);
      const xmlData = fs.readFileSync(filePath, 'utf-8');

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      const rawRows = result.response?.rows?.row;
      
      this.providers = Array.isArray(rawRows)
        ? rawRows
        : rawRows
          ? [rawRows]
          : [];
      this.logger.log(
        `Loaded ${this.providers.length} providers from Yopal XML.`,
      );
    } catch (error) {
      this.logger.error('Failed to load Yopal health providers data', error);
      this.providers = [];
    }
  }

  searchProviders(query: string): YopalHealthProvider[] {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Si la consulta es vacía, devolver todos los providers
      return [...this.providers];
    }
    return this.providers.filter((p) => {
      const municipio = (p.municipio || '').toLowerCase();
      const depto = (p.departamento || '').toLowerCase();
      const nombre = (p.entidad_2 || '').toLowerCase();
      const gerente = (p.gerente || '').toLowerCase();

      // Búsqueda bidireccional: el campo contiene la query O la query contiene el campo
      const municipioMatch =
        municipio.includes(q) || q.includes(municipio) ||
        depto.includes(q) || q.includes(depto);
      const nombreMatch =
        nombre.includes(q) || q.includes(nombre) ||
        gerente.includes(q) || q.includes(gerente);
      return municipioMatch || nombreMatch;
    });
  }

  /**
   * Calcula la distancia de Jaro-Winkler entre dos cadenas.
   * Resultado de 0 (nula coincidencia) a 1 (coincidencia exacta).
   */
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

    const jaro =
      (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) /
      3;

    // Ajuste de Winkler (prefijo común)
    let prefix = 0;
    const maxPrefix = Math.min(4, Math.min(len1, len2));
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  /**
   * Sugiere proveedores similares basándose en una búsqueda difusa.
   */
  suggestSimilar(query: string, maxSuggestions: number = 3) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return this.providers
      .map((p) => {
        const name = (p.entidad_2 || '').toLowerCase();
        const score = this.jaroWinkler(q, name);
        return { ...p, score };
      })
      .filter((p) => p.score > 0.7) // Umbral de similitud
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }

  /**
   * Busca prestadores por un identificador libre: nombre, teléfono, gerente o dirección.
   * Incluye búsqueda difusa inteligente por tokens.
   */
  findByIdentifier(query: string): YopalHealthProvider[] {
    const q = query.toString().trim().toLowerCase();
    if (!q) return [];

    const stopWords = new Set([
      'que', 'cual', 'como', 'donde', 'queda', 'buscar', 'busco',
      'hay', 'tiene', 'esta', 'los', 'las', 'del', 'por', 'para',
      'con', 'sin', 'una', 'uno', 'centros', 'centro', 'salud',
      'yopal', 'casanare', 'prestadores', 'informacion', 'sobre',
      'dónde', 'cuál', 'cómo', 'cuáles', 'son', 'hospital', 'hospitales',
    ]);
    const tokens = q
      .split(/\s+/)
      .map((t) => t.replace(/[¿?.,;:!¡"'()\[\]{}]/g, ''))
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    // 1. Intentar búsqueda exacta en campos
    const matches = this.providers.filter((p) => {
      const nombre = (p.entidad_2 || '').toLowerCase();
      const gerente = (p.gerente || '').toLowerCase();
      const direccion = (p.direccion || '').toLowerCase();
      const telefono = (p.telefono || '').toLowerCase();
      const correo = (p.correo_electronico || '').toLowerCase();
      const fields = [nombre, gerente, direccion, telefono, correo];

      const exactMatch = fields.some((f) => f.includes(q) || q.includes(f));
      if (exactMatch) return true;

      if (tokens.length > 0) {
        return tokens.some((token) =>
          fields.some((f) => f.includes(token)),
        );
      }
      return false;
    });

    if (matches.length > 0) return matches;

    // 2. Si no hay resultados, intentar búsqueda difusa por tokens individuales
    // Esto ayuda en casos como "Comeva" -> "COOMEVA"
    if (tokens.length > 0) {
      const fuzzyMatches: { p: YopalHealthProvider; score: number }[] = [];
      
      this.providers.forEach(p => {
        const name = (p.entidad_2 || '').toLowerCase();
        // Calculamos el mejor score de Jaro-Winkler entre los tokens y el nombre
        const bestTokenScore = Math.max(...tokens.map(t => this.jaroWinkler(t, name)));
        
        if (bestTokenScore > 0.8) {
          fuzzyMatches.push({ p, score: bestTokenScore });
        }
      });

      if (fuzzyMatches.length > 0) {
        return fuzzyMatches
          .sort((a, b) => b.score - a.score)
          .map(m => m.p);
      }
    }

    // 3. Último recurso: Búsqueda difusa de la query completa
    return this.suggestSimilar(q);
  }

  getMunicipios(): string[] {
    const seen = new Set<string>();
    return this.providers
      .map((p) => p.municipio?.toString().trim() || '')
      .filter((municipio) => municipio.length > 0)
      .filter((municipio) => {
        const normalizedMunicipio = municipio.toLowerCase();
        if (seen.has(normalizedMunicipio)) return false;
        seen.add(normalizedMunicipio);
        return true;
      });
  }

  getKnowledgeSummary(): string {
    return `He encontrado ${this.providers.length} prestadores y centros de salud en Yopal (Casanare) registrados en mi base local.`;
  }
}

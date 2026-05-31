import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface AntioquiaHealthProvider {
  codigohabilitacion: string;
  nombreprestador: string;
  nombre_sede: string;
  direccion: string;
  telefono: string;
  departamento: string;
  municipio: string;
  claseprestador: string;
  clasepersona: string;
  nit: string;
  ese: string;
  email: string;
  privadapublica: string;
  numero_sede: string;
  gerente: string;
  tipo_zona: string;
  barrio: string;
  codigo_centro_poblado: string;
  nombre_centro_poblado: string;
  fecha_apertura: string;
  digito_verificacion_nit: string;
  codigo_naturaleza_juridica: string;
  codigo_clase_prestador: string;
  nivel: string;
  caracter: string;
  horario_lunes: string;
  horario_martes: string;
  horario_miercoles: string;
  horario_jueves: string;
  horario_viernes: string;
  horario_sabado: string;
  horario_domingo: string;
}

/**
 * Normaliza una cadena de texto a minúsculas, eliminando tildes, diacríticos y espacios innecesarios.
 */
function normalizeString(str: string): string {
  return str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';
}

/** Palabras vacías del español que se ignoran al tokenizar consultas de búsqueda para evitar resultados irrelevantes */
const STOPWORDS: ReadonlySet<string> = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'vos', 'vosotros', 'vosotras', 'ellos', 'ellas', 'nosotras', 'nosotros', 'aquí', 'allí', 'allá', 'acá', 'ahora', 'entonces', 'hoy', 'ayer', 'mañana'
]);

@Injectable()
export class AntioquiaHealthService implements OnModuleInit {
  private readonly logger = new Logger(AntioquiaHealthService.name);
  private providers: AntioquiaHealthProvider[] = [];
  private providersByMunicipio = new Map<string, AntioquiaHealthProvider[]>();
  private providersByNit = new Map<string, AntioquiaHealthProvider[]>();

  async onModuleInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      const filePath = path.join(process.cwd(), 'data', 'Prestadores_de_Salud_Departamento_de_Antioquia.xml');
      this.logger.log(`Attempting to load XML from: ${filePath}`);
      const xmlData = await fs.promises.readFile(filePath, 'utf-8');
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      
      const rawRows = result?.response?.rows?.row ?? [];
      this.providers = Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [];
      this.logger.log(`Loaded ${this.providers.length} providers from local file.`);

      // Build indexes by normalized municipio and nit
      this.providersByMunicipio.clear();
      this.providersByNit.clear();
      for (const provider of this.providers) {
        if (provider.municipio) {
          const normMunicipio = normalizeString(provider.municipio);
          if (normMunicipio) {
            if (!this.providersByMunicipio.has(normMunicipio)) {
              this.providersByMunicipio.set(normMunicipio, []);
            }
            this.providersByMunicipio.get(normMunicipio)!.push(provider);
          }
        }

        if (provider.nit) {
          const normNit = normalizeString(provider.nit);
          if (normNit) {
            if (!this.providersByNit.has(normNit)) {
              this.providersByNit.set(normNit, []);
            }
            this.providersByNit.get(normNit)!.push(provider);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load Antioquia health providers data', error);
      this.providers = [];
      this.providersByMunicipio.clear();
      this.providersByNit.clear();
    }
  }

  /** Returns unique list of municipios using the index for optimization */
  getMunicipios(): string[] {
    return Array.from(this.providersByMunicipio.keys())
      .filter(m => m.length >= 3 && !STOPWORDS.has(m));
  }

  /** Search providers by normalized query with an optional limit */
  searchProviders(query: string, limit = 100): AntioquiaHealthProvider[] {
    const tokens = this.getSignificantTokens(query);
    if (tokens.length === 0) return [];

    // Exact NIT match using index
    for (const token of tokens) {
      if (this.providersByNit.has(token)) {
        return this.providersByNit.get(token) || [];
      }
    }

    // Exact municipio match using index
    if (tokens.length === 1 && this.providersByMunicipio.has(tokens[0])) {
      return this.providersByMunicipio.get(tokens[0]) || [];
    }

    // Department token yields all providers (subject to limit)
    if (tokens.includes('antioquia')) {
      return this.providers.slice(0, limit);
    }

    const results = this.providers.filter(p => {
      const fields = [p.municipio, p.nombreprestador, p.nombre_sede, p.claseprestador, p.departamento]
        .filter(Boolean)
        .map(f => normalizeString(f));
      // Prioritize tokens being part of fields for better precision
      return tokens.some(tok => fields.some(fld => fld.includes(tok)));
    });

    return results.slice(0, limit);
  }

  /** 
   * Search specifically by NIT 
   */
  getByNit(nit: string): AntioquiaHealthProvider[] {
    return this.providersByNit.get(normalizeString(nit)) ?? [];
  }

  /** Extract significant tokens from query. Exposed as protected for testing. */
  protected getSignificantTokens(query: string): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));
  }

  getKnowledgeSummary(): string {
    return `He encontrado ${this.providers.length} centros de salud en Antioquia registrados en mi base de datos local. Si desea consultar alguno, me puedes especificar algunos de estos datos y te mostraré la info: municipio, nombre prestador ó nit.`;
  }
}

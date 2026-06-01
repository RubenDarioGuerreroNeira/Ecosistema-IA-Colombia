import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { normalizeString, normalizeNit, STOPWORDS } from '../shared/health-utils';

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
  ese: 'SI' | 'NO' | string;
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
  nivel: '1' | '2' | '3' | string;
  caracter: string;
  horario_lunes: string;
  horario_martes: string;
  horario_miercoles: string;
  horario_jueves: string;
  horario_viernes: string;
  horario_sabado: string;
  horario_domingo: string;
  // Internal fields for optimization
  _normalized?: string[];
}

const KNOWLEDGE_SUMMARY_TEMPLATE = (count: number) => 
  `He encontrado ${count} centros de salud en Antioquia registrados en mi base de datos local. Si desea consultar alguno, me puedes especificar algunos de estos datos y te mostraré la info: municipio, nombre prestador ó nit.`;

@Injectable()
export class AntioquiaHealthService implements OnModuleInit {
  private readonly logger = new Logger(AntioquiaHealthService.name);
  private providers: AntioquiaHealthProvider[] = [];
  private providersByMunicipio = new Map<string, AntioquiaHealthProvider[]>();
  private providersByNit = new Map<string, AntioquiaHealthProvider[]>();
  private municipioDisplayNames = new Map<string, string>();

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
      
      if (!result?.response?.rows) {
        throw new Error('Estructura XML inesperada: falta response.rows');
      }

      const rawRows = result.response.rows.row ?? [];
      this.providers = Array.isArray(rawRows) ? rawRows : [rawRows];
      this.logger.log(`Loaded ${this.providers.length} providers from local file.`);

      // Build indexes and pre-compute normalized fields
      this.providersByMunicipio.clear();
      this.providersByNit.clear();
      this.municipioDisplayNames.clear();

      for (const provider of this.providers) {
        // Pre-compute normalized fields for faster search
        provider._normalized = [
          provider.municipio,
          provider.nombreprestador,
          provider.nombre_sede,
          provider.claseprestador,
          provider.departamento
        ]
          .filter(Boolean)
          .map(f => normalizeString(f));

        if (provider.municipio) {
          const normMunicipio = normalizeString(provider.municipio);
          if (normMunicipio) {
            if (!this.providersByMunicipio.has(normMunicipio)) {
              this.providersByMunicipio.set(normMunicipio, []);
              this.municipioDisplayNames.set(normMunicipio, provider.municipio);
            }
            this.providersByMunicipio.get(normMunicipio)!.push(provider);
          }
        }

        if (provider.nit) {
          const normNit = normalizeNit(provider.nit);
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
      this.municipioDisplayNames.clear();
    }
  }

  /** Returns unique list of municipios using the index for optimization */
  getMunicipios(): string[] {
    return Array.from(this.providersByMunicipio.keys())
      .filter(m => m.length >= 3 && !STOPWORDS.has(m))
      .map(key => this.municipioDisplayNames.get(key) ?? key)
      .sort();
  }

  /** Search providers by normalized query with an optional limit */
  searchProviders(query: string, limit = 100): AntioquiaHealthProvider[] {
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const rawTokens = this.getSignificantTokens(query);
    if (rawTokens.length === 0) return [];

    // Improve token matching for health terms (stemming-like behavior for common plurals)
    const tokens = rawTokens.map(t => {
      if (t.endsWith('es') && t.length > 5) return t.substring(0, t.length - 2);
      if (t.endsWith('s') && t.length > 4) return t.substring(0, t.length - 1);
      return t;
    });

    // Exact NIT match using index
    for (const token of tokens) {
      const nitResults = this.providersByNit.get(normalizeNit(token));
      if (nitResults && nitResults.length > 0) {
        return nitResults.slice(0, safeLimit);
      }
    }

    // Multi-token optimization: try to find by municipio first
    for (const token of tokens) {
      if (this.providersByMunicipio.has(token)) {
        const municipioResults = this.providersByMunicipio.get(token)!;
        if (tokens.length > 1) {
          const otherTokens = tokens.filter(t => t !== token);
          const filtered = municipioResults.filter(p => 
            otherTokens.every(tok => p._normalized?.some(fld => fld.includes(tok)))
          );
          if (filtered.length > 0) return filtered.slice(0, safeLimit);
        }
        return municipioResults.slice(0, safeLimit);
      }
    }

    // Full-scan with pre-computed normalized fields for performance
    // Use 'every' to ensure ALL search terms must match something in the provider record
    const results = this.providers.filter(p => 
      tokens.every(tok => p._normalized?.some(fld => fld.includes(tok)))
    );

    return results.slice(0, safeLimit);
  }

  /** 
   * Search specifically by NIT 
   */
  getByNit(nit: string): AntioquiaHealthProvider[] {
    return this.providersByNit.get(normalizeNit(nit)) ?? [];
  }

  /** Extract significant tokens from query. Exposed as protected for testing. */
  protected getSignificantTokens(query: string, maxTokens = 10): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t))
      .slice(0, maxTokens);
  }

  getKnowledgeSummary(): string {
    return KNOWLEDGE_SUMMARY_TEMPLATE(this.providers.length);
  }
}

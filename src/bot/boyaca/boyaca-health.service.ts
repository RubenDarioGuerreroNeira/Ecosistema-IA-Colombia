import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { normalizeString, normalizeNit, STOPWORDS } from '../../shared/health-utils';

export interface BoyacaHealthProvider {
  municipio?: string;
  codigo_prestador?: string;
  razon_social?: string;
  codigo_habilitacion?: string;
  codigo_municipio?: string;
  nombre_de_sede?: string;
  direccion?: string;
  telefono?: string;
  fax?: string;
  email?: string;
  fecha_apertura?: string;
  nit?: string;
  dv?: string;
  ese?: string;
  sede_principal?: string;
  horario_lunes?: string;
  horario_martes?: string;
  horario_miercoles?: string;
  horario_jueves?: string;
  horario_viernes?: string;
  horario_sabado?: string;
  horario_domingo?: string;
  nivel?: string;
  caracter?: string;
  barrio?: string;
  gerente?: string;
  // Internal fields for optimization
  _normalized?: string[];
}

@Injectable()
export class BoyacaHealthService implements OnModuleInit {
  private readonly logger = new Logger(BoyacaHealthService.name);
  private providers: BoyacaHealthProvider[] = [];
  private providersByMunicipio = new Map<string, BoyacaHealthProvider[]>();
  private providersByNit = new Map<string, BoyacaHealthProvider[]>();
  private providersByCodigo = new Map<string, BoyacaHealthProvider[]>();
  private municipioDisplayNames = new Map<string, string>();
  private hospitalCount = 0;

  async onModuleInit() {
    await this.loadData();
  }

  private async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'servicios_salud_boyaca.xml',
      );
      this.logger.log(`Attempting to load XML from: ${filePath}`);
      const xmlData = await fs.promises.readFile(filePath, 'utf-8');

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);

      if (!result?.response?.rows) {
        throw new Error('Estructura XML inesperada: falta response.rows');
      }

      const rawRows = result.response.rows.row;
      this.providers = Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [];
      this.logger.log(`Loaded ${this.providers.length} providers from Boyacá XML.`);

      // Build indexes and pre-compute fields
      this.providersByMunicipio.clear();
      this.providersByNit.clear();
      this.providersByCodigo.clear();
      this.municipioDisplayNames.clear();
      let tempHospitalCount = 0;

      for (const provider of this.providers) {
        // Pre-compute normalized fields for search
        provider._normalized = [
          provider.municipio,
          provider.razon_social,
          provider.nombre_de_sede,
          provider.gerente
        ]
          .filter(Boolean)
          .map(f => normalizeString(f!));

        if (provider.municipio) {
          const normMun = normalizeString(provider.municipio);
          if (normMun) {
            if (!this.providersByMunicipio.has(normMun)) {
              this.providersByMunicipio.set(normMun, []);
              this.municipioDisplayNames.set(normMun, provider.municipio);
            }
            this.providersByMunicipio.get(normMun)!.push(provider);
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

        const codigo = provider.codigo_prestador || provider.codigo_habilitacion;
        if (codigo) {
          const normCodigo = codigo.toString().trim().toLowerCase();
          if (!this.providersByCodigo.has(normCodigo)) {
            this.providersByCodigo.set(normCodigo, []);
          }
          this.providersByCodigo.get(normCodigo)!.push(provider);
        }

        if (
          provider.razon_social?.toUpperCase().includes('HOSPITAL') ||
          provider.nombre_de_sede?.toUpperCase().includes('HOSPITAL')
        ) {
          tempHospitalCount++;
        }
      }
      this.hospitalCount = tempHospitalCount;
    } catch (error) {
      this.logger.error('Failed to load Boyacá health providers data', error);
      this.providers = [];
      this.providersByMunicipio.clear();
      this.providersByNit.clear();
      this.providersByCodigo.clear();
      this.municipioDisplayNames.clear();
      this.hospitalCount = 0;
    }
  }

  /** Search providers by normalized query with an optional limit */
  searchProviders(query: string, limit = 100): BoyacaHealthProvider[] {
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const rawTokens = this.getSignificantTokens(query);
    if (rawTokens.length === 0) return [];

    // Improve token matching for health terms (common plurals)
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

    // Exact Code match using index
    for (const token of tokens) {
      const codeResults = this.providersByCodigo.get(token);
      if (codeResults && codeResults.length > 0) {
        return codeResults.slice(0, safeLimit);
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

    // Full-scan with pre-computed normalized fields and 'every' logic
    const results = this.providers.filter(p =>
      tokens.every(tok => p._normalized?.some(fld => fld.includes(tok)))
    );

    return results.slice(0, safeLimit);
  }

  /**
   * Busca prestadores por un identificador libre: puede ser código de prestador,
   * NIT, o fragmento de nombre/sede/razón social.
   */
  findByIdentifier(query: string): BoyacaHealthProvider[] {
    const q = query.toString().trim().toLowerCase();

    // 1. Try Code index
    if (this.providersByCodigo.has(q)) {
      return this.providersByCodigo.get(q)!;
    }

    // 2. Try NIT index
    const normNit = normalizeNit(q);
    if (normNit && this.providersByNit.has(normNit)) {
      return this.providersByNit.get(normNit)!;
    }

    // 3. Fallback to searchProviders for text search
    return this.searchProviders(query, 10);
  }

  getMunicipios(): string[] {
    return Array.from(this.providersByMunicipio.keys())
      .filter(m => m.length >= 3 && !STOPWORDS.has(m))
      .map(key => this.municipioDisplayNames.get(key) ?? key)
      .sort();
  }

  getKnowledgeSummary(): string {
    return `He encontrado ${this.providers.length} prestadores y centros de salud en Boyacá registrados en mi base local. Si deseas consultar alguno, especifica el municipio o nombre.`;
  }

  /** Número de hospitales en Boyacá (determinado durante la carga de datos) */
  getHospitalCount(): number {
    return this.hospitalCount;
  }

  /** Extract significant tokens from query. Exposed as protected for testing. */
  protected getSignificantTokens(query: string, maxTokens = 10): string[] {
    return normalizeString(query)
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t))
      .slice(0, maxTokens);
  }
}

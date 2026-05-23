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

@Injectable()
export class CaliHealthService implements OnModuleInit {
  private readonly logger = new Logger(CaliHealthService.name);
  private providers: CaliHealthProvider[] = [];

  async onModuleInit() {
    await this.loadData();
  }

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

  private normalizeString(value?: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[-\u0300-\u036f]/g, '')
      .toLowerCase();
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

  searchProviders(query: string): CaliHealthProvider[] {
    const q = this.normalizeString(query);
    if (!q) return [];

    const tokens = this.getSignificantTokens(query);
    if (tokens.length === 0) return [];

    return this.providers.filter((p) => {
      const fields = [
        this.normalizeString(p.ciudad),
        this.normalizeString(p.sede),
        this.normalizeString(p.servicio),
        this.normalizeString(p.grupo),
        this.normalizeString(p.direccion),
        this.normalizeString(p.departamento),
      ];

      // Coincidencia exacta bidireccional
      const exactMatch = fields.some((f) => f && (f.includes(q) || q.includes(f)));
      if (exactMatch) return true;

      // Coincidencia por tokens significativos individuales (al menos uno)
      if (tokens.length > 0) {
        return tokens.some((token) =>
          fields.some((field) => field && field.includes(token)),
        );
      }

      return false;
    });
  }

  private buildCenterKey(provider: CaliHealthProvider): string {
    const sede = this.normalizeString(provider.sede || provider.servicio);
    const direccion = this.normalizeString(provider.direccion);
    const ciudad = this.normalizeString(provider.ciudad);
    return `${sede}|${direccion}|${ciudad}`;
  }

  getUniqueProvidersByCenter(
    providers: CaliHealthProvider[],
  ): CaliHealthProvider[] {
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

    const tokens = this.getSignificantTokens(query);
    if (tokens.length === 0) return [];

    return this.providers.filter((p) => {
      const fields = [
        this.normalizeString(p.ciudad),
        this.normalizeString(p.sede),
        this.normalizeString(p.servicio),
        this.normalizeString(p.grupo),
        this.normalizeString(p.direccion),
      ];

      // Coincidencia exacta bidireccional
      const exactMatch = fields.some((f) => f && (f.includes(q) || q.includes(f)));
      if (exactMatch) return true;

      // Coincidencia por tokens significativos individuales (al menos uno)
      if (tokens.length > 0) {
        return tokens.some((token) =>
          fields.some((field) => field && field.includes(token)),
        );
      }

      return false;
    });
  }

  getKnowledgeSummary(): string {
    return `--- RED DE SALUD DEL CENTRO (CALI) ---\n🏥 Poseo información sobre servicios de salud en Cali (por sede y servicio).\n📍 Capacidad: Puedo buscar servicios por sede, servicio o municipio.`;
  }
}

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

@Injectable()
export class YopalHealthService implements OnModuleInit {
  private readonly logger = new Logger(YopalHealthService.name);
  private providers: YopalHealthProvider[] = [];

  async onModuleInit() {
    await this.loadData();
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
   * Busca prestadores por un identificador libre: nombre, teléfono, gerente o dirección.
   */
  findByIdentifier(query: string): YopalHealthProvider[] {
    const q = query.toString().trim().toLowerCase();
    if (!q) return [];

    // Extraer tokens significativos para búsqueda por palabra:
    // 1. Limpiar puntuación y signos (ej. "Yopal?" → "yopal")
    // 2. Filtrar stop words comunes en español y términos genéricos de salud/región
    // 3. Mínimo 3 caracteres por token
    const stopWords = new Set([
      'que', 'cual', 'como', 'donde', 'queda', 'buscar', 'busco',
      'hay', 'tiene', 'esta', 'los', 'las', 'del', 'por', 'para',
      'con', 'sin', 'una', 'uno', 'centros', 'centro', 'salud',
      'yopal', 'casanare', 'prestadores', 'informacion', 'sobre',
      'dónde', 'cuál', 'cómo', 'cuáles', 'son',
    ]);
    const tokens = q
      .split(/\s+/)
      .map((t) => t.replace(/[¿?.,;:!¡"'()\[\]{}]/g, ''))
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    return this.providers.filter((p) => {
      const nombre = (p.entidad_2 || '').toLowerCase();
      const gerente = (p.gerente || '').toLowerCase();
      const direccion = (p.direccion || '').toLowerCase();
      const telefono = (p.telefono || '').toLowerCase();
      const correo = (p.correo_electronico || '').toLowerCase();
      const fields = [nombre, gerente, direccion, telefono, correo];

      // Coincidencia exacta bidireccional
      const exactMatch = fields.some((f) => f.includes(q) || q.includes(f));
      if (exactMatch) return true;

      // Coincidencia por tokens individuales (al menos un token significativo)
      if (tokens.length > 0) {
        return tokens.some((token) =>
          fields.some((f) => f.includes(token)),
        );
      }

      return false;
    });
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

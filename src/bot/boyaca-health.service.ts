import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

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
}

@Injectable()
export class BoyacaHealthService implements OnModuleInit {
  private readonly logger = new Logger(BoyacaHealthService.name);
  private providers: BoyacaHealthProvider[] = [];

  async onModuleInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'Servicios Salud BOYACA.xml',
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
        `Loaded ${this.providers.length} providers from Boyacá XML.`,
      );
    } catch (error) {
      this.logger.error('Failed to load Boyacá health providers data', error);
      this.providers = [];
    }
  }

  searchProviders(query: string): BoyacaHealthProvider[] {
    const q = query.toLowerCase();
    return this.providers.filter((p) => {
      const municipioMatch = p.municipio?.toLowerCase().includes(q);
      const nombreMatch =
        p.nombre_de_sede?.toLowerCase().includes(q) ||
        p.razon_social?.toLowerCase().includes(q);
      return municipioMatch || nombreMatch;
    });
  }

  /**
   * Busca prestadores por un identificador libre: puede ser código de prestador,
   * número entero, o fragmento de nombre/sede/razón social.
   */
  findByIdentifier(query: string): BoyacaHealthProvider[] {
    const q = query.toString().trim().toLowerCase();

    // Si es un número puro, buscar en campos de código
    const numeric = /^\d+$/.test(q);
    if (numeric) {
      return this.providers.filter((p) => {
        const codigo = (
          p.codigo_prestador ||
          p.codigo_habilitacion ||
          p.codigo_municipio ||
          ''
        )
          .toString()
          .trim()
          .toLowerCase();
        return codigo === q;
      });
    }

    // Búsqueda por texto en nombre de sede o razón social o coincidencia exacta de sede
    return this.providers.filter((p) => {
      const nombre = (p.nombre_de_sede || p.razon_social || '')
        .toString()
        .toLowerCase();
      const municipio = (p.municipio || '').toString().toLowerCase();
      return (
        nombre.includes(q) ||
        municipio.includes(q) ||
        (p.nombre_de_sede || '').toString().toLowerCase() === q
      );
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
    return `He encontrado ${this.providers.length} prestadores y centros de salud en Boyacá registrados en mi base local.`;
  }

  /** Número de hospitales en Boyacá (determinados por la palabra "HOSPITAL" en nombre o razón social) */
  getHospitalCount(): number {
    return this.providers.filter(p =>
      (p.razon_social?.toUpperCase().includes('HOSPITAL') ||
       p.nombre_de_sede?.toUpperCase().includes('HOSPITAL'))
    ).length;
  }
}

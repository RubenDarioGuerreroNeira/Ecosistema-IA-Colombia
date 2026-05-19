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

@Injectable()
export class AntioquiaHealthService implements OnModuleInit {
  private readonly logger = new Logger(AntioquiaHealthService.name);
  private providers: AntioquiaHealthProvider[] = [];

  async onModuleInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      const filePath = path.join(
        process.cwd(),
        'data',
        'Prestadores_de_Salud_Departamento_de_Antioquia.xml',
      );
      this.logger.log(`Attempting to load XML from: ${filePath}`);
      const xmlData = fs.readFileSync(filePath, 'utf-8');

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);

      const rawRows = result.response.rows.row;
      this.providers = Array.isArray(rawRows) ? rawRows : [rawRows];
      this.logger.log(
        `Loaded ${this.providers.length} providers from local file.`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to load Antioquia health providers data',
        error,
      );
      this.providers = [];
    }
  }

  /**
   * Devuelve la lista única de municipios presentes en los datos cargados.
   */
  getMunicipios(): string[] {
    const municipios = this.providers
      .map((p) => p.municipio || '')
      .filter((m) => m && m.trim().length > 0)
      .map((m) => m.toString());

    return Array.from(new Set(municipios.map((m) => m.toLowerCase())));
  }

  searchProviders(query: string): AntioquiaHealthProvider[] {
    const q = query.toLowerCase();

    // Búsqueda simple basada en municipio
    return this.providers.filter((p) => {
      const municipioMatch =
        p.municipio?.toLowerCase().includes(q) ||
        q.includes(p.municipio?.toLowerCase());
      const nombreMatch =
        p.nombreprestador?.toLowerCase().includes(q) ||
        p.nombre_sede?.toLowerCase().includes(q);
      return municipioMatch || nombreMatch;
    });
  }

  getKnowledgeSummary(): string {
    return `He encontrado ${this.providers.length} centros de salud en Antioquia registrados en mi base de datos local. Si desea consultar alguno, me puedes especificar algunos de estos datos y te mostraré la info: municipio, nombre prestador ó nit.`;
  }
}

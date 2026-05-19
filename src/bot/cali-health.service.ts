import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface CaliHealthServiceRow {
  complejidad: string;
  sede: string;
  grupo: string;
  servicio: string;
  direcci_n: string;
  geolocalizaci_n: string;
  departamento: string;
  ciudad: string;
  tel_fono: string;
  extensi_n: string;
}

@Injectable()
export class CaliHealthService {
  private readonly logger = new Logger(CaliHealthService.name);
  private readonly xmlPath = path.join(
    process.cwd(),
    'data',
    'SERVICIOS_OFERTADOS_RED_DE_SALUD_DEL_CENTRO_ESE_POR_SEDE_CALI.xml',
  );
  private services: CaliHealthServiceRow[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const xmlData = fs.readFileSync(this.xmlPath, 'utf8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      const rows = jsonObj.response?.rows?.row;

      if (Array.isArray(rows)) {
        this.services = rows.map((row) => this.mapRow(row));
      } else if (rows) {
        this.services = [this.mapRow(rows)];
      }
      this.logger.log(
        `✅ CaliHealthService: Loaded ${this.services.length} services for Cali.`,
      );
    } catch (error) {
      this.logger.error('❌ Error loading Cali health services XML:', error);
    }
  }

  private mapRow(row: any): CaliHealthServiceRow {
    return { ...row }; // Mapping direct since keys match XML tags
  }

  /**
   * Search services by sede or service name.
   */
  searchServices(query: string): CaliHealthServiceRow[] {
    const q = query.toLowerCase();
    const noise = [
      'servicios',
      'servicio',
      'en',
      'de',
      'el',
      'la',
      'busco',
      'hay',
      'donde',
    ];
    const words = q
      .split(/\s+/)
      .filter((w) => !noise.includes(w) && w.length > 2);

    return this.services.filter(
      (s) =>
        s.sede?.toLowerCase().includes(q) ||
        s.servicio?.toLowerCase().includes(q) ||
        words.some(
          (word) =>
            s.sede?.toLowerCase().includes(word) ||
            s.servicio?.toLowerCase().includes(word),
        ),
    );
  }

  getKnowledgeSummary(): string {
    return `
--- RED DE SALUD DEL CENTRO (CALI) ---
🏥 Poseo información sobre servicios de salud en Cali (Hospital Primitivo Iglesias, Sede Diego Lalinde, etc.).
📍 Capacidad: Puedo buscar servicios por sede, nivel de complejidad y datos de contacto.
`;
  }
}

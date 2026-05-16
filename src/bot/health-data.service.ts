import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface HealthEvent {
  nombre_del_evento: string;
  urbano: number;
  rural: number;
  primera_infancia: number;
  infancia: number;
  adolescencia: number;
  juventud: number;
  adulto_j_ven: number;
  adulto_mayor: number;
  femenino: number;
  masculino: number;
  total_de_eventos: number;
}

@Injectable()
export class HealthDataService {
  private readonly xmlPath = path.join(
    process.cwd(),
    'data',
    'Eventos_de_Interés_en_Salud_Pública_20260514.xml',
  );
  private events: HealthEvent[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const xmlData = fs.readFileSync(this.xmlPath, 'utf8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);

      // Accessing the rows array from the XML structure <response><rows><row>...
      const rows = jsonObj.response?.rows?.row;

      if (Array.isArray(rows)) {
        this.events = rows.map((row) => this.mapRowToEvent(row));
      } else if (rows) {
        this.events = [this.mapRowToEvent(rows)];
      }

      console.log(
        `✅ HealthDataService: Loaded ${this.events.length} health events from XML.`,
      );
    } catch (error) {
      console.error('❌ Error loading health events XML:', error);
    }
  }

  private mapRowToEvent(row: any): HealthEvent {
    return {
      nombre_del_evento: row.nombre_del_evento,
      urbano: Number(row.urbano) || 0,
      rural: Number(row.rural) || 0,
      primera_infancia: Number(row.primera_infancia) || 0,
      infancia: Number(row.infancia) || 0,
      adolescencia: Number(row.adolescencia) || 0,
      juventud: Number(row.juventud) || 0,
      adulto_j_ven: Number(row.adulto_j_ven) || 0,
      adulto_mayor: Number(row.adulto_mayor) || 0,
      femenino: Number(row.femenino) || 0,
      masculino: Number(row.masculino) || 0,
      total_de_eventos: Number(row.total_de_eventos) || 0,
    };
  }

  async getStatsForEvent(eventName: string): Promise<HealthEvent | null> {
    const event = this.events.find((e) =>
      e.nombre_del_evento.toLowerCase().includes(eventName.toLowerCase()),
    );
    return event || null;
  }

  async getAllEvents(): Promise<string[]> {
    return this.events.map((e) => e.nombre_del_evento);
  }

  async getTopEvents(limit: number = 5): Promise<HealthEvent[]> {
    return [...this.events]
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, limit);
  }

  async getGlobalTotals() {
    return this.events.reduce(
      (acc, curr) => {
        acc.total += curr.total_de_eventos;
        acc.urbano += curr.urbano;
        acc.rural += curr.rural;
        acc.femenino += curr.femenino;
        acc.masculino += curr.masculino;
        return acc;
      },
      { total: 0, urbano: 0, rural: 0, femenino: 0, masculino: 0 },
    );
  }

  async getAgeDistributionTotals() {
    return this.events.reduce(
      (acc, curr) => {
        acc.primera_infancia += curr.primera_infancia;
        acc.infancia += curr.infancia;
        acc.adolescencia += curr.adolescencia;
        acc.juventud += curr.juventud;
        acc.adulto_joven += curr.adulto_j_ven;
        acc.adulto_mayor += curr.adulto_mayor;
        return acc;
      },
      {
        primera_infancia: 0,
        infancia: 0,
        adolescencia: 0,
        juventud: 0,
        adulto_joven: 0,
        adulto_mayor: 0,
      },
    );
  }
}

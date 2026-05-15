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
  private readonly xmlPath = path.join(process.cwd(), 'data', 'Eventos_de_Interés_en_Salud_Pública_20260514.xml');
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
        this.events = rows;
      } else if (rows) {
        this.events = [rows];
      }
      
      console.log(`✅ HealthDataService: Loaded ${this.events.length} health events from XML.`);
    } catch (error) {
      console.error('❌ Error loading health events XML:', error);
    }
  }

  async getStatsForEvent(eventName: string): Promise<HealthEvent | null> {
    const event = this.events.find(e => 
      e.nombre_del_evento.toLowerCase().includes(eventName.toLowerCase())
    );
    return event || null;
  }

  async getAllEvents(): Promise<string[]> {
    return this.events.map(e => e.nombre_del_evento);
  }
}

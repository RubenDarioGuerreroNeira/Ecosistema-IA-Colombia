import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthEvent as HealthEventEntity } from '../entities/health-event.entity';

export interface HealthEvent {
  departamento: string;
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
  private events: HealthEvent[] = [];
  private loaded = false;

  constructor(
    @InjectRepository(HealthEventEntity)
    private readonly healthEventRepo: Repository<HealthEventEntity>,
  ) {
    // No cargamos datos en el constructor - se cargan bajo demanda (lazy load)
    console.log('✅ HealthDataService initialized (SQLite mode) - data will load on first request');
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const rows = await this.healthEventRepo.find();
      this.events = rows.map((row) => ({
        departamento: row.departamento || '',
        nombre_del_evento: row.nombre_del_evento || 'Desconocido',
        urbano: row.urbano || 0,
        rural: row.rural || 0,
        primera_infancia: row.primera_infancia || 0,
        infancia: row.infancia || 0,
        adolescencia: row.adolescencia || 0,
        juventud: row.juventud || 0,
        adulto_j_ven: row.adulto_j_ven || 0,
        adulto_mayor: row.adulto_mayor || 0,
        femenino: row.femenino || 0,
        masculino: row.masculino || 0,
        total_de_eventos: row.total_de_eventos || 0,
      }));
      this.loaded = true;
      console.log(
        `✅ HealthDataService: Loaded ${this.events.length} health events from SQLite.`,
      );
    } catch (error) {
      console.error('❌ Error loading health events from SQLite:', error);
      this.events = [];
      this.loaded = true;
    }
  }

  async getStatsForEvent(eventName: string): Promise<HealthEvent | null> {
    await this.ensureLoaded();
    const event = this.events.find((e) =>
      e.nombre_del_evento.toLowerCase().includes(eventName.toLowerCase()),
    );
    return event || null;
  }

  /**
   * Genera una serie temporal sintética para un evento basándose en su total.
   */
  public async getTemporalSeries(
    eventName: string,
  ): Promise<{ date: Date; cases: number }[]> {
    await this.ensureLoaded();
    const event = this.events.find((e) =>
      e.nombre_del_evento.toLowerCase().includes(eventName.toLowerCase()),
    );
    if (!event) return [];

    const months = 6;
    const mean = event.total_de_eventos / months;
    return Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - i));
      // Añadir fluctuación aleatoria +/- 20%
      const fluctuation = 1 + (Math.random() * 0.4 - 0.2);
      return {
        date,
        cases: Math.round(mean * fluctuation),
      };
    });
  }

  async getAllEvents(): Promise<string[]> {
    await this.ensureLoaded();
    return this.events.map((e) => e.nombre_del_evento);
  }

  async getTopEvents(limit: number = 5): Promise<HealthEvent[]> {
    await this.ensureLoaded();
    return [...this.events]
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, limit);
  }

  /**
   * Obtiene los eventos de salud pública más frecuentes por sexo.
   */
  async getTopEventsByGender(
    gender: 'femenino' | 'masculino',
    limit: number = 5,
  ): Promise<HealthEvent[]> {
    await this.ensureLoaded();
    return [...this.events]
      .sort((a, b) => b[gender] - a[gender])
      .slice(0, limit);
  }

  /**
   * Obtiene los eventos más frecuentes por grupo de edad (SIVIGILA).
   */
  async getTopEventsByAgeGroup(
    ageGroup: keyof Omit<
      HealthEvent,
      | 'nombre_del_evento'
      | 'total_de_eventos'
      | 'urbano'
      | 'rural'
      | 'femenino'
      | 'masculino'
    >,
    limit: number = 5,
  ): Promise<HealthEvent[]> {
    await this.ensureLoaded();
    return [...this.events]
      .sort((a, b) => {
        const valB = Number(b[ageGroup]) || 0;
        const valA = Number(a[ageGroup]) || 0;
        return valB - valA;
      })
      .slice(0, limit);
  }

  async getGlobalTotals() {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
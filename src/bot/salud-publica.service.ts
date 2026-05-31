import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { HealthEvent } from './health-data.service';

@Injectable()
export class SaludPublicaService {
  private events: HealthEvent[] = [];
  private readonly dataPath = path.join(
    process.cwd(),
    'data',
    'Eventos_de_Interés_en_Salud_Pública_20260514.xml',
  );

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      const xmlData = await fs.readFile(this.dataPath, 'utf-8');
      const result = await parseStringPromise(xmlData, {
        explicitArray: false,
      });
      const rows = result?.response?.rows?.row;
      if (rows) {
        this.events = Array.isArray(rows)
          ? rows.map((r) => this.mapRowToEvent(r))
          : [this.mapRowToEvent(rows)];
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  }

  private mapRowToEvent(row: any): HealthEvent {
    return {
      departamento: row.departamento || 'Antioquia',
      nombre_del_evento: row.nombre_del_evento || 'Desconocido',
      urbano: parseInt(row.urbano, 10) || 0,
      rural: parseInt(row.rural, 10) || 0,
      primera_infancia: parseInt(row.primera_infancia, 10) || 0,
      infancia: parseInt(row.infancia, 10) || 0,
      adolescencia: parseInt(row.adolescencia, 10) || 0,
      juventud: parseInt(row.juventud, 10) || 0,
      adulto_j_ven: parseInt(row.adulto_j_ven, 10) || 0,
      adulto_mayor: parseInt(row.adulto_mayor, 10) || 0,
      femenino: parseInt(row.femenino, 10) || 0,
      masculino: parseInt(row.masculino, 10) || 0,
      total_de_eventos: parseInt(row.total_de_eventos, 10) || 0,
    };
  }

  // --- Normalización ---
  private _normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private readonly sinonimos: Record<string, string> = {
    dengue: 'DENGUE',
    'fiebre del dengue': 'DENGUE',
    'dengue hemorragico': 'DENGUE',
    varicela: 'VARICELA INDIVIDUAL',
    'viruela loca': 'VARICELA INDIVIDUAL',
    chickenpox: 'VARICELA INDIVIDUAL',
    mordeduras: 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    rabia: 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    perros: 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    gatos: 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'mordedura de perro':
      'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'violencia de genero':
      'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'violencia intrafamiliar':
      'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    maltrato:
      'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    abuso:
      'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'violencia domestica':
      'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    zika: 'ZIKA',
    'fiebre zika': 'ZIKA',
    desnutricion: 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    'desnutricion aguda': 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    'ninos desnutridos': 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    ansiedad: 'ANSIEDAD',
    'trastorno de ansiedad': 'ANSIEDAD',
    nerviosismo: 'ANSIEDAD',
    fluorosis: 'FLUOROSIS',
    'manchas en dientes': 'FLUOROSIS',
    'exceso de fluor': 'FLUOROSIS',
    'accidente laboral': 'ACCIDENTE DE TRABAJO',
    trabajo: 'ACCIDENTE DE TRABAJO',
    'lesion laboral': 'ACCIDENTE DE TRABAJO',
    intoxicacion: 'INTOXICACIONES',
    envenenamiento: 'INTOXICACIONES',
    intoxicaciones: 'INTOXICACIONES',
    hepatitis: 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    'hepatitis b': 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    'hepatitis c': 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    parotiditis: 'PAROTIDITIS',
    paperas: 'PAROTIDITIS',
    depresion: 'DEPRESIÓN',
    tristeza: 'DEPRESIÓN',
    depresivo: 'DEPRESIÓN',
    suicidio: 'INTENTO DE SUICIDIO',
    'intentar suicidarse': 'INTENTO DE SUICIDIO',
    autolesion: 'INTENTO DE SUICIDIO',
    vih: 'VIH/SIDA - MORTALIDAD POR SIDA',
    sida: 'VIH/SIDA - MORTALIDAD POR SIDA',
    hiv: 'VIH/SIDA - MORTALIDAD POR SIDA',
    cancer: 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'cancer de mama': 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'cuello uterino': 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'cancer cervical': 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'defectos de nacimiento': 'DEFECTOS CONGENITOS',
    malformaciones: 'DEFECTOS CONGENITOS',
    congenitos: 'DEFECTOS CONGENITOS',
    vibora: 'ACCIDENTE OFIDICO',
    serpiente: 'ACCIDENTE OFIDICO',
    'mordedura de serpiente': 'ACCIDENTE OFIDICO',
    ofidismo: 'ACCIDENTE OFIDICO',
    chikungunya: 'CHIKUNGUYA',
    chikunguna: 'CHIKUNGUYA',
    'fiebre chik': 'CHIKUNGUYA',
    tuberculosis: 'TUBERCULOSIS',
    tb: 'TUBERCULOSIS',
    tisis: 'TUBERCULOSIS',
    malaria: 'MALARIA',
    paludismo: 'MALARIA',
    'tos ferina': 'TOS FERINA',
    pertussis: 'TOS FERINA',
    'tos convulsa': 'TOS FERINA',
    chagas: 'CHAGAS',
    'mal de chagas': 'CHAGAS',
    'enfermedad de chagas': 'CHAGAS',
    spa: 'CONSUMO DE SPA',
    drogas: 'CONSUMO DE SPA',
    sustancias: 'CONSUMO DE SPA',
    adiccion: 'CONSUMO DE SPA',
    'consumo de drogas': 'CONSUMO DE SPA',
    lesiones: 'LESIONES DE CAUSA EXTERNA',
    heridas: 'LESIONES DE CAUSA EXTERNA',
    trauma: 'LESIONES DE CAUSA EXTERNA',
    'eventos adversos': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION',
    vacuna: 'EVENTO ADVERSO SEGUIDO A LA VACUNACION',
    'efectos de vacuna': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION',
    eta: 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
    'enfermedad transmitida por alimentos':
      'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
    'contaminacion alimentaria':
      'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
    sifilis: 'SIFILIS GESTACIONAL',
    'sifilis gestacional': 'SIFILIS GESTACIONAL',
    'mortalidad materna': 'MORTALIDAD MATERNA',
    'muerte materna': 'MORTALIDAD MATERNA',
    'muerte de madre': 'MORTALIDAD MATERNA',
    'mortalidad perinatal': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
    'muerte neonatal': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
    'muerte de bebe': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
    'bajo peso': 'BAJO PESO AL NACER',
    prematuro: 'BAJO PESO AL NACER',
    'bebe pequeno': 'BAJO PESO AL NACER',
    'infeccion quirurgica': 'INFECCIONES DE SITIO QUIRÚRGICO...',
    'infeccion de sitio quirurgico': 'INFECCIONES DE SITIO QUIRÚRGICO...',
    espirometria: 'ESI-IRAG (VIGILANCIA CENTINELA)',
    'esi-irag': 'ESI-IRAG (VIGILANCIA CENTINELA)',
    'vigilancia centinela': 'ESI-IRAG (VIGILANCIA CENTINELA)',
  };

  public buscarEventosAmbigua(nombre: string, departamento?: string): HealthEvent[] {
    const normNombre = this._normalizarTexto(nombre);
    const normDepto = departamento ? this._normalizarTexto(departamento) : null;

    return this.events.filter((e) => {
      const matchNombre = this._normalizarTexto(e.nombre_del_evento).includes(normNombre);
      const matchDepto = normDepto ? this._normalizarTexto(e.departamento) === normDepto : true;
      return matchNombre && matchDepto;
    });
  }

  public listarEventos(): string[] {
    return this.events.map((e) => e.nombre_del_evento);
  }
  public topEventos(n = 5): HealthEvent[] {
    return [...this.events]
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, n);
  }
  public bottomEventos(n = 3): HealthEvent[] {
    return [...this.events]
      .sort((a, b) => a.total_de_eventos - b.total_de_eventos)
      .slice(0, n);
  }
  public eventosPorRango(min: number, max: number): HealthEvent[] {
    return this.events.filter((e) => e.total_de_eventos >= min && e.total_de_eventos <= max);
  }
  public eventosExclusivamenteFemeninos(): HealthEvent[] {
    return this.events.filter((e) => e.masculino === 0 && e.femenino > 0);
  }
  public eventosExclusivamenteMasculinos(): HealthEvent[] {
    return this.events.filter((e) => e.femenino === 0 && e.masculino > 0);
  }
  public eventosMasFemeninos(n = 1): HealthEvent[] {
    return [...this.events]
      .filter((e) => e.femenino + e.masculino > 0)
      .sort((a, b) => b.femenino / (b.femenino + b.masculino) - a.femenino / (a.femenino + b.masculino))
      .slice(0, n);
  }
  public compararSexo(nombreEvento: string): any {
    const eventos = this.buscarEventosAmbigua(nombreEvento);
    if (eventos.length === 0) return { error: `No encontré el evento '${nombreEvento}'.` };
    const evento = eventos[0];
    const total = evento.femenino + evento.masculino;
    return {
      evento: evento.nombre_del_evento,
      femenino: evento.femenino,
      masculino: evento.masculino,
      total,
      pctFem: total > 0 ? (evento.femenino / total) * 100 : 0,
      pctMasc: total > 0 ? (evento.masculino / total) * 100 : 0,
    };
  }

  public eventosInfantiles(eventos: HealthEvent[]): { evento: string; casos: number }[] {
    return eventos
      .map((e) => ({ evento: e.nombre_del_evento, casos: e.primera_infancia + e.infancia }))
      .filter((item) => item.casos > 0);
  }
  public eventosPorZona(categoria: string, zona: 'urbano' | 'rural'): { evento: string; casos: number }[] {
    const eventos = this.eventosPorCategoria(categoria);
    return eventos
      .map((e) => ({ evento: e.nombre_del_evento, casos: zona === 'rural' ? e.rural : e.urbano }))
      .filter((item) => item.casos > 0)
      .sort((a, b) => b.casos - a.casos);
  }
  public eventosPorCategoria(categoria: string): HealthEvent[] {
    const cats: Record<string, string[]> = {
      infecciosos: ['DENGUE', 'ZIKA', 'CHIKUNGUYA', 'MALARIA', 'TUBERCULOSIS', 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA', 'VIH/SIDA - MORTALIDAD POR SIDA', 'SIFILIS GESTACIONAL', 'HERPES', 'PAROTIDITIS', 'TOS FERINA', 'CHAGAS', 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)', 'FIEBRE TIFOIDEA'],
      mental: ['ANSIEDAD', 'DEPRESIÓN', 'PSICOSIS', 'TRASTORNO BIPOLAR', 'CONSUMO DE SPA'],
      materno: ['MORTALIDAD MATERNA', 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA', 'BAJO PESO AL NACER', 'DEFECTOS CONGENITOS', 'SIFILIS GESTACIONAL'],
      violencia: ['VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR', 'LESIONES DE CAUSA EXTERNA', 'ACCIDENTE DE TRABAJO', 'INTENTO DE SUICIDIO', 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA', 'ACCIDENTE OFIDICO', 'CONSUMO DE SPA'],
    };
    const lista = cats[categoria.toLowerCase()] || [];
    return this.events.filter((e) => lista.includes(e.nombre_del_evento));
  }

  public _formatearRespuesta(datos: any, tipo: string): { contenido: string; encontrado: boolean } {
    if (datos.error) return { contenido: `⚠️ ${datos.error}`, encontrado: true };
    switch (tipo) {
      case 'detalle': {
        const e = datos.evento;
        return {
          contenido: `--- DETALLE: ${e.nombre_del_evento || 'N/A'} ---
👥 **Casos Totales:** ${e.total_de_eventos || 0}
📍 **Distribución Zona:** ${e.urbano || 0} Urbano / ${e.rural || 0} Rural
👥 **Distribución Sexo:** ${e.femenino || 0} Mujeres / ${e.masculino || 0} Hombres`,
          encontrado: true,
        };
      }
      default: return { contenido: '', encontrado: false };
    }
  }

  public procesarPregunta(texto: string): { contenido?: string; evento?: any; encontrado: boolean } {
    const norm = this._normalizarTexto(texto);
    let eventoBuscado = '';
    for (const [sinonimo, nombreTecnico] of Object.entries(this.sinonimos)) {
      if (norm.includes(this._normalizarTexto(sinonimo))) {
        eventoBuscado = nombreTecnico;
        break;
      }
    }
    if (!eventoBuscado) {
      for (const evento of this.listarEventos()) {
        if (norm.includes(this._normalizarTexto(evento))) {
          eventoBuscado = evento;
          break;
        }
      }
    }
    if (eventoBuscado) {
      const eventos = this.buscarEventosAmbigua(eventoBuscado);
      if (eventos.length >= 1) return { evento: eventos[0], encontrado: true };
    }
    return { encontrado: false };
  }
}

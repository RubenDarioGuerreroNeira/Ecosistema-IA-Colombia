import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { HealthEvent } from './types/health-event.interface';

@Injectable()
export class SaludPublicaService {
  private events: HealthEvent[] = [];
  private readonly dataPath = path.join(process.cwd(), 'data', 'Eventos_de_Interés_en_Salud_Pública_20260514.xml');

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      const xmlData = await fs.readFile(this.dataPath, 'utf-8');
      const result = await parseStringPromise(xmlData, { explicitArray: false });
      const rows = result?.response?.rows?.row;
      if (rows) {
        this.events = Array.isArray(rows) ? rows.map(this.mapRowToEvent) : [this.mapRowToEvent(rows)];
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  }

  private mapRowToEvent(row: any): HealthEvent {
    return {
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
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  private readonly sinonimos: Record<string, string> = {
    'dengue': 'DENGUE', 'fiebre del dengue': 'DENGUE', 'dengue hemorragico': 'DENGUE',
    'varicela': 'VARICELA INDIVIDUAL', 'viruela loca': 'VARICELA INDIVIDUAL', 'chickenpox': 'VARICELA INDIVIDUAL',
    'mordeduras': 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'rabia': 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'perros': 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'gatos': 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'mordedura de perro': 'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
    'violencia de genero': 'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'violencia intrafamiliar': 'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'maltrato': 'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'abuso': 'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'violencia domestica': 'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
    'zika': 'ZIKA', 'fiebre zika': 'ZIKA',
    'desnutricion': 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    'desnutricion aguda': 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    'ninos desnutridos': 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
    'ansiedad': 'ANSIEDAD', 'trastorno de ansiedad': 'ANSIEDAD', 'nerviosismo': 'ANSIEDAD',
    'fluorosis': 'FLUOROSIS', 'manchas en dientes': 'FLUOROSIS', 'exceso de fluor': 'FLUOROSIS',
    'accidente laboral': 'ACCIDENTE DE TRABAJO', 'trabajo': 'ACCIDENTE DE TRABAJO', 'lesion laboral': 'ACCIDENTE DE TRABAJO',
    'intoxicacion': 'INTOXICACIONES', 'envenenamiento': 'INTOXICACIONES', 'intoxicaciones': 'INTOXICACIONES',
    'hepatitis': 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    'hepatitis b': 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    'hepatitis c': 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
    'parotiditis': 'PAROTIDITIS', 'paperas': 'PAROTIDITIS',
    'depresion': 'DEPRESIÓN', 'tristeza': 'DEPRESIÓN', 'depresivo': 'DEPRESIÓN',
    'suicidio': 'INTENTO DE SUICIDIO', 'intentar suicidarse': 'INTENTO DE SUICIDIO', 'autolesion': 'INTENTO DE SUICIDIO',
    'vih': 'VIH/SIDA - MORTALIDAD POR SIDA', 'sida': 'VIH/SIDA - MORTALIDAD POR SIDA', 'hiv': 'VIH/SIDA - MORTALIDAD POR SIDA',
    'cancer': 'CÁNCER DE LA MAMA Y CUELLO UTERINO', 'cancer de mama': 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'cuello uterino': 'CÁNCER DE LA MAMA Y CUELLO UTERINO', 'cancer cervical': 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
    'defectos de nacimiento': 'DEFECTOS CONGENITOS', 'malformaciones': 'DEFECTOS CONGENITOS', 'congenitos': 'DEFECTOS CONGENITOS',
    'vibora': 'ACCIDENTE OFIDICO', 'serpiente': 'ACCIDENTE OFIDICO', 'mordedura de serpiente': 'ACCIDENTE OFIDICO', 'ofidismo': 'ACCIDENTE OFIDICO',
    'chikungunya': 'CHIKUNGUYA', 'chikunguna': 'CHIKUNGUYA', 'fiebre chik': 'CHIKUNGUYA',
    'tuberculosis': 'TUBERCULOSIS', 'tb': 'TUBERCULOSIS', 'tisis': 'TUBERCULOSIS',
    'malaria': 'MALARIA', 'paludismo': 'MALARIA',
    'tos ferina': 'TOS FERINA', 'pertussis': 'TOS FERINA', 'tos convulsa': 'TOS FERINA',
    'chagas': 'CHAGAS', 'mal de chagas': 'CHAGAS', 'enfermedad de chagas': 'CHAGAS',
    'spa': 'CONSUMO DE SPA', 'drogas': 'CONSUMO DE SPA', 'sustancias': 'CONSUMO DE SPA', 'adiccion': 'CONSUMO DE SPA', 'consumo de drogas': 'CONSUMO DE SPA',
    'lesiones': 'LESIONES DE CAUSA EXTERNA', 'heridas': 'LESIONES DE CAUSA EXTERNA', 'trauma': 'LESIONES DE CAUSA EXTERNA',
    'eventos adversos': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION', 'vacuna': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION', 'efectos de vacuna': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION',
    'eta': 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)', 'enfermedad transmitida por alimentos': 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)', 'contaminacion alimentaria': 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
    'sifilis': 'SIFILIS GESTACIONAL', 'sifilis gestacional': 'SIFILIS GESTACIONAL',
    'mortalidad materna': 'MORTALIDAD MATERNA', 'muerte materna': 'MORTALIDAD MATERNA', 'muerte de madre': 'MORTALIDAD MATERNA',
    'mortalidad perinatal': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA', 'muerte neonatal': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA', 'muerte de bebe': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
    'bajo peso': 'BAJO PESO AL NACER', 'prematuro': 'BAJO PESO AL NACER', 'bebe pequeno': 'BAJO PESO AL NACER',
    'infeccion quirurgica': 'INFECCIONES DE SITIO QUIRÚRGICO...', 'infeccion de sitio quirurgico': 'INFECCIONES DE SITIO QUIRÚRGICO...',
    'espirometria': 'ESI-IRAG (VIGILANCIA CENTINELA)', 'esi-irag': 'ESI-IRAG (VIGILANCIA CENTINELA)', 'vigilancia centinela': 'ESI-IRAG (VIGILANCIA CENTINELA)'
  };

  public buscarEventosAmbigua(nombre: string): HealthEvent[] {
    const normNombre = this._normalizarTexto(nombre);
    const nombreExacto = this.sinonimos[normNombre];
    if (nombreExacto) return this.events.filter(e => e.nombre_del_evento === nombreExacto);
    return this.events.filter((e) => this._normalizarTexto(e.nombre_del_evento).includes(normNombre));
  }

  // --- Análisis ---
  public topEventos(n = 5): HealthEvent[] {
    return [...this.events].sort((a, b) => b.total_de_eventos - a.total_de_eventos).slice(0, n);
  }
  public bottomEventos(n = 3): HealthEvent[] {
    return [...this.events].sort((a, b) => a.total_de_eventos - b.total_de_eventos).slice(0, n);
  }
  public eventosPorRango(min: number, max: number): HealthEvent[] {
    return this.events.filter(e => e.total_de_eventos >= min && e.total_de_eventos <= max);
  }

  // --- NLG ---
  public _formatearRespuesta(datos: any, tipo: string): { contenido: string, encontrado: boolean } {
    switch (tipo) {
      case 'total': return { contenido: `El evento **${datos.evento}** registra **${datos.total} casos** en total.`, encontrado: true };
      case 'ranking': return { contenido: `Los eventos más frecuentes son:\n${datos.top.map((e: any, i: number) => `${i + 1}. 🥇 **${e.nombre_del_evento}**: ${e.total_de_eventos} casos`).join('\n')}`, encontrado: true };
      case 'raros': return { contenido: `Los eventos con menos incidencia son:\n${datos.bottom.map((e: any, i: number) => `${i + 1}. 📉 **${e.nombre_del_evento}**: ${e.total_de_eventos} casos`).join('\n')}`, encontrado: true };
      case 'rango': return { contenido: `Eventos con entre ${datos.min} y ${datos.max} casos:\n${datos.lista.map((e: any) => `- **${e.nombre_del_evento}**: ${e.total_de_eventos} casos`).join('\n')}`, encontrado: true };
      default: return { contenido: "", encontrado: false };
    }
  }

  public procesarPreguntaCompleja(texto: string): { contenido: string, encontrado: boolean } {
    const eDengue = this.buscarEventosAmbigua('dengue')[0];
    const eChik = this.buscarEventosAmbigua('chikungunya')[0];
    if (!eDengue || !eChik || eChik.total_de_eventos === 0) return { contenido: "No tengo suficientes datos.", encontrado: true };
    const totalD = eDengue.total_de_eventos;
    const pctUrbD = totalD > 0 ? (eDengue.urbano / totalD) * 100 : 0;
    const pctRurD = totalD > 0 ? (eDengue.rural / totalD) * 100 : 0;
    const pctMasD = totalD > 0 ? (eDengue.masculino / totalD) * 100 : 0;
    const pctFemD = totalD > 0 ? (eDengue.femenino / totalD) * 100 : 0;
    const difAbs = totalD - eChik.total_de_eventos;
    const difRel = (difAbs / eChik.total_de_eventos) * 100;
    return { contenido: `El ${eDengue.nombre_del_evento} registra ${totalD} casos: ${eDengue.rural} rural (${pctRurD.toFixed(1)}%) y ${eDengue.urbano} urbana (${pctUrbD.toFixed(1)}%).
Por sexo, afecta a ${eDengue.masculino} hombres (${pctMasD.toFixed(1)}%) y ${eDengue.femenino} mujeres (${pctFemD.toFixed(1)}%).
Comparado con ${eChik.nombre_del_evento} (${eChik.total_de_eventos} casos), tiene ${difAbs} casos más (${difRel.toFixed(0)}% más).`, encontrado: true };
  }

  public procesarPregunta(texto: string): { contenido: string, encontrado: boolean } {
    const norm = this._normalizarTexto(texto);
    if (norm.includes('dengue') && (norm.includes('rural') || norm.includes('urbana') || norm.includes('hombre') || norm.includes('mujer') || norm.includes('chikungunya'))) {
      return this.procesarPreguntaCompleja(texto);
    }
    if (norm.includes('ranking completo')) {
        return this._formatearRespuesta({ top: this.topEventos(this.events.length) }, 'ranking');
    }
    if (norm.includes('top') || norm.includes('comunes')) {
        const n = parseInt(texto.match(/\d+/)?.[0] || '5');
        return this._formatearRespuesta({ top: this.topEventos(n) }, 'ranking');
    }
    if (norm.includes('raros') || norm.includes('menos casos')) {
        const n = parseInt(texto.match(/\d+/)?.[0] || '3');
        return this._formatearRespuesta({ bottom: this.bottomEventos(n) }, 'raros');
    }
    const matches = texto.match(/entre (\d+) y (\d+)/);
    if (matches) {
        return this._formatearRespuesta({ min: matches[1], max: matches[2], lista: this.eventosPorRango(parseInt(matches[1]), parseInt(matches[2])) }, 'rango');
    }
    const coincidencias = this.buscarEventosAmbigua(texto);
    if (coincidencias.length > 1) return { contenido: "Encontré varios eventos relacionados. ¿Cuál te interesa?", encontrado: true };
    if (coincidencias.length === 0) return { contenido: "No encontré resultados.", encontrado: false };
    const evento = coincidencias[0];
    return this._formatearRespuesta({ evento: evento.nombre_del_evento, total: evento.total_de_eventos }, 'total');
  }
}

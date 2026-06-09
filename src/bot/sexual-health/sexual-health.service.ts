import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface SexualHealthQA {
  id: number;
  id_sub_tema: number;
  pregunta: string;
  respuesta: string;
  palabras_claves: string[];
}

export enum Intencion {
  BUSCAR_INFORMACION = 'buscar_info',
  BUSCAR_SERVICIO = 'buscar_servicio',
  PREVENCION = 'prevencion',
  TRATAMIENTO = 'tratamiento',
  DERECHOS = 'derechos',
  EMERGENCIA = 'emergencia',
  RIESGO_ITS = 'riesgo_its',
  EMBARAZO_ADOLESCENTE = 'embarazo_adolescente'
}

@Injectable()
export class SexualHealthService {
  private readonly xmlPath = path.join(process.cwd(), 'data', 'Salud_sexual_-_preguntas.xml');
  private qaPairs: SexualHealthQA[] = [];

  constructor() {
    this.loadData();
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?]/g, '');
  }

  private loadData() {
    try {
      const xmlData = fs.readFileSync(this.xmlPath, 'utf8');
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      
      const rows = jsonObj.response?.rows?.row;
      
      const data = Array.isArray(rows) ? rows : [rows];
      
      this.qaPairs = data.map((row, index) => ({
        id: index,
        id_sub_tema: parseInt(row.id_sub_tema) || 0,
        pregunta: row.pregunta,
        respuesta: row.respuesta,
        palabras_claves: (row.palabras_claves || '').split(',').map((k: string) => k.trim()),
      }));
      
      console.log(`✅ SexualHealthService: Loaded ${this.qaPairs.length} QA pairs.`);
    } catch (error) {
      console.error('❌ Error loading sexual health XML:', error);
    }
  }

  private stem(word: string): string {
    // Truncamiento de 6 caracteres para evitar colisiones entre autonomía y autocuidado
    return word.substring(0, 6);
  }

  async searchByKeyword(query: string): Promise<SexualHealthQA[]> {
    // 1. Manejo especial para guías médicas predefinidas
    const qNorm = this.normalizeText(query);
    
    // Bypass for predefined queries
    const responses: { [key: string]: { pregunta: string, respuesta: string, excludeKeywords?: string[] } } = {
      'vih': { pregunta: 'Riesgo ITS y profilaxis', respuesta: 'Si tuviste una relación sexual sin protección, debes acudir a los servicios de salud antes de 72 horas para recibir profilaxis posexposición y asesoría.' },
      'condon': { pregunta: 'Prevención y riesgo', respuesta: 'El uso del condón es fundamental. Es importante negociar su uso con tu pareja; si no es posible, busca asesoría en servicios amigables.', excludeKeywords: ['precio', 'costo', 'valor'] },
      'pastillas': { pregunta: 'Anticoncepción de emergencia', respuesta: 'Puedes conseguir anticoncepción de emergencia en servicios de salud amigables (SSAAJ), IPS o farmacias autorizadas bajo orientación médica.' },
      'vasectomia': { pregunta: 'Vasectomía', respuesta: 'La vasectomía es un método anticonceptivo definitivo. Debes consultar con tu EPS o entidad de salud para acceder al procedimiento.' },
      'pomeroy': { pregunta: 'Pomeroy reversible', respuesta: 'La ligadura de trompas (Pomeroy) se considera un método definitivo y no es reversible. Debes consultar con tu médico antes de tomar la decisión.' },
      'embarazada': { pregunta: 'Embarazo adolescente', respuesta: 'Tienes derecho a recibir asesoría gratuita y confidencial en Servicios de Salud Amigables (SSAAJ) o tu centro de salud local.' }
    };

    for (const key in responses) {
      if (qNorm.includes(key)) {
        const responseEntry = responses[key];
        if (responseEntry.excludeKeywords && responseEntry.excludeKeywords.some(exK => qNorm.includes(exK))) {
            continue; // Saltar esta respuesta predefinida si una palabra clave de exclusión es encontrada
        }
        return [{ id: 999, id_sub_tema: 0, pregunta: responseEntry.pregunta, respuesta: responseEntry.respuesta, palabras_claves: [key] }];
      }
    }
    
    // ...

    const words = this.normalizeText(query)
      .split(/\s+/)
      .filter(w => w.length > 2 && !['soy', 'que', 'son', 'cual', 'donde'].includes(w))
      .map(w => this.stem(w));
    
    return this.qaPairs.filter(p => {
      const pText = this.normalizeText(`${p.pregunta} ${p.respuesta} ${p.palabras_claves.join(' ')}`);
      const pWords = pText.split(/\s+/).map(w => this.stem(w));
      
      // Match si la mayoría de las palabras coinciden
      const matches = words.filter(word => pWords.some(pw => pw.includes(word)));
      return matches.length >= Math.ceil(words.length * 0.7);
    });
  }

  classifyIntent(query: string): Intencion {
    const q = this.normalizeText(query);
    
    if (['emergencia', 'urgente', 'violacion', 'abuso', 'agresion', 'acido', 'ataque'].some(k => q.includes(k))) {
      return Intencion.EMERGENCIA;
    }
    if (['vih', 'sexo sin proteccion', 'condon', 'its'].some(k => q.includes(k))) {
      return Intencion.RIESGO_ITS;
    }
    if (['embarazada', '16 anos', 'adolescente', 'gestante'].some(k => q.includes(k))) {
      return Intencion.EMBARAZO_ADOLESCENTE;
    }
    if (['donde', 'acudir', 'ips', 'servicio', 'hospital', 'atencion', 'conseguir', 'pastillas'].some(k => q.includes(k))) {
      return Intencion.BUSCAR_SERVICIO;
    }
    
    return Intencion.BUSCAR_INFORMACION;
  }
}

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
  EMERGENCIA = 'emergencia'
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
    // Truncamiento básico para capturar la raíz de la palabra
    return word.substring(0, 4);
  }

  async searchByKeyword(query: string): Promise<SexualHealthQA[]> {
    // 1. Manejo especial para guías médicas predefinidas
    const qNorm = this.normalizeText(query);
    if (qNorm.includes('cancer de prostata') && qNorm.includes('pregunt')) {
       return [{
         id: 999, id_sub_tema: 0,
         pregunta: '¿Qué preguntas hacerle al médico si tengo cáncer de próstata?',
         respuesta: 'Es importante consultar sobre: Estado del antígeno prostático, avance de la enfermedad, exámenes complementarios, opciones de tratamiento y efectos adversos.',
         palabras_claves: ['cáncer', 'próstata', 'médico']
       }];
    }

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
    
    if (['emergencia', 'urgente', 'violacion', 'abuso', 'agresion'].some(k => q.includes(k))) {
      return Intencion.EMERGENCIA;
    }
    if (['donde', 'acudir', 'ips', 'servicio', 'hospital', 'atencion'].some(k => q.includes(k))) {
      return Intencion.BUSCAR_SERVICIO;
    }
    
    return Intencion.BUSCAR_INFORMACION;
  }
}

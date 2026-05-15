import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface SexualHealthQA {
  pregunta: string;
  respuesta: string;
  palabras_claves: string;
}

@Injectable()
export class SexualHealthService {
  private readonly xmlPath = path.join(process.cwd(), 'data', 'Salud_sexual_-_preguntas.xml');
  private qaPairs: SexualHealthQA[] = [];

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
        this.qaPairs = rows.map(row => ({
          pregunta: row.pregunta,
          respuesta: row.respuesta,
          palabras_claves: row.palabras_claves,
        }));
      } else if (rows) {
        this.qaPairs = [{
          pregunta: rows.pregunta,
          respuesta: rows.respuesta,
          palabras_claves: rows.palabras_claves,
        }];
      }
      
      console.log(`✅ SexualHealthService: Loaded ${this.qaPairs.length} QA pairs from XML.`);
    } catch (error) {
      console.error('❌ Error loading sexual health XML:', error);
    }
  }

  async findRelatedQA(query: string): Promise<SexualHealthQA[] | null> {
    const queryLower = query.toLowerCase();
    
    // Search for matches in questions or keywords
    const matches = this.qaPairs.filter(item => 
      item.pregunta.toLowerCase().includes(queryLower) || 
      (item.palabras_claves && item.palabras_claves.toLowerCase().includes(queryLower))
    );

    return matches.length > 0 ? matches.slice(0, 3) : null; // Return top 3 matches
  }
}

import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { AirQualityService } from '../air/air-quality.service';

@Injectable()
export class AirQualityQuestionsService {
    constructor(
        private readonly airQualityService: AirQualityService,
    ) { }

    async getAvailableQuestions(): Promise<string> {
        const departamentos = await this.airQualityService.getAllDepartamentos();

        let deptosList = '';
        if (departamentos && departamentos.length > 0) {
            deptosList = departamentos
                .slice(0, 30)
                .map(d => `• ${d}`)
                .join('\n');
        }

        return `🍃 **Consultas sobre Calidad del Aire**

Puedo consultar indicadores de calidad del aire para cualquier municipio o departamento de Colombia.

📋 **Departamentos disponibles:**
${deptosList || '(No se pudieron cargar los departamentos)'}

💡 **Ejemplos:**
• *"¿Cómo está la calidad del aire en Bogotá?"*
• *"Calidad del aire en Cali"*
• *"Indicadores ambientales en Medellín"*
• *"Cómo está el aire en Bucaramanga"*

¿De qué municipio o departamento deseas conocer la calidad del aire?`;
    }

    /**
     * Procesa una consulta de texto y retorna una respuesta formateada.
     * Retorna null si la consulta no es de tipo calidad del aire.
     */
    async processAirQualityQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string } | null> {
        const norm = normalizeString(text);

        // Detectar solo consultas EXPLÍCITAS sobre capacidades del servicio (no consultas de datos reales)
        if (
            norm.includes('que calidad del aire') ||
            norm.includes('que info de aire') ||
            norm.includes('que datos de aire') ||
            norm.includes('que sabes de calidad del aire') ||
            norm.includes('tienes informacion de calidad del aire') ||
            norm.includes('tienes info sobre calidad del aire') ||
            norm.includes('tienes datos de calidad del aire') ||
            norm.includes('que preguntas sobre calidad del aire') ||
            (norm.includes('que') && norm.includes('calidad del aire') && !norm.includes(' en ')) ||
            (norm.includes('que') && norm.includes('calidad aire'))
        ) {
            return { respuesta: await this.getAvailableQuestions(), tipo: 'listado' };
        }

        return null;
    }

    /**
     * Obtiene datos de calidad del aire para un municipio/región.
     */
    async obtenerCalidadAire(region: string): Promise<string | null> {
        const aireData = await this.airQualityService.getAirQualityByMunicipio(region);
        if (!aireData || aireData.length === 0) return null;

        const uniqueVariables = Array.from(
            new Map(aireData.map((v: any) => [v.variable, v])).values()
        );
        const variables = uniqueVariables
            .slice(0, 3)
            .map((item: any) => `- ${item.variable}: ${item.promedio} ${item.unidades}`)
            .join('\n');

        return `🍃 **Indicadores ambientales en ${region}:**\n${variables}`;
    }
}
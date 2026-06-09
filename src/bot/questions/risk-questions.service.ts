import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { SaludAnaliticaService } from '../analytic-health/salud-analitica.service';

@Injectable()
export class RiskQuestionsService {
    constructor(
        private readonly saludAnaliticaService: SaludAnaliticaService,
    ) { }

    getAvailableQuestions(): string {
        return `🛡️ **Análisis de Riesgo de Enfermedades Específicas**

Puedo analizar el riesgo de las siguientes enfermedades en cualquier departamento o municipio de Colombia:

🔬 **Enfermedades disponibles:**
• Tuberculosis
• Dengue
• Zika
• Malaria
• Sarampión
• Rubeola
• Fiebre Amarilla
• Hepatitis
• Polio
• Tos ferina

💡 **Ejemplos:**
• *"Analizar riesgo de dengue en Cali"*
• *"Riesgo de tuberculosis en Antioquia"*
• *"Analizar sarampión en Bogotá"*
• *"Riesgo de malaria en el Chocó"*

¿Sobre qué enfermedad deseas analizar el riesgo?`;
    }

    /**
     * Procesa una consulta de texto y retorna una respuesta formateada.
     * Retorna null si la consulta no es de tipo risk analysis.
     */
    async processRiskQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string; event?: string } | null> {
        const norm = normalizeString(text);

        // Detectar si pregunta sobre capacidades del servicio
        if (
            norm.includes('que riesgos') ||
            norm.includes('que analisis de riesgo') ||
            (norm.includes('que') && norm.includes('analizar riesgo')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('enfermedades'))
        ) {
            return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
        }

        return null;
    }

    /**
     * Ejecuta el análisis de riesgo para un evento en una región.
     */
    async analizarRiesgo(event: string, region: string): Promise<string> {
        return await this.saludAnaliticaService.analizarRiesgoEvento(event, region);
    }
}
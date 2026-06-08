import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { EarlyWarningService } from '../early-warning.service';
import { AdvancedPredictionService } from '../advanced-prediction.service';
import { MlPredictionService } from '../ml-prediction.service';
import { SaludPublicaService } from '../salud-publica.service';

@Injectable()
export class PredictiveQuestionsService {
    constructor(
        private readonly earlyWarningService: EarlyWarningService,
        private readonly advancedPredictionService: AdvancedPredictionService,
        private readonly mlPredictionService: MlPredictionService,
        private readonly saludPublicaService: SaludPublicaService,
    ) { }

    getAvailableQuestions(): string {
        return `🤖 **Servicios Predictivos y de Clasificación de Riesgo con IA**

Puedo ayudarte a resolver las siguientes consultas:

🚨 **Alertas Tempranas Automáticas**
• "Alertas tempranas de salud pública"
• "¿Qué eventos requieren atención inmediata?"
• "Panorama de riesgo epidemiológico"

📈 **Pronósticos y Predicciones Avanzadas**
• "Pronóstico de dengue en Antioquia"
• "Predicción de casos de tuberculosis en Bogotá"
• "Tendencia de zika en los próximos meses en Cali"
• "Proyección de casos de malaria en el Chocó"

🧠 **Clasificación de Riesgo con Machine Learning (Random Forest)**
• "Clasificar riesgo de dengue en Cali"
• "Análisis de riesgo de tuberculosis con IA"
• "Riesgo de malaria usando machine learning"
• "Random forest para clasificar riesgo de zika"

📊 **Análisis Completo**
• "Análisis completo de riesgo en Antioquia"
• "Todos los riesgos de salud en Bogotá"

💡 **Ejemplos:**
• *"Clasificar riesgo de dengue en Bogotá"*
• *"Pronóstico de tuberculosis en Antioquia"*
• *"Alertas tempranas"*
• *"Análisis de riesgo de zika con IA en Cali"*

¿Sobre qué servicio predictivo deseas consultar?`;
    }

    /**
     * Procesa una consulta de texto y retorna una respuesta formateada.
     * Retorna null si la consulta no es de tipo predictivo.
     */
    async processPredictiveQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string } | null> {
        const norm = normalizeString(text);

        // Si pregunta qué puede hacer este servicio
        if (
            norm.includes('que pronosticos') ||
            norm.includes('que predicciones') ||
            norm.includes('que alertas') ||
            norm.includes('que clasificaciones') ||
            norm.includes('que sabes de predicciones') ||
            norm.includes('que puedes responder sobre predicciones') ||
            norm.includes('que info tienes de predicciones') ||
            (norm.includes('que') && norm.includes('prediccion')) ||
            (norm.includes('que') && norm.includes('pronostico')) ||
            (norm.includes('que') && norm.includes('alerta temprana')) ||
            (norm.includes('que') && norm.includes('clasificar riesgo')) ||
            (norm.includes('ayuda') && (norm.includes('prediccion') || norm.includes('pronostico') || norm.includes('alerta')))
        ) {
            return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
        }

        return null;
    }

    /**
     * Ejecuta el servicio de alertas tempranas y devuelve el resumen.
     */
    async obtenerAlertasTempranas(): Promise<string> {
        return await this.earlyWarningService.obtenerResumenAlertas();
    }

    /**
     * Ejecuta una predicción avanzada para un evento específico en una región.
     */
    async predecirEvento(evento: string, region: string): Promise<string | null> {
        const prediccion = await this.advancedPredictionService.predecirEvento(evento, region);
        if (!prediccion) return null;

        return `📈 **PREDICCIÓN AVANZADA: ${prediccion.evento}**\n\n` +
            `📍 Departamento: ${prediccion.departamento}\n` +
            `📊 Valor proyectado: **${prediccion.valor_proyectado.toLocaleString()} casos**\n` +
            `📉 IC 95%: [${prediccion.intervalo_confianza_bajo.toLocaleString()} - ${prediccion.intervalo_confianza_alto.toLocaleString()}]\n` +
            `📈 Tendencia: ${prediccion.tendencia}\n` +
            `🔄 Estacionalidad: ${prediccion.estacionalidad_detectada.join(', ')}\n` +
            `🔍 Factores: ${prediccion.factor_influencia}\n\n` +
            `💡 ${prediccion.recomendacion}`;
    }

    /**
     * Ejecuta la clasificación de riesgo con Random Forest para un evento específico en una región.
     */
    async clasificarRiesgo(evento: string, region: string): Promise<string | null> {
        const clasificacion = await this.mlPredictionService.clasificarRiesgo(evento, region);
        if (!clasificacion) return null;

        const emoji = clasificacion.nivel_riesgo === 'CRÍTICO' ? '🚨' :
            clasificacion.nivel_riesgo === 'ALTO' ? '⚠️' :
                clasificacion.nivel_riesgo === 'MEDIO' ? '📋' : '✅';

        let respuesta = `${emoji} **CLASIFICACIÓN DE RIESGO (ML)**\n\n`;
        respuesta += `**${clasificacion.evento}** en **${clasificacion.departamento}**\n\n`;
        respuesta += `Nivel de riesgo: **${clasificacion.nivel_riesgo}**\n`;
        respuesta += `Probabilidad: **${clasificacion.probabilidad}%**\n\n`;
        respuesta += `**Factores decisivos:**\n`;
        for (const f of clasificacion.factores_decisivos) {
            respuesta += `- ${f}\n`;
        }
        respuesta += `\n**Recomendación:**\n${clasificacion.recomendacion_accion}`;

        return respuesta;
    }

    /**
     * Obtiene análisis completo de riesgos para un departamento.
     */
    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        return await this.mlPredictionService.obtenerAnalisisCompleto(departamento);
    }

    /**
     * Obtiene pronósticos múltiples para un departamento.
     */
    async obtenerPronosticosMultiples(departamento: string): Promise<string> {
        return await this.advancedPredictionService.obtenerPronosticosMultiples(departamento);
    }

    /**
     * Lista de eventos disponibles de Salud Pública (formateada).
     */
    async listarEventosDisponibles(): Promise<string> {
        const eventos = await this.saludPublicaService.listarEventos();
        return eventos
            .filter(e => e !== null && e !== undefined)
            .slice(0, 15)
            .map(e => `• ${e}`)
            .join('\n');
    }
}
import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { EarlyWarningService } from '../early-warning.service';
import { AdvancedPredictionService } from '../advanced-prediction.service';
import { MlPredictionService } from '../ml-prediction.service';
import { SaludPublicaService } from '../public-health/salud-publica.service';

@Injectable()
export class PredictiveQuestionsService {
    constructor(
        private readonly earlyWarningService: EarlyWarningService,
        private readonly advancedPredictionService: AdvancedPredictionService,
        private readonly mlPredictionService: MlPredictionService,
        private readonly saludPublicaService: SaludPublicaService,
    ) { }

    getAvailableQuestions(): string {
        return `🤖 **Servicios Predictivos y de Clasificación de Riesgo**

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

🧠 **Clasificación de Riesgo (Scoring Compuesto)**
• "Clasificar riesgo de dengue en Cali"
• "Análisis de riesgo de tuberculosis"
• "Riesgo de malaria"
• "Clasificar riesgo de zika"

💡 **Ejemplo:**
• *"Analizar riesgo de dengue en Cali"*

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

    async processPredictiveQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string } | null> {
        const norm = normalizeString(text);

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

    async obtenerAlertasTempranas(): Promise<string> {
        return await this.earlyWarningService.obtenerResumenAlertas();
    }

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

    async clasificarRiesgo(evento: string, region: string): Promise<string | null> {
        const clasificacion = await this.mlPredictionService.clasificarRiesgo(evento, region);
        if (!clasificacion) return null;
        const emoji = clasificacion.nivel_riesgo === 'CRÍTICO' ? '🔴' :
            clasificacion.nivel_riesgo === 'ALTO' ? '⚠️' :
                clasificacion.nivel_riesgo === 'MEDIO' ? '📋' : '✅';

        let respuesta = `${emoji} CLASIFICACIÓN DE RIESGO (SCORING COMPUESTO)\n\n`;
        respuesta += `${clasificacion.evento} en ${clasificacion.departamento}\n\n`;
        respuesta += `Nivel de riesgo: ${clasificacion.nivel_riesgo}\n`;
        respuesta += `Puntaje total: ${clasificacion.puntaje_total}/100\n\n`;
        respuesta += `Desglose del puntaje:\n`;
        respuesta += `• Volumen de casos: ${clasificacion.desglose_puntaje.volumen} pts\n`;
        respuesta += `• Ruralidad: ${clasificacion.desglose_puntaje.ruralidad} pts\n`;
        respuesta += `• Brecha vacunación: ${clasificacion.desglose_puntaje.brecha_vacunacion} pts\n`;
        respuesta += `• Población vulnerable: ${clasificacion.desglose_puntaje.poblacion_vulnerable} pts\n\n`;
        respuesta += `Factores decisivos:\n`;
        for (const f of clasificacion.factores_decisivos) {
            respuesta += `- ${f}\n`;
        }
        respuesta += `\nRecomendación:\n${clasificacion.recomendacion_accion}`;
        return respuesta;
    }

    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        return await this.mlPredictionService.obtenerAnalisisCompleto(departamento);
    }
    async obtenerPronosticosMultiples(departamento: string): Promise<string> {
        return await this.advancedPredictionService.obtenerPronosticosMultiples(departamento);
    }

    async listarEventosDisponibles(): Promise<string> {
        const eventos = await this.saludPublicaService.listarEventos();
        return eventos
            .filter(e => e !== null && e !== undefined)
            .slice(0, 15)
            .map(e => `• ${e}`)
            .join('\n');
    }
}
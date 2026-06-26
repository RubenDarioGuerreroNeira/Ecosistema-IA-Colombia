import { Injectable, Logger } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { MlPredictionService } from '../ml-prediction.service';
import { EarlyWarningService } from '../early-warning.service';
import { AdvancedPredictionService } from '../advanced-prediction.service';
import { SaludPublicaService } from '../public-health/salud-publica.service';

@Injectable()
export class PredictiveQuestionsService {
    private readonly logger = new Logger(PredictiveQuestionsService.name);

    constructor(
        private readonly mlPredictionService: MlPredictionService,
        private readonly earlyWarningService: EarlyWarningService,
        private readonly advancedPredictionService: AdvancedPredictionService,
        private readonly saludPublicaService: SaludPublicaService,
    ) { }

    // ─── Listado de Capacidades ───────────────────────────────────────────────────

    /**
     * Retorna el mensaje de ayuda general sobre los servicios predictivos disponibles.
     */
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
• *"Riesgo de malaria en Bolivar "*

¿Sobre qué servicio predictivo deseas consultar?`;
    }

    /**
     * Retorna el mensaje con la lista dinámica de eventos y ubicaciones disponibles para predicción de riesgo.
     * Reemplaza la funcionalidad de RiskQuestionsService.getAvailableQuestions().
     */
    async getAvailableRiskQuestions(): Promise<string> {
        const [events, locations] = await Promise.all([
            this.mlPredictionService.listarEventosDisponibles(),
            this.mlPredictionService.listarUbicacionesDisponibles(),
        ]);

        const eventsList = events.length > 0
            ? events.map(e => `• ${e}`).join('\n')
            : '_(No se pudieron cargar los eventos del sistema SIVIGILA)_';

        const locationsList = locations.length > 0
            ? locations.map(l => `• ${l}`).join('\n')
            : '_(No se pudieron cargar las ubicaciones del sistema)_';

        return `🔮 **Predicción de Riesgo Epidemiológico**

        Puedo predecir y analizar el riesgo de los siguientes eventos de salud pública en Colombia, combinando datos oficiales de SIVIGILA, cobertura de vacunación y calidad del aire:

        📋 **Eventos disponibles para predicción:**
        ${eventsList}

        📍 **Ubicaciones con datos disponibles:**
        ${locationsList}

        💡 **Ejemplos de uso:**
        • *"Predecir riesgo de dengue en Amazonas"*
        • *"Analizar riesgo de sarampión en Caldas"*
        • *"Riesgo de malaria en el Arauca"*
        • *"Predecir riesgo de tuberculosis en Boyacá"*
        ¿Sobre qué evento y ubicación deseas realizar la predicción?`;
    }

    // ─── Orquestación Principal ──────────────────────────────────────────────────

    /**
     * Procesa cualquier consulta relacionada con predicción/riesgo/clasificación.
     * Retorna la respuesta formateada, o null si la consulta no es de este dominio.
     */
    async processPredictiveQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string } | null> {
        const norm = normalizeString(text);

        // ── Consultas de capacidades ──────────────────────────────────────────────
        if (this.isCapabilitiesQuery(norm)) {
            return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
        }

        // Consulta específica de "qué riesgos se pueden predecir" (lista eventos + ubicaciones)
        if (this.isRiskEventsListQuery(norm)) {
            const respuesta = await this.getAvailableRiskQuestions();
            return { respuesta, tipo: 'listado_riesgos' };
        }

        // ── Alertas Tempranas ──────────────────────────────────────────────────────
        if (
            norm.includes('alertas tempranas') ||
            norm.includes('alerta temprana') ||
            norm.includes('alertas de salud') ||
            norm.includes('panorama de riesgo') ||
            norm.includes('que eventos requieren atencion')
        ) {
            const resumen = await this.earlyWarningService.obtenerResumenAlertas();
            return { respuesta: resumen, tipo: 'alertas' };
        }

        // ── Pronósticos / Predicciones Avanzadas ──────────────────────────────────
        if (
            norm.includes('pronostico') ||
            (norm.includes('prediccion') && !norm.includes('riesgo')) ||
            (norm.includes('tendencia') && norm.includes('en los proximos')) ||
            (norm.includes('proyeccion') && norm.includes('casos'))
        ) {
            const evento = this.extraerEvento(norm);
            const departamento = region || this.extraerRegion(norm) || 'Colombia';

            if (evento) {
                const prediccion = await this.advancedPredictionService.predecirEvento(evento, departamento);
                if (prediccion) {
                    const respuesta = this.formatearPrediccionAvanzada(prediccion);
                    return { respuesta, tipo: 'prediccion' };
                }
                return {
                    respuesta: `No encontré datos suficientes para proyectar **${evento}** en **${departamento}**.`,
                    tipo: 'error',
                };
            }

            // Sin evento específico → pronósticos múltiples
            if (!region) {
                return {
                    respuesta: '📊 ¿De qué **departamento** deseas ver los pronósticos de salud pública?',
                    tipo: 'pedir_region',
                };
            }
            const multiples = await this.advancedPredictionService.obtenerPronosticosMultiples(departamento);
            return { respuesta: multiples, tipo: 'pronosticos_multiples' };
        }

        // ── Clasificación de Riesgo (Scoring Compuesto) ────────────────────────────
        if (
            norm.includes('clasificar riesgo') ||
            norm.includes('analizar riesgo de') ||
            norm.includes('analisis de riesgo') ||
            norm.includes('riesgo de') ||
            (norm.includes('riesgo') && (
                norm.includes('inteligencia artificial') ||
                norm.includes('random forest') ||
                norm.includes('machine learning')
            ))
        ) {
            const evento = this.extraerEvento(norm);
            const departamento = region || this.extraerRegion(norm) || 'Colombia';

            if (evento && !norm.includes('todos') && !norm.includes('completo')) {
                const clasificacion = await this.mlPredictionService.clasificarRiesgo(evento, departamento);
                if (clasificacion) {
                    const respuesta = this.formatearClasificacionRiesgo(clasificacion);
                    return { respuesta, tipo: 'clasificacion' };
                }
                const eventosList = await this.listarEventosComoTexto();
                return {
                    respuesta: `No encontré datos para clasificar el riesgo de **${evento}** en mi base de datos. ❌\n\n` +
                        `Tengo información disponible sobre estas enfermedades:\n\n${eventosList}\n\n` +
                        `¿Quieres consultar alguna de ellas?`,
                    tipo: 'error',
                };
            }

            // Análisis completo (todos los eventos)
            const analisisCompleto = await this.mlPredictionService.obtenerAnalisisCompleto(departamento);
            return { respuesta: analisisCompleto, tipo: 'analisis_completo' };
        }

        return null;
    }

    // ─── Utilitarios de detección ─────────────────────────────────────────────────

    private isCapabilitiesQuery(norm: string): boolean {
        return (
            (norm.includes('que') && norm.includes('prediccion')) ||
            (norm.includes('que') && norm.includes('pronostico')) ||
            (norm.includes('que') && norm.includes('alerta temprana')) ||
            (norm.includes('que') && norm.includes('clasificar riesgo')) ||
            norm.includes('que sabes de predicciones') ||
            norm.includes('que puedes responder sobre predicciones') ||
            norm.includes('que info tienes de predicciones') ||
            (norm.includes('ayuda') && (
                norm.includes('prediccion') ||
                norm.includes('pronostico') ||
                norm.includes('alerta')
            ))
        );
    }

    private isRiskEventsListQuery(norm: string): boolean {
        return (
            norm.includes('que riesgos') ||
            norm.includes('que analisis de riesgo') ||
            norm.includes('de que eventos') ||
            norm.includes('de qué eventos') ||
            (norm.includes('que') && norm.includes('analizar riesgo')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('enfermedades')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('predecir')) ||
            (norm.includes('riesgos') && norm.includes('puedes predecir')) ||
            (norm.includes('puedes predecir') && norm.includes('riesgo'))
        );
    }

    /**
     * Extrae el nombre del evento de un texto normalizado.
     * Busca patrones como "riesgo de DENGUE en Caldas", "analizar riesgo de SARAMPION en..."
     */
    private extraerEvento(norm: string): string | null {
        // Buscar en patrones conocidos
        const match = norm.match(
            /(?:clasificar riesgo de|analizar riesgo de|riesgo de|pronostico de|prediccion de|proyeccion de|analisis de)\s+([a-záéíóúñ\s]+?)(?:\s+en\s+|$)/
        );
        if (match && match[1]) {
            return match[1].trim();
        }
        return null;
    }

    /**
     * Extrae el nombre de una región de un texto normalizado.
     */
    private extraerRegion(norm: string): string | null {
        const match = norm.match(/\s+en\s+([a-záéíóúñ\s]+?)$/);
        if (match && match[1]) {
            const region = match[1].trim();
            if (region.length > 1) return region;
        }
        return null;
    }

    // ─── Formateo de respuestas ──────────────────────────────────────────────────

    private formatearPrediccionAvanzada(prediccion: any): string {
        return `📈 **PREDICCIÓN AVANZADA: ${prediccion.evento}**\n\n` +
            `📍 Departamento: ${prediccion.departamento}\n` +
            `📊 Valor proyectado: **${prediccion.valor_proyectado.toLocaleString()} casos**\n` +
            `📉 IC 95%: [${prediccion.intervalo_confianza_bajo.toLocaleString()} - ${prediccion.intervalo_confianza_alto.toLocaleString()}]\n` +
            `📈 Tendencia: ${prediccion.tendencia}\n` +
            `🔄 Estacionalidad: ${prediccion.estacionalidad_detectada.join(', ')}\n` +
            `🔍 Factores: ${prediccion.factor_influencia}\n\n` +
            `💡 ${prediccion.recomendacion}`;
    }

    private formatearClasificacionRiesgo(clasificacion: any): string {
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

    private async listarEventosComoTexto(): Promise<string> {
        const eventos = await this.saludPublicaService.listarEventos();
        return eventos
            .filter(e => e !== null && e !== undefined)
            .slice(0, 15)
            .map(e => `• ${e}`)
            .join('\n');
    }

    // ─── Métodos legacy delegados (mantenidos para compatibilidad) ────────────────

    async obtenerAlertasTempranas(): Promise<string> {
        return await this.earlyWarningService.obtenerResumenAlertas();
    }

    async predecirEvento(evento: string, region: string): Promise<string | null> {
        const prediccion = await this.advancedPredictionService.predecirEvento(evento, region);
        if (!prediccion) return null;
        return this.formatearPrediccionAvanzada(prediccion);
    }

    async clasificarRiesgo(evento: string, region: string): Promise<string | null> {
        const clasificacion = await this.mlPredictionService.clasificarRiesgo(evento, region);
        if (!clasificacion) return null;
        return this.formatearClasificacionRiesgo(clasificacion);
    }

    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        return await this.mlPredictionService.obtenerAnalisisCompleto(departamento);
    }

    async obtenerPronosticosMultiples(departamento: string): Promise<string> {
        return await this.advancedPredictionService.obtenerPronosticosMultiples(departamento);
    }

    async listarEventosDisponibles(): Promise<string> {
        return await this.listarEventosComoTexto();
    }
}
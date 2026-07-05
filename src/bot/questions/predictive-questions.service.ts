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

    /*
     Predicción de Riesgo Epidemiológico
        Puedo predecir y analizar el riesgo de los siguientes eventos de salud pública en Colombia, 
        combinando datos oficiales de SIVIGILA, cobertura de vacunación y calidad del aire:   
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


    /* Prediccion de Riesgos(Alertas tempranas, atención inmediata,panoramas de riesgos) y 
    Riesgos Epidemiologicos
    • DENGUE
    • VARICELA INDIVIDUAL
    • AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA */
    async processPredictiveQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string } | null> {
        const norm = normalizeString(text);


        // Servicios predictivos y clasificación de riesgos
        if (this.isCapabilitiesQuery(norm)) {
            return { respuesta: this.getAvailableQuestions(), tipo: 'listado' };
        }

        // Prediccion de Riesgos Epidemiologicos
        if (this.isRiskEventsListQuery(norm)) {
            const respuesta = await this.getAvailableRiskQuestions();
            return { respuesta, tipo: 'listado_riesgos' };
        }

        // ── 3 preguntas diferentes → 3 métodos diferentes ─────────────────────────
        // Pregunta 1: "Alertas tempranas de salud pública" → resumen general
        if (
            norm.includes('alertas tempranas') ||
            norm.includes('alerta temprana') ||
            norm.includes('alertas de salud')
        ) {
            const resumen = await this.earlyWarningService.obtenerResumenAlertas();
            return { respuesta: resumen, tipo: 'alertas' };
        }

        // Pregunta 2: "¿Qué eventos requieren atención inmediata?" → solo EMERGENCIA + ALERTA
        if (norm.includes('que eventos requieren atencion')) {
            const respuesta = await this.earlyWarningService.obtenerEventosAtencionInmediata();
            return { respuesta, tipo: 'atencion_inmediata' };
        }

        // Pregunta 3: "Panorama de riesgo epidemiológico" → distribución geográfica y factores
        if (norm.includes('panorama de riesgo')) {
            const respuesta = await this.earlyWarningService.obtenerPanoramaRiesgoEpidemiologico();
            return { respuesta, tipo: 'panorama_riesgo' };
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
                const prediccion = await this.advancedPredictionService.predecirEvento(
                    evento,
                    departamento,
                );
                if (prediccion) {
                    const respuesta = this.formatearPrediccionAvanzada(prediccion);
                    return { respuesta, tipo: 'prediccion' };
                }
                return {
                    respuesta: `No encontré datos suficientes para proyectar **${evento}** en **${departamento}**.`,
                    tipo: 'error',
                };
            }

            if (!region) {
                return {
                    respuesta:
                        '📊 ¿De qué **departamento** deseas ver los pronósticos de salud pública?',
                    tipo: 'pedir_region',
                };
            }
            const multiples =
                await this.advancedPredictionService.obtenerPronosticosMultiples(
                    departamento,
                );
            return { respuesta: multiples, tipo: 'pronosticos_multiples' };
        }

        // ── Clasificación de Riesgo (Scoring Compuesto) ────────────────────────────
        if (
            norm.includes('clasificar riesgo') ||
            norm.includes('analizar riesgo de') ||
            norm.includes('analisis de riesgo') ||
            norm.includes('riesgo de') ||
            (norm.includes('riesgo') &&
                (norm.includes('inteligencia artificial') ||
                    norm.includes('random forest') ||
                    norm.includes('machine learning')))
        ) {
            const evento = this.extraerEvento(norm);
            const departamento =
                region || this.extraerRegion(norm) || 'Colombia';

            if (evento && !norm.includes('todos') && !norm.includes('completo')) {
                const clasificacion =
                    await this.mlPredictionService.clasificarRiesgo(
                        evento,
                        departamento,
                    );
                if (clasificacion) {
                    const respuesta =
                        this.formatearClasificacionRiesgo(clasificacion);
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

            const analisisCompleto =
                await this.mlPredictionService.obtenerAnalisisCompleto(
                    departamento,
                );
            return {
                respuesta: analisisCompleto,
                tipo: 'analisis_completo',
            };
        }

        return null;
    }

    // valida que pregunta que pregunten por prediccion de riesgos y no Riesgos epidemilogicos

    private isCapabilitiesQuery(norm: string): boolean {
        // Valido que no pregunten por riesgos epidemiologicos
        if (norm.includes('epidemia') || norm.includes('epidemiologico') || norm.includes('prediccion de riesgos epidemiologicos')
            || norm.includes('prediccion de riesgos epidemiologicos') || norm.includes('prediccion de riesgos epidemiologicos')
            || norm.includes('prediccion de riesgos epidemiologicos') || norm.includes('prediccion de riesgos epidemiologicos') ||
            norm.includes('epidemilogia') || norm.includes('riesgos epidemiologicos') || norm.includes('epidemias') ||
            (norm.includes('prediccion') && norm.includes('epidemiologicos')) ||
            (norm.includes('prediccion') && norm.includes('epidemiologico')) ||
            (norm.includes('riesgo') && norm.includes('epidemilogicos')) ||
            (norm.includes('riesgos') && norm.includes('epidemias'))
        ) {
            return false;
        }

        return (
            (norm.includes('que') && norm.includes('prediccion')) ||
            (norm.includes('que') && norm.includes('pronostico')) ||
            (norm.includes('que') && norm.includes('alerta temprana')) ||
            (norm.includes('que') && norm.includes('clasificar riesgo')) ||
            norm.includes('que sabes de predicciones') ||
            norm.includes('clasificacion de riesgos') ||
            norm.includes('alertas tempranas') ||
            norm.includes('que puedes responder sobre predicciones') ||
            norm.includes('que info tienes de predicciones') ||
            (norm.includes('ayuda') &&
                (norm.includes('prediccion') ||
                    norm.includes('pronostico') ||
                    norm.includes('alerta')))
        );
    }
    // Preguntas que devuelve lista de eventos epidemiologicos y departamentos
    private isRiskEventsListQuery(norm: string): boolean {
        return (
            norm.includes('epidemilogica') ||
            norm.includes('epidemia') ||
            norm.includes('epidemiologico') ||
            norm.includes('epidemiologicos') ||
            norm.includes('prediccion de riesgos epidemiologicos') ||
            (norm.includes('que') && norm.includes('analizar riesgo') && norm.includes('epidemiologicos')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemiologicos')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemiologico')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemilogicos')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemilogico')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemias')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemia')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemias')) ||
            (norm.includes('que') && norm.includes('prediccion') && norm.includes('epidemias')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('enfermedades')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('predecir')) ||

            (norm.includes('puedes predecir') && norm.includes('riesgo') && norm.includes('epidemia'))

        );

    }

    private extraerEvento(norm: string): string | null {
        // Mejorado: ahora también soporta "tendencia de" y maneja "proyección de casos de"
        const match = norm.match(
            /(?:clasificar riesgo de|analizar riesgo de|riesgo de|pronostico de|prediccion de|proyeccion de|analisis de|tendencia de)\s+([a-záéíóúñ\s]+?)(?:\s+en\s+|$)/,
        );
        if (match && match[1]) {
            let evento = match[1].trim();

            // Caso especial: "proyeccion de casos de X" - el evento es el último término
            if (evento.includes('casos') && !evento.includes('en')) {
                // Extraer el evento después de "de"
                const eventoMatch = norm.match(/(?:proyeccion de casos de)\s+([a-záéíóúñ]+)/);
                if (eventoMatch && eventoMatch[1]) {
                    evento = eventoMatch[1].trim();
                }
            }
            // Si el evento contiene "proximos" o "meses", significa que no se extrajo bien (frase compleja)
            else if (evento.includes('proximos') || evento.includes('meses')) {
                // Intentar una extracción alternativa: buscar evento antes del primer "en"
                const eventoMatch = norm.match(/(?:tendencia de|pronostico de|prediccion de)\s+([a-záéíóúñ]+)/);
                if (eventoMatch && eventoMatch[1]) {
                    evento = eventoMatch[1].trim();
                }
            }
            return evento.length > 1 ? evento : null;
        }
        return null;
    }

    private extraerRegion(norm: string): string | null {
        // Caso especial para frases como "tendencia de zika en los proximos meses en Cali"
        // Buscar el último " en " de la cadena
        const matches = [...norm.matchAll(/\s+en\s+([a-záéíóúñ\s]+?)(?=\s+en\s+|\s*$)/g)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const region = lastMatch[1].trim();
            // Filtrar palabras que no son regiones
            const palabrasFiltradas = region.split(/\s+/).filter(p =>
                !p.includes('proximos') &&
                !p.includes('meses') &&
                !p.includes('semanas') &&
                !p.includes('dias') &&
                !p.includes('casos')
            ).join(' ');
            if (palabrasFiltradas.length > 1) return palabrasFiltradas;
        }
        return null;
    }

    // ─── Formateo de respuestas ──────────────────────────────────────────────────

    private formatearPrediccionAvanzada(prediccion: any): string {
        return (
            `📈 **PREDICCIÓN AVANZADA: ${prediccion.evento}**\n\n` +
            `📍 Departamento: ${prediccion.departamento}\n` +
            `📊 Valor proyectado: **${prediccion.valor_proyectado.toLocaleString()} casos**\n` +
            `📉 IC 95%: [${prediccion.intervalo_confianza_bajo.toLocaleString()} - ${prediccion.intervalo_confianza_alto.toLocaleString()}]\n` +
            `📈 Tendencia: ${prediccion.tendencia}\n` +
            `🔄 Estacionalidad: ${prediccion.estacionalidad_detectada.join(', ')}\n` +
            `🔍 Factores: ${prediccion.factor_influencia}\n\n` +
            `💡 ${prediccion.recomendacion}`
        );
    }

    private formatearClasificacionRiesgo(clasificacion: any): string {
        const emoji = this.getRiskEmoji(clasificacion.nivel_riesgo);

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

    /**
     * Returns emoji based on risk level for better maintainability
     */
    private getRiskEmoji(nivelRiesgo: string): string {
        const emojiMap: Record<string, string> = {
            CRÍTICO: '🔴',
            ALTO: '⚠️',
            MEDIO: '📋',
        };
        return emojiMap[nivelRiesgo] || '✅';
    }

    private async listarEventosComoTexto(): Promise<string> {
        const eventos = await this.saludPublicaService.listarEventos();
        return eventos
            .filter((e): e is string => e !== null && e !== undefined)
            .slice(0, 15)
            .map((e) => `• ${e}`)
            .join('\n');
    }

    // ─── Métodos delegados ────────────────────────────────────────────────────────

    async obtenerAlertasTempranas(): Promise<string> {
        return this.earlyWarningService.obtenerResumenAlertas();
    }

    async obtenerEventosAtencionInmediata(): Promise<string> {
        return this.earlyWarningService.obtenerEventosAtencionInmediata();
    }

    async obtenerPanoramaRiesgoEpidemiologico(): Promise<string> {
        return this.earlyWarningService.obtenerPanoramaRiesgoEpidemiologico();
    }

    async predecirEvento(
        evento: string,
        region: string,
    ): Promise<string | null> {
        const prediccion =
            await this.advancedPredictionService.predecirEvento(evento, region);
        if (!prediccion) return null;
        return this.formatearPrediccionAvanzada(prediccion);
    }

    async clasificarRiesgo(
        evento: string,
        region: string,
    ): Promise<string | null> {
        const clasificacion =
            await this.mlPredictionService.clasificarRiesgo(evento, region);
        if (!clasificacion) return null;
        return this.formatearClasificacionRiesgo(clasificacion);
    }

    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        return this.mlPredictionService.obtenerAnalisisCompleto(departamento);
    }

    async obtenerPronosticosMultiples(departamento: string): Promise<string> {
        return this.advancedPredictionService.obtenerPronosticosMultiples(departamento);
    }

    async listarEventosDisponibles(): Promise<string> {
        return this.listarEventosComoTexto();
    }

    async listarUbicacionesDisponibles(): Promise<string[]> {
        return await this.saludPublicaService.getDepartamentos();
    }

}
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
        // NOTA: Excluye "automaticas" para que el flujo continue hacia handleEarlyWarning
        if (
            (norm.includes('alertas tempranas') && !norm.includes('automaticas')) ||
            (norm.includes('alerta temprana') && !norm.includes('automatica')) ||
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

        // Excluir consultas con "automaticas" para que no bloqueen el método obtenerAlertasTempranasAutomaticas
        if (norm.includes('automaticas') || norm.includes('automatica')) {
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

    /**
     * 🚨 ALERTAS TEMPRANAS AUTOMÁTICAS
     * 
     * Genera un análisis completo y automatizado del panorama de alertas tempranas
     * de salud pública en Colombia. Combina datos de SIVIGILA, cobertura de vacunación
     * y calidad del aire para producir un informe ejecutivo con:
     * 
     * - Resumen general del estado de alertas
     * - Desglose por nivel de severidad (EMERGENCIA, ALERTA, VIGILANCIA, NORMAL)
     * - Eventos con tendencia creciente y factores de riesgo
     * - Departamentos más afectados
     * - Recomendaciones accionables basadas en datos
     * - Alertas detalladas con casos, factores detonantes y tendencias
     */
    async obtenerAlertasTempranasAutomaticas(): Promise<string> {
        this.logger.log('🚨 Generando Alertas Tempranas Automáticas...');

        try {
            // Obtener todas las alertas evaluadas
            const alertas = await this.earlyWarningService.evaluarAlertas();

            if (alertas.length === 0) {
                return '🟢 **SISTEMA DE ALERTAS TEMPRANAS AUTOMÁTICAS**\n\n' +
                    '✅ **No se detectaron alertas activas** en el período actual.\n\n' +
                    'Todos los eventos de salud pública monitoreados se encuentran dentro de parámetros normales.\n\n' +
                    '📊 _Monitoreo continuo basado en datos SIVIGILA, coberturas de vacunación y calidad del aire._';
            }

            // ── 1. Clasificar por nivel de severidad ──────────────────────────────
            const emergencias = alertas.filter(a => a.nivel === '🔴 EMERGENCIA');
            const alertasActivas = alertas.filter(a => a.nivel === '🟠 ALERTA');
            const vigilancia = alertas.filter(a => a.nivel === '🟡 VIGILANCIA');
            const normales = alertas.filter(a => a.nivel === '🟢 NORMAL');

            // ── 2. Análisis de tendencias ─────────────────────────────────────────
            const crecientes = alertas.filter(a => a.tendencia === 'creciente');
            const decrecientes = alertas.filter(a => a.tendencia === 'decreciente');
            const estables = alertas.filter(a => a.tendencia === 'estable');

            // ── 3. Departamentos más afectados ────────────────────────────────────
            const deptosAfectados = [...new Set(alertas.map(a => a.departamento))];
            const deptosCount = new Map<string, number>();
            for (const a of alertas) {
                deptosCount.set(a.departamento, (deptosCount.get(a.departamento) || 0) + 1);
            }
            const topDeptos = [...deptosCount.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // ── 4. Factores de riesgo predominantes ───────────────────────────────
            const todosFactores = alertas.flatMap(a => a.factor_detonante.split('; '));
            const factorCount = new Map<string, number>();
            for (const f of todosFactores) {
                const key = f.trim();
                if (key) factorCount.set(key, (factorCount.get(key) || 0) + 1);
            }
            const topFactores = [...factorCount.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // ── 5. Eventos más críticos (por volumen de casos) ────────────────────
            const topEventos = [...alertas]
                .sort((a, b) => b.casos - a.casos)
                .slice(0, 5);

            // ── 6. Construir respuesta ────────────────────────────────────────────
            let respuesta = '';

            // Encabezado
            respuesta += '🚨 **ALERTAS TEMPRANAS AUTOMÁTICAS**\n';
            respuesta += 'Sistema de monitoreo epidemiológico en tiempo real\n';
            respuesta += 'Basado en datos SIVIGILA, vacunación y calidad del aire\n\n';

            // ── Resumen Ejecutivo ─────────────────────────────────────────────────
            respuesta += '📋 **RESUMEN EJECUTIVO**\n';
            respuesta += `• Total de alertas generadas: **${alertas.length}**\n`;
            respuesta += `• Departamentos monitoreados: **${deptosAfectados.length}**\n`;
            respuesta += `• Eventos con tendencia creciente: **${crecientes.length}**\n`;
            respuesta += `• Eventos con tendencia decreciente: **${decrecientes.length}**\n`;
            respuesta += `• Eventos estables: **${estables.length}**\n\n`;

            // ── Distribución por Nivel de Riesgo ──────────────────────────────────
            respuesta += '📊 **DISTRIBUCIÓN POR NIVEL DE RIESGO**\n';
            respuesta += `🔴 **EMERGENCIAS:** ${emergencias.length} evento(s)\n`;
            respuesta += `🟠 **ALERTAS:** ${alertasActivas.length} evento(s)\n`;
            respuesta += `🟡 **VIGILANCIA:** ${vigilancia.length} evento(s)\n`;
            respuesta += `🟢 **NORMAL:** ${normales.length} evento(s)\n\n`;

            // ── Departamentos más afectados ───────────────────────────────────────
            respuesta += '📍 **DEPARTAMENTOS CON MAYOR ACTIVIDAD DE ALERTAS**\n';
            for (const [depto, count] of topDeptos) {
                const alertasDepto = alertas.filter(a => a.departamento === depto);
                const tieneEmergencia = alertasDepto.some(a => a.nivel === '🔴 EMERGENCIA');
                const tieneAlerta = alertasDepto.some(a => a.nivel === '🟠 ALERTA');
                const indicador = tieneEmergencia ? '🔴' : tieneAlerta ? '🟠' : '🟡';
                respuesta += `${indicador} **${depto}**: ${count} alerta(s)\n`;
            }
            respuesta += '\n';

            // ── Factores de Riesgo Predominantes ──────────────────────────────────
            if (topFactores.length > 0) {
                respuesta += '⚠️ **FACTORES DE RIESGO PREDOMINANTES**\n';
                for (const [factor, count] of topFactores) {
                    respuesta += `• ${factor} (presente en ${count} alerta(s))\n`;
                }
                respuesta += '\n';
            }

            // ── Top Eventos por Volumen de Casos ──────────────────────────────────
            if (topEventos.length > 0) {
                respuesta += '📈 **TOP EVENTOS POR VOLUMEN DE CASOS**\n';
                for (const ev of topEventos) {
                    const emoji = ev.nivel === '🔴 EMERGENCIA' ? '🔴' :
                        ev.nivel === '🟠 ALERTA' ? '🟠' : '🟡';
                    respuesta += `${emoji} **${ev.evento}** (${ev.departamento}): `;
                    respuesta += `${ev.casos.toLocaleString()} casos - `;
                    respuesta += `Tendencia: ${ev.tendencia} (${ev.variacion_porcentual.toFixed(0)}%)\n`;
                }
                respuesta += '\n';
            }

            // ── Alertas Detalladas ────────────────────────────────────────────────
            if (emergencias.length > 0) {
                respuesta += '🔴 **ALERTAS DE EMERGENCIA - DETALLE**\n';
                for (const a of emergencias) {
                    respuesta += `\n🔴 **${a.evento}**\n`;
                    respuesta += `   📍 Departamento: **${a.departamento}**\n`;
                    respuesta += `   📊 Casos: **${a.casos.toLocaleString()}**\n`;
                    respuesta += `   📈 Tendencia: ${a.tendencia} (${a.variacion_porcentual.toFixed(0)}% variación)\n`;
                    respuesta += `   ⚠️ Factor detonante: ${a.factor_detonante}\n`;
                    respuesta += `   💡 Recomendación: ${a.recomendacion}\n`;
                }
                respuesta += '\n';
            }

            if (alertasActivas.length > 0) {
                respuesta += '🟠 **ALERTAS ACTIVAS - DETALLE**\n';
                for (const a of alertasActivas.slice(0, 5)) {
                    respuesta += `\n🟠 **${a.evento}** (${a.departamento})\n`;
                    respuesta += `   📊 Casos: ${a.casos.toLocaleString()}\n`;
                    respuesta += `   📈 Tendencia: ${a.tendencia}\n`;
                    respuesta += `   ⚠️ Factor: ${a.factor_detonante}\n`;
                }
                if (alertasActivas.length > 5) {
                    respuesta += `\n   ... y ${alertasActivas.length - 5} alerta(s) adicional(es)\n`;
                }
                respuesta += '\n';
            }

            if (vigilancia.length > 0) {
                respuesta += '🟡 **EVENTOS EN VIGILANCIA**\n';
                for (const a of vigilancia.slice(0, 5)) {
                    respuesta += `• **${a.evento}** (${a.departamento}): ${a.casos.toLocaleString()} casos\n`;
                }
                if (vigilancia.length > 5) {
                    respuesta += `• ... y ${vigilancia.length - 5} evento(s) más en vigilancia\n`;
                }
                respuesta += '\n';
            }

            // ── Recomendaciones Generales ─────────────────────────────────────────
            respuesta += '💡 **RECOMENDACIONES GENERALES**\n';
            if (emergencias.length > 0) {
                respuesta += '🔴 **ACTIVAR PROTOCOLOS DE EMERGENCIA** en las regiones afectadas.\n';
                respuesta += '   • Notificar inmediatamente a autoridades sanitarias.\n';
                respuesta += '   • Intensificar búsqueda activa de casos.\n';
                respuesta += '   • Activar planes de contingencia hospitalaria.\n';
            }
            if (alertasActivas.length > 0) {
                respuesta += '🟠 **INTENSIFICAR VIGILANCIA** en eventos con nivel de alerta.\n';
                respuesta += '   • Reforzar esquemas de vacunación donde aplique.\n';
                respuesta += '   • Mantener vigilancia comunitaria activa.\n';
            }
            if (crecientes.length > 3) {
                respuesta += '📈 **MÚLTIPLES EVENTOS CON TENDENCIA CRECIENTE**.\n';
                respuesta += '   • Reforzar campañas de prevención.\n';
                respuesta += '   • Asegurar disponibilidad de insumos médicos.\n';
            }
            respuesta += '✅ Mantener canales de notificación obligatoria activos.\n';
            respuesta += '✅ Monitorear evolución semanal de todos los eventos.\n\n';

            // ── Pie de página ─────────────────────────────────────────────────────
            respuesta += '---\n';
            respuesta += '_🤖 Alertas generadas automáticamente por el Sistema de Inteligencia Epidemiológica._\n';
            respuesta += '_Fuentes: SIVIGILA, Coberturas de Vacunación PAI, Calidad del Aire._\n';
            respuesta += `_Última actualización: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}_`;

            return respuesta;

        } catch (error) {
            this.logger.error(`Error generando Alertas Tempranas Automáticas: ${error.message}`);
            return '⚠️ **Error al generar Alertas Tempranas Automáticas**\n\n' +
                'Ocurrió un error al procesar los datos de alertas. Por favor, intenta de nuevo más tarde.\n\n' +
                '_Si el problema persiste, contacta al administrador del sistema._';
        }
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
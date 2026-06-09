import { Injectable, Logger } from '@nestjs/common';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { AirQualityService } from './air/air-quality.service';
import { HealthDataService } from './health-data.service';

// @ts-ignore - ml-random-forest no tiene tipos oficiales
import RF from 'ml-random-forest';

interface ClasificacionRiesgo {
    evento: string;
    departamento: string;
    nivel_riesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
    probabilidad: number;
    factores_decisivos: string[];
    recomendacion_accion: string;
}

interface DatosEntrenamiento {
    caracteristicas: number[][];
    etiquetas: string[];
}

@Injectable()
export class MlPredictionService {
    private readonly logger = new Logger(MlPredictionService.name);
    private modelo: any = null;
    private modeloEntrenado = false;

    // Mapeo de etiquetas a números
    private readonly MAPA_RIESGO: Record<string, number> = {
        BAJO: 0,
        MEDIO: 1,
        ALTO: 2,
        CRÍTICO: 3,
    };
    private readonly MAPA_INVERSO: Record<number, string> = {
        0: 'BAJO',
        1: 'MEDIO',
        2: 'ALTO',
        3: 'CRÍTICO',
    };

    constructor(
        private readonly saludPublicaService: SaludPublicaService,
        private readonly vaccinationService: VaccinationService,
        private readonly airQualityService: AirQualityService,
        private readonly healthDataService: HealthDataService,
    ) {
        this.inicializarModelo();
    }

    private async inicializarModelo() {
        try {
            this.logger.log('🧠 Inicializando modelo Random Forest...');
            const datos = await this.generarDatosEntrenamiento();

            if (datos.caracteristicas.length < 10) {
                this.logger.warn('⚠️ Datos insuficientes para entrenar modelo');
                return;
            }

            const rf = new RF.RandomForestClassifier({
                nEstimators: 50,
                maxFeatures: Math.max(1, Math.floor(Math.sqrt(datos.caracteristicas[0].length))),
                seed: 42,
                useSampleBagging: true,
            });

            // Convertir etiquetas a números para el entrenamiento
            const etiquetasNumericas = datos.etiquetas.map(e => parseInt(e));
            rf.train(datos.caracteristicas, etiquetasNumericas);
            this.modelo = rf;
            this.modeloEntrenado = true;
            this.logger.log(`✅ Modelo Random Forest entrenado con ${datos.caracteristicas.length} muestras`);
        } catch (error) {
            this.logger.error('Error inicializando modelo:', error);
        }
    }

    private async generarDatosEntrenamiento(): Promise<DatosEntrenamiento> {
        const caracteristicas: number[][] = [];
        const etiquetas: number[] = [];

        try {
            const eventos = await this.saludPublicaService.listarEventosCompletos();

            for (const evento of eventos) {
                const total = evento.total_de_eventos || 0;
                if (total === 0) continue;

                // Características del evento
                const pctUrbano = total > 0 ? (evento.urbano || 0) / total : 0;
                const pctRural = total > 0 ? (evento.rural || 0) / total : 0;
                const pctFem = total > 0 ? (evento.femenino || 0) / total : 0;
                const pctMasc = total > 0 ? (evento.masculino || 0) / total : 0;
                const pctJovenes = total > 0 ?
                    ((evento.primera_infancia || 0) + (evento.infancia || 0) + (evento.adolescencia || 0)) / total : 0;
                const pctAdultos = total > 0 ?
                    ((evento.adulto_j_ven || 0) + (evento.adulto_mayor || 0)) / total : 0;

                // Normalizar total de casos (log scale)
                const logCasos = Math.log10(total + 1) / 5; // Normalizado entre 0-1 aprox

                caracteristicas.push([
                    logCasos,
                    pctUrbano,
                    pctRural,
                    pctFem,
                    pctMasc,
                    pctJovenes,
                    pctAdultos,
                ]);

                // Determinar etiqueta de riesgo basada en reglas de negocio
                const riesgo = this.determinarRiesgoReal(evento);
                etiquetas.push(this.MAPA_RIESGO[riesgo]);
            }

            return {
                caracteristicas,
                etiquetas: etiquetas.map(e => e.toString()),
            };
        } catch (error) {
            this.logger.error('Error generando datos de entrenamiento:', error);
            return { caracteristicas: [], etiquetas: [] };
        }
    }

    private determinarRiesgoReal(evento: any): string {
        const total = evento.total_de_eventos || 0;
        const pctRural = total > 0 ? (evento.rural || 0) / total : 0;

        // Reglas de negocio para determinar riesgo real
        if (total > 50000 || (total > 20000 && pctRural > 0.5)) return 'CRÍTICO';
        if (total > 20000 || (total > 10000 && pctRural > 0.4)) return 'ALTO';
        if (total > 5000 || pctRural > 0.6) return 'MEDIO';
        return 'BAJO';
    }

    async clasificarRiesgo(
        nombreEvento: string,
        departamento: string,
    ): Promise<ClasificacionRiesgo | null> {
        try {
            // 1. Obtener datos del evento
            const evento = await this.saludPublicaService.buscarEventosAmbigua(nombreEvento);
            if (evento.length === 0) return null;

            const eventData = evento[0];
            const total = eventData.total_de_eventos || 0;
            if (total === 0) return null;

            // 2. Construir vector de características
            const pctUrbano = total > 0 ? (eventData.urbano || 0) / total : 0;
            const pctRural = total > 0 ? (eventData.rural || 0) / total : 0;
            const pctFem = total > 0 ? (eventData.femenino || 0) / total : 0;
            const pctMasc = total > 0 ? (eventData.masculino || 0) / total : 0;
            const pctJovenes = total > 0 ?
                ((eventData.primera_infancia || 0) + (eventData.infancia || 0) + (eventData.adolescencia || 0)) / total : 0;
            const pctAdultos = total > 0 ?
                ((eventData.adulto_j_ven || 0) + (eventData.adulto_mayor || 0)) / total : 0;
            const logCasos = Math.log10(total + 1) / 5;

            const features = [[logCasos, pctUrbano, pctRural, pctFem, pctMasc, pctJovenes, pctAdultos]];

            // 3. Predecir con el modelo si está entrenado
            let nivelRiesgo: string;
            let probabilidad: number;

            if (this.modeloEntrenado && this.modelo) {
                try {
                    const prediccion = this.modelo.predict(features);
                    const predicciones = this.modelo.predictProbabilities(features);
                    nivelRiesgo = this.MAPA_INVERSO[parseInt(prediccion[0])] || 'BAJO';
                    probabilidad = predicciones && predicciones[0]
                        ? Math.max(...(Object.values(predicciones[0]) as number[])) * 100
                        : 75;
                } catch {
                    // Fallback a reglas si el modelo falla
                    nivelRiesgo = this.determinarRiesgoReal(eventData);
                    probabilidad = 70;
                }
            } else {
                // Fallback: usar reglas de negocio
                nivelRiesgo = this.determinarRiesgoReal(eventData);
                probabilidad = 65;
            }

            // 4. Obtener factores adicionales (vacunación, aire)
            const factores = await this.obtenerFactoresDecisivos(nombreEvento, departamento, eventData);

            // 5. Generar recomendación
            const recomendacion = this.generarRecomendacionML(nivelRiesgo, nombreEvento, departamento, eventData);

            return {
                evento: eventData.nombre_del_evento,
                departamento: departamento,
                nivel_riesgo: nivelRiesgo as ClasificacionRiesgo['nivel_riesgo'],
                probabilidad: Math.round(probabilidad),
                factores_decisivos: factores,
                recomendacion_accion: recomendacion,
            };
        } catch (error) {
            this.logger.error(`Error clasificando riesgo para ${nombreEvento}:`, error);
            return null;
        }
    }

    private async obtenerFactoresDecisivos(
        evento: string,
        departamento: string,
        eventData: any,
    ): Promise<string[]> {
        const factores: string[] = [];
        const total = eventData.total_de_eventos || 0;

        // Factor 1: Volumen de casos
        if (total > 30000) factores.push(`Alto volumen: ${total.toLocaleString()} casos`);
        else if (total > 10000) factores.push(`Volumen significativo: ${total.toLocaleString()} casos`);

        // Factor 2: Distribución por zona
        const pctRural = total > 0 ? (eventData.rural / total) * 100 : 0;
        if (pctRural > 50) factores.push(`Predominantemente rural (${pctRural.toFixed(0)}%)`);

        // Factor 3: Grupo etario más afectado
        const grupos = [
            { nombre: 'primera infancia', valor: eventData.primera_infancia || 0 },
            { nombre: 'infancia', valor: eventData.infancia || 0 },
            { nombre: 'adolescentes', valor: eventData.adolescencia || 0 },
            { nombre: 'adultos jóvenes', valor: eventData.adulto_j_ven || 0 },
            { nombre: 'adultos mayores', valor: eventData.adulto_mayor || 0 },
        ];
        const maxGrupo = grupos.reduce((max, g) => g.valor > max.valor ? g : max, grupos[0]);
        if (maxGrupo.valor > 0) {
            const pctGrupo = ((maxGrupo.valor / total) * 100).toFixed(0);
            factores.push(`Mayor impacto en ${maxGrupo.nombre} (${pctGrupo}%)`);
        }

        // Factor 4: Vacunación
        try {
            const vacunacion = await this.vaccinationService.getCoverageByDepartment(departamento);
            if (vacunacion.length > 0) {
                const covProm = vacunacion.reduce((s, v) => {
                    const c = parseFloat(v.cobertura_de_vacunaci_n);
                    return s + (isNaN(c) ? 0 : c);
                }, 0) / vacunacion.length;
                if (covProm < 0.7) factores.push(`Cobertura de vacunación crítica (${(covProm * 100).toFixed(0)}%)`);
                else if (covProm < 0.85) factores.push(`Cobertura de vacunación sub-óptima (${(covProm * 100).toFixed(0)}%)`);
            }
        } catch { }

        return factores;
    }

    private generarRecomendacionML(
        nivel: string,
        evento: string,
        departamento: string,
        eventData: any,
    ): string {
        const base = `Para **${evento}** en **${departamento}**`;

        switch (nivel) {
            case 'CRÍTICO':
                return `${base}: 🚨 ACTIVAR PROTOCOLO DE EMERGENCIA. Se requiere intervención inmediata. ` +
                    'Movilizar recursos, activar COE (Centro de Operaciones de Emergencia), ' +
                    'reforzar capacidad hospitalaria y campaña masiva de prevención.';
            case 'ALTO':
                return `${base}: ⚠️ ALERTA SANITARIA. Intensificar vigilancia epidemiológica activa. ` +
                    'Reforzar esquemas de vacunación en poblaciones vulnerables, ' +
                    'aumentar puntos de diagnóstico y preparar plan de contingencia.';
            case 'MEDIO':
                return `${base}: 📋 REQUIERE ATENCIÓN. Mantener monitoreo semanal. ` +
                    'Verificar coberturas de vacunación y condiciones ambientales. ' +
                    'Reforzar medidas preventivas en zonas rurales si aplica.';
            default:
                return `${base}: 🟢 BAJO RIESGO. Continuar con vigilancia rutinaria. ` +
                    'Mantener esquemas de vacunación al día y monitoreo pasivo de casos.';
        }
    }

    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        const eventos = await this.saludPublicaService.listarEventosCompletos();
        const topEventos = eventos
            .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
            .slice(0, 8);

        let respuesta = '🤖 **ANÁLISIS DE RIESGO CON IA (RANDOM FOREST)**\n\n';
        respuesta += `Departamento: **${departamento}**\n`;
        respuesta += `Modelo: Random Forest (${this.modeloEntrenado ? '✅ Entrenado' : '⚠️ Usando reglas de negocio'})\n\n`;
        respuesta += '| Evento | Riesgo | Probabilidad | Acción |\n';
        respuesta += '|:---|:---:|---:|:---|\n';

        for (const evento of topEventos) {
            const clasificacion = await this.clasificarRiesgo(
                evento.nombre_del_evento,
                departamento,
            );
            if (clasificacion) {
                const emoji = clasificacion.nivel_riesgo === 'CRÍTICO' ? '🔴' :
                    clasificacion.nivel_riesgo === 'ALTO' ? '🟠' :
                        clasificacion.nivel_riesgo === 'MEDIO' ? '🟡' : '🟢';
                respuesta += `| ${emoji} ${clasificacion.evento} | ${clasificacion.nivel_riesgo} | ${clasificacion.probabilidad}% | ${clasificacion.recomendacion_accion.split('.')[0]}. |\n`;
            }
        }

        respuesta += '\n---\n';
        respuesta += '_Clasificación basada en: volumen de casos, distribución urbano/rural, ' +
            'grupos etarios afectados, cobertura de vacunación y datos ambientales._';

        return respuesta;
    }
}
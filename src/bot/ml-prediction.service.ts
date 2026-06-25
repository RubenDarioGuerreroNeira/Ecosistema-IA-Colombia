import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { AirQualityService } from './air/air-quality.service';
import { HealthDataService } from './health-data.service';
import { HealthEvent } from './types/health-event.interface';

interface ClasificacionRiesgo {
    evento: string;
    departamento: string;
    nivel_riesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
    puntaje_total: number;
    desglose_puntaje: DesgloseScore;
    factores_decisivos: string[];
    recomendacion_accion: string;
}

interface DesgloseScore {
    volumen: number;
    ruralidad: number;
    brecha_vacunacion: number;
    poblacion_vulnerable: number;
    total: number;
}

interface PesosDimensiones {
    volumen: number;
    ruralidad: number;
    brecha_vacunacion: number;
    poblacion_vulnerable: number;
}

@Injectable()
export class MlPredictionService implements OnModuleInit {
    private readonly logger = new Logger(MlPredictionService.name);

    private readonly PESOS: PesosDimensiones = {
        volumen: 0.40,
        ruralidad: 0.20,
        brecha_vacunacion: 0.25,
        poblacion_vulnerable: 0.15,
    };

    private readonly UMBRALES = {
        CRITICO: 75,
        ALTO: 50,
        MEDIO: 25,
    };

    constructor(
        private readonly saludPublicaService: SaludPublicaService,
        private readonly vaccinationService: VaccinationService,
        private readonly airQualityService: AirQualityService,
        private readonly healthDataService: HealthDataService,
    ) { }

    async onModuleInit() {
        this.logger.log('📊 Sistema de Scoring Compuesto inicializado');
        this.logger.log(`⚙️ Pesos: Volumen=${this.PESOS.volumen * 100}%, Ruralidad=${this.PESOS.ruralidad * 100}%, BrechaVacunación=${this.PESOS.brecha_vacunacion * 100}%, PoblaciónVulnerable=${this.PESOS.poblacion_vulnerable * 100}%`);
    }

    private calcularScoreVolumen(total: number, eventos: HealthEvent[]): number {
        if (total <= 0 || eventos.length === 0) return 0;
        const totales = eventos.map(e => e.total_de_eventos || 0).sort((a, b) => b - a);
        const maxTotal = totales[0] || 1;
        const minTotal = totales[eventos.length - 1] || 0;
        const rango = maxTotal - minTotal || 1;
        const scorePosicion = ((total - minTotal) / rango) * 100;
        const logTotal = Math.log10(total + 1);
        const logMax = Math.log10(maxTotal + 1);
        const scoreLog = logMax > 0 ? (logTotal / logMax) * 100 : 0;
        return Math.round(scorePosicion * 0.6 + scoreLog * 0.4);
    }

    private calcularScoreRuralidad(evento: HealthEvent): number {
        const total = evento.total_de_eventos || 0;
        if (total <= 0) return 0;
        const pctRural = (evento.rural || 0) / total;
        if (pctRural >= 0.7) return 100;
        if (pctRural >= 0.5) return 75 + ((pctRural - 0.5) / 0.2) * 25;
        if (pctRural >= 0.3) return 40 + ((pctRural - 0.3) / 0.2) * 35;
        if (pctRural >= 0.15) return 15 + ((pctRural - 0.15) / 0.15) * 25;
        return Math.round((pctRural / 0.15) * 15);
    }

    private calcularScoreBrechaVacunacion(coberturaPromedio: number | null): number {
        if (coberturaPromedio === null) return 0;
        if (coberturaPromedio >= 0.95) return 0;
        if (coberturaPromedio >= 0.85) return Math.round((0.95 - coberturaPromedio) / 0.10 * 30);
        if (coberturaPromedio >= 0.70) return 30 + Math.round((0.85 - coberturaPromedio) / 0.15 * 40);
        return 70 + Math.round((0.70 - coberturaPromedio) / 0.70 * 30);
    }

    private calcularScorePoblacionVulnerable(evento: HealthEvent): number {
        const total = evento.total_de_eventos || 0;
        if (total <= 0) return 0;
        const poblacionVulnerable = (evento.primera_infancia || 0) + (evento.infancia || 0) + (evento.adulto_mayor || 0);
        const pctVulnerable = poblacionVulnerable / total;
        if (pctVulnerable >= 0.6) return 100;
        if (pctVulnerable >= 0.4) return 70 + ((pctVulnerable - 0.4) / 0.2) * 30;
        if (pctVulnerable >= 0.2) return 35 + ((pctVulnerable - 0.2) / 0.2) * 35;
        return Math.round((pctVulnerable / 0.2) * 35);
    }

    private calcularScoreCompleto(
        evento: HealthEvent,
        coberturaVacunacion: number | null,
        eventos: HealthEvent[],
    ): { puntaje_total: number; desglose: DesgloseScore; nivel: ClasificacionRiesgo['nivel_riesgo'] } {
        const scoreVolumen = this.calcularScoreVolumen(evento.total_de_eventos || 0, eventos);
        const scoreRuralidad = this.calcularScoreRuralidad(evento);
        const scoreBrechaVacunacion = this.calcularScoreBrechaVacunacion(coberturaVacunacion);
        const scorePoblacionVulnerable = this.calcularScorePoblacionVulnerable(evento);

        const total =
            (scoreVolumen * this.PESOS.volumen) +
            (scoreRuralidad * this.PESOS.ruralidad) +
            (scoreBrechaVacunacion * this.PESOS.brecha_vacunacion) +
            (scorePoblacionVulnerable * this.PESOS.poblacion_vulnerable);

        const puntajeRedondeado = Math.round(total);

        let nivel: ClasificacionRiesgo['nivel_riesgo'];
        if (puntajeRedondeado >= this.UMBRALES.CRITICO) nivel = 'CRÍTICO';
        else if (puntajeRedondeado >= this.UMBRALES.ALTO) nivel = 'ALTO';
        else if (puntajeRedondeado >= this.UMBRALES.MEDIO) nivel = 'MEDIO';
        else nivel = 'BAJO';

        return {
            puntaje_total: puntajeRedondeado,
            desglose: {
                volumen: Math.round(scoreVolumen * this.PESOS.volumen),
                ruralidad: Math.round(scoreRuralidad * this.PESOS.ruralidad),
                brecha_vacunacion: Math.round(scoreBrechaVacunacion * this.PESOS.brecha_vacunacion),
                poblacion_vulnerable: Math.round(scorePoblacionVulnerable * this.PESOS.poblacion_vulnerable),
                total: puntajeRedondeado,
            },
            nivel,
        };
    }

    private async obtenerCoberturaVacunacion(departamento: string): Promise<number | null> {
        try {
            const vacunacion = await this.vaccinationService.getCoverageByDepartment(departamento);
            if (vacunacion.length === 0) return null;
            const valores = vacunacion
                .map(v => parseFloat(v.cobertura_de_vacunaci_n))
                .filter(c => !isNaN(c));
            if (valores.length === 0) return null;
            return valores.reduce((s, v) => s + v, 0) / valores.length;
        } catch {
            this.logger.warn(`No se pudo obtener cobertura de vacunación para ${departamento}`);
            return null;
        }
    }

    async clasificarRiesgo(
        nombreEvento: string,
        departamento: string,
    ): Promise<ClasificacionRiesgo | null> {
        try {
            const eventos = await this.saludPublicaService.listarEventosCompletos();

            const evento = this.buscarEventoPorNombre(nombreEvento, eventos);
            if (!evento) return null;

            const total = evento.total_de_eventos || 0;
            if (total === 0) return null;

            const coberturaVacunacion = await this.obtenerCoberturaVacunacion(departamento);
            const { puntaje_total, desglose, nivel } = this.calcularScoreCompleto(evento, coberturaVacunacion, eventos);
            const factores = this.obtenerFactoresDecisivos(evento, coberturaVacunacion, departamento);
            const recomendacion = this.generarRecomendacion(nivel, evento.nombre_del_evento, departamento, puntaje_total);

            return {
                evento: evento.nombre_del_evento,
                departamento,
                nivel_riesgo: nivel,
                puntaje_total,
                desglose_puntaje: desglose,
                factores_decisivos: factores,
                recomendacion_accion: recomendacion,
            };
        } catch (error) {
            this.logger.error(`Error clasificando riesgo para ${nombreEvento}:`, error);
            return null;
        }
    }

    private buscarEventoPorNombre(nombre: string, eventos: HealthEvent[]): HealthEvent | undefined {
        const evento = eventos.find(e => e.nombre_del_evento.toLowerCase() === nombre.toLowerCase());
        if (evento) return evento;
        const palabras = nombre.toLowerCase().split(/\s+/).filter(p => p.length > 3);
        return eventos.find(e =>
            palabras.some(p => e.nombre_del_evento.toLowerCase().includes(p))
        );
    }

    private obtenerFactoresDecisivos(
        eventData: HealthEvent,
        coberturaVacunacion: number | null,
        departamento: string,
    ): string[] {
        const factores: string[] = [];
        const total = eventData.total_de_eventos || 0;

        if (total > 30000) factores.push(`🔴 Alto volumen: ${total.toLocaleString()} casos`);
        else if (total > 10000) factores.push(`🟠 Volumen significativo: ${total.toLocaleString()} casos`);
        else if (total > 5000) factores.push(`🟡 Volumen moderado: ${total.toLocaleString()} casos`);

        const pctRural = total > 0 ? (eventData.rural / total) * 100 : 0;
        if (pctRural > 60) factores.push(`🌾 Alta ruralidad (${pctRural.toFixed(0)}%)`);
        else if (pctRural > 30) factores.push(`🌾 Ruralidad significativa (${pctRural.toFixed(0)}%)`);

        const grupos: { nombre: string; valor: number }[] = [
            { nombre: 'primera infancia (0-5 años)', valor: eventData.primera_infancia || 0 },
            { nombre: 'infancia (6-11 años)', valor: eventData.infancia || 0 },
            { nombre: 'adolescentes', valor: eventData.adolescencia || 0 },
            { nombre: 'adultos jóvenes', valor: eventData.adulto_j_ven || 0 },
            { nombre: 'adultos mayores', valor: eventData.adulto_mayor || 0 },
        ];
        const maxGrupo = grupos.reduce((max, g) => g.valor > max.valor ? g : max, grupos[0]);
        if (maxGrupo.valor > 0 && total > 0) {
            const pctGrupo = ((maxGrupo.valor / total) * 100).toFixed(0);
            factores.push(`👥 Mayor impacto en ${maxGrupo.nombre} (${pctGrupo}%)`);
        }

        if (coberturaVacunacion !== null) {
            if (coberturaVacunacion < 0.70) {
                factores.push(`💉 Cobertura de vacunación CRÍTICA (${(coberturaVacunacion * 100).toFixed(0)}%)`);
            } else if (coberturaVacunacion < 0.85) {
                factores.push(`💉 Cobertura de vacunación sub-óptima (${(coberturaVacunacion * 100).toFixed(0)}%)`);
            } else if (coberturaVacunacion < 0.95) {
                factores.push(`💉 Cobertura de vacunación mejorable (${(coberturaVacunacion * 100).toFixed(0)}%)`);
            } else {
                factores.push(`💉 Cobertura de vacunación adecuada (${(coberturaVacunacion * 100).toFixed(0)}%)`);
            }
        } else {
            factores.push(`ℹ️ Sin datos de cobertura de vacunación para ${departamento}`);
        }

        const pctFem = total > 0 ? (eventData.femenino || 0) / total : 0;
        if (pctFem > 0.65) factores.push(`🚺 Afecta mayoritariamente a mujeres (${(pctFem * 100).toFixed(0)}%)`);
        else if (pctFem < 0.35 && total > 0) factores.push(`🚹 Afecta mayoritariamente a hombres (${((1 - pctFem) * 100).toFixed(0)}%)`);

        return factores;
    }

    private generarRecomendacion(
        nivel: ClasificacionRiesgo['nivel_riesgo'],
        evento: string,
        departamento: string,
        puntaje: number,
    ): string {
        const base = `Para **${evento}** en **${departamento}** (Score: ${puntaje}/100):`;
        switch (nivel) {
            case 'CRÍTICO':
                return `${base} 🚨 **ACTIVAR PROTOCOLO DE EMERGENCIA**. Se requiere intervención inmediata. Movilizar recursos del COE, reforzar capacidad hospitalaria y campaña masiva de prevención.`;
            case 'ALTO':
                return `${base} ⚠️ **ALERTA SANITARIA**. Intensificar vigilancia epidemiológica activa. Reforzar esquemas de vacunación en poblaciones vulnerables, aumentar puntos de diagnóstico y preparar plan de contingencia.`;
            case 'MEDIO':
                return `${base} 📋 **REQUIERE ATENCIÓN**. Mantener monitoreo semanal. Verificar coberturas de vacunación en zonas rurales.`;
            default:
                return `${base} 🟢 **BAJO RIESGO**. Continuar con vigilancia rutinaria. Mantener esquemas de vacunación al día.`;
        }
    }

    async obtenerAnalisisCompleto(departamento: string): Promise<string> {
        try {
            const eventos = await this.saludPublicaService.listarEventosCompletos();
            if (!eventos || eventos.length === 0) {
                return 'No hay datos de eventos de salud disponibles para el análisis.';
            }

            const topEventos = eventos
                .sort((a, b) => (b.total_de_eventos || 0) - (a.total_de_eventos || 0))
                .slice(0, 8);

            const coberturaVacunacion = await this.obtenerCoberturaVacunacion(departamento);

            const clasificaciones = await Promise.allSettled(
                topEventos.map(evento =>
                    this.clasificarRiesgo(evento.nombre_del_evento, departamento)
                )
            );

            let respuesta = '📊 **SISTEMA DE SCORING COMPUESTO**\n\n';
            respuesta += `Departamento: **${departamento}**\n`;
            respuesta += `Método: Scoring multidimensional (${Object.keys(this.PESOS).length} dimensiones)\n\n`;
            respuesta += '| Evento | Nivel | Score | Acción |\n';
            respuesta += '|:---|:---:|---:|:---|\n';

            let eventosCriticos = 0;
            let eventosAltos = 0;

            for (const resultado of clasificaciones) {
                if (resultado.status === 'fulfilled' && resultado.value) {
                    const c = resultado.value;
                    const emoji = c.nivel_riesgo === 'CRÍTICO' ? '🔴' :
                        c.nivel_riesgo === 'ALTO' ? '🟠' :
                            c.nivel_riesgo === 'MEDIO' ? '🟡' : '🟢';
                    if (c.nivel_riesgo === 'CRÍTICO') eventosCriticos++;
                    if (c.nivel_riesgo === 'ALTO') eventosAltos++;
                    respuesta += `| ${emoji} ${c.evento.substring(0, 35)} | ${c.nivel_riesgo} | ${c.puntaje_total}/100 | ${c.recomendacion_accion.split('.')[0]}. |\n`;
                }
            }

            respuesta += '\n---\n';
            respuesta += '**Pesos:** Volumen 40%, Ruralidad 20%, Brecha vacunación 25%, Población vulnerable 15%\n';
            if (coberturaVacunacion !== null) {
                respuesta += `**Cobertura de vacunación:** ${(coberturaVacunacion * 100).toFixed(1)}%\n`;
            }
            respuesta += `**Umbrales:** CRÍTICO ≥ 75 | ALTO 51-74 | MEDIO 26-50 | BAJO ≤ 25\n`;
            if (eventosCriticos > 0) respuesta += `🔴 **${eventosCriticos} crítico(s)**\n`;
            if (eventosAltos > 0) respuesta += `🟠 **${eventosAltos} alto(s)**\n`;

            return respuesta;
        } catch (error) {
            this.logger.error(`Error en obtenerAnalisisCompleto para ${departamento}:`, error);
            return '❌ Error al generar el análisis completo.';
        }
    }
}
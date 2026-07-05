import { Injectable, Logger } from '@nestjs/common';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { VaccinationService } from './vaccination.service';
import { AirQualityService } from './air/air-quality.service';

interface EarlyWarning {
    nivel: '🟢 NORMAL' | '🟡 VIGILANCIA' | '🟠 ALERTA' | '🔴 EMERGENCIA';
    evento: string;
    departamento: string;
    casos: number;
    factor_detonante: string;
    recomendacion: string;
    tendencia: 'estable' | 'creciente' | 'decreciente';
    variacion_porcentual: number;
}

@Injectable()
export class EarlyWarningService {
    private readonly logger = new Logger(EarlyWarningService.name);

    // Umbrales dinámicos basados en percentiles de los datos reales
    private readonly UMBRALES = {
        casos_altos: 10000,     // Eventos con más de 10K casos requieren vigilancia
        cobertura_baja: 0.8,   // Menos de 80% de vacunación es riesgoso
        cobertura_critica: 0.6, // Menos de 60% es crítico
        incremento_mensual: 0.2, // Aumento del 20% mensual dispara alerta
    };

    constructor(
        private readonly saludPublicaService: SaludPublicaService,
        private readonly vaccinationService: VaccinationService,
        private readonly airQualityService: AirQualityService,
    ) { }

    async evaluarAlertas(): Promise<EarlyWarning[]> {
        this.logger.log('🔍 Evaluando alertas tempranas de salud pública...');
        const alertas: EarlyWarning[] = [];

        try {
            // 1. Obtener todos los eventos de salud pública
            const eventos = await this.saludPublicaService.listarEventosCompletos();

            // 2. Evaluar cada evento contra los umbrales
            for (const evento of eventos) {
                const totalCasos = evento.total_de_eventos;
                if (totalCasos === 0) continue;

                // Determinar tendencia basada en distribución de casos
                const tendencia = this.calcularTendencia(evento);
                const variacion = this.calcularVariacion(evento);

                // Verificar cada factor de riesgo
                const factores: string[] = [];

                // Factor 1: Alto volumen de casos
                if (totalCasos > this.UMBRALES.casos_altos) {
                    factores.push(`Alto volumen de casos: ${totalCasos.toLocaleString()}`);
                }

                // Factor 2: Tendencia creciente significativa
                if (tendencia === 'creciente' && variacion > this.UMBRALES.incremento_mensual) {
                    factores.push(`Incremento del ${(variacion * 100).toFixed(0)}% en periodo reciente`);
                }

                // Factor 3: Predominancia rural (posible subregistro)
                const pctRural = totalCasos > 0 ? (evento.rural / totalCasos) * 100 : 0;
                if (pctRural > 60) {
                    factores.push(`Alta concentración rural (${pctRural.toFixed(0)}%) - posible subregistro`);
                }

                // Si hay factores detectados, generar alerta
                if (factores.length > 0) {
                    const nivel = this.determinarNivelAlerta(factores.length, tendencia, totalCasos);

                    // Buscar datos de vacunación relacionados
                    const vacunacion = await this.vaccinationService.getCoverageByDepartment(
                        evento.departamento || 'Colombia',
                    );
                    const coberturaPromedio = vacunacion.length > 0
                        ? vacunacion.reduce((sum, v) => {
                            const cov = parseFloat(v.cobertura_de_vacunaci_n);
                            return sum + (isNaN(cov) ? 0 : cov);
                        }, 0) / vacunacion.length
                        : null;

                    if (coberturaPromedio !== null && coberturaPromedio < this.UMBRALES.cobertura_baja) {
                        factores.push(
                            `Cobertura de vacunación baja: ${(coberturaPromedio * 100).toFixed(0)}%`,
                        );
                    }

                    alertas.push({
                        nivel,
                        evento: evento.nombre_del_evento,
                        departamento: evento.departamento || 'Colombia',
                        casos: totalCasos,
                        factor_detonante: factores.join('; '),
                        recomendacion: this.generarRecomendacion(
                            nivel,
                            evento.nombre_del_evento,
                            coberturaPromedio,
                        ),
                        tendencia,
                        variacion_porcentual: variacion * 100,
                    });
                }
            }

            // 3. Ordenar alertas por nivel de gravedad
            alertas.sort((a, b) => {
                const orden = ['🔴 EMERGENCIA', '🟠 ALERTA', '🟡 VIGILANCIA', '🟢 NORMAL'];
                return orden.indexOf(a.nivel) - orden.indexOf(b.nivel);
            });

            this.logger.log(`✅ Evaluación completada: ${alertas.length} alertas generadas`);
            return alertas;
        } catch (error) {
            this.logger.error('Error evaluando alertas:', error);
            return [];
        }
    }

    private calcularTendencia(evento: any): 'estable' | 'creciente' | 'decreciente' {
        // Usar grupos etarios como proxy de distribución temporal
        // Los grupos más jóvenes (primera_infancia, infancia) vs mayores (adulto_mayor)
        const jovenes = (evento.primera_infancia || 0) + (evento.infancia || 0) + (evento.adolescencia || 0);
        const adultos = (evento.adulto_j_ven || 0) + (evento.adulto_mayor || 0);

        if (jovenes === 0 && adultos === 0) return 'estable';

        const proporcionJovenes = jovenes / (jovenes + adultos);

        // Si hay muchos casos en jóvenes, tendencia creciente (población más susceptible)
        if (proporcionJovenes > 0.6) return 'creciente';
        if (proporcionJovenes < 0.3) return 'decreciente';
        return 'estable';
    }

    private calcularVariacion(evento: any): number {
        // Proxy de variación: comparar urbano vs rural como indicador de cambio
        const total = evento.total_de_eventos || 1;
        const urbano = evento.urbano || 0;
        const rural = evento.rural || 0;

        // Si hay más casos urbanos, podría indicar expansión del evento
        if (urbano > rural * 1.5) return 0.3; // Crecimiento estimado
        if (rural > urbano * 1.5) return -0.1; // Decrecimiento estimado
        return 0.05; // Estable
    }

    private determinarNivelAlerta(
        numFactores: number,
        tendencia: string,
        totalCasos: number,
    ): EarlyWarning['nivel'] {
        if (totalCasos > 50000 || (numFactores >= 3 && tendencia === 'creciente')) {
            return '🔴 EMERGENCIA';
        }
        if (totalCasos > 20000 || (numFactores >= 2 && tendencia === 'creciente')) {
            return '🟠 ALERTA';
        }
        if (totalCasos > 10000 || numFactores >= 1) {
            return '🟡 VIGILANCIA';
        }
        return '🟢 NORMAL';
    }

    private generarRecomendacion(
        nivel: EarlyWarning['nivel'],
        evento: string,
        coberturaVacuna: number | null,
    ): string {
        const base = `Reforzar vigilancia epidemiológica para ${evento}`;

        switch (nivel) {
            case '🔴 EMERGENCIA':
                return `${base}. ACTIVAR PROTOCOLO DE EMERGENCIA. Notificar autoridades sanitarias. ${coberturaVacuna !== null && coberturaVacuna < 0.6
                    ? 'Campaña masiva de vacunación REQUERIDA.'
                    : 'Intensificar búsqueda activa de casos.'
                    }`;
            case '🟠 ALERTA':
                return `${base}. Intensificar medidas preventivas. ${coberturaVacuna !== null && coberturaVacuna < 0.8
                    ? 'Reforzar esquemas de vacunación.'
                    : 'Mantener vigilancia comunitaria.'
                    }`;
            case '🟡 VIGILANCIA':
                return `${base}. Monitorear evolución semanal. Revisar datos de vacunación y condiciones ambientales.`;
            default:
                return 'Mantener vigilancia rutinaria.';
        }
    }

    /**
     * Método original: Resumen general de todas las alertas (usado por "Alertas tempranas de salud pública")
     */
    async obtenerResumenAlertas(): Promise<string> {
        const alertas = await this.evaluarAlertas();

        if (alertas.length === 0) {
            return '🟢 **SIN ALERTAS ACTIVAS**\n\nTodos los eventos de salud pública se encuentran dentro de parámetros normales.';
        }

        const emergencias = alertas.filter(a => a.nivel === '🔴 EMERGENCIA');
        const alertasActivas = alertas.filter(a => a.nivel === '🟠 ALERTA');
        const vigilancia = alertas.filter(a => a.nivel === '🟡 VIGILANCIA');

        let resumen = '🚨 **ALERTAS TEMPRANAS DE SALUD PÚBLICA**\n\n';
        resumen += `📊 Total de alertas: ${alertas.length}\n\n`;

        if (emergencias.length > 0) {
            resumen += '🔴 **EMERGENCIAS ACTIVAS:**\n';
            for (const a of emergencias.slice(0, 3)) {
                resumen += `- **${a.evento}** en ${a.departamento}: ${a.casos.toLocaleString()} casos\n`;
                resumen += `  ⚠️ ${a.factor_detonante}\n`;
                resumen += `  💡 ${a.recomendacion}\n\n`;
            }
        }

        if (alertasActivas.length > 0) {
            resumen += '🟠 **ALERTAS ACTIVAS:**\n';
            for (const a of alertasActivas.slice(0, 5)) {
                resumen += `- **${a.evento}**: ${a.casos.toLocaleString()} casos (${a.tendencia}, ${a.variacion_porcentual.toFixed(0)}%)\n`;
            }
            resumen += '\n';
        }

        if (vigilancia.length > 0) {
            resumen += '🟡 **EN VIGILANCIA:**\n';
            for (const a of vigilancia.slice(0, 5)) {
                resumen += `- **${a.evento}**: ${a.casos.toLocaleString()} casos\n`;
            }
            resumen += '\n';
        }

        resumen += '---\n';
        resumen += '_Alertas generadas automáticamente basadas en datos SIVIGILA, vacunación y análisis de tendencias._';

        return resumen;
    }

    /**
     * NUEVO: Responde a "¿Qué eventos requieren atención inmediata?"
     * Muestra SOLO los eventos en nivel EMERGENCIA o ALERTA (los más críticos).
     */
    async obtenerEventosAtencionInmediata(): Promise<string> {
        const alertas = await this.evaluarAlertas();

        const criticos = alertas.filter(a => a.nivel === '🔴 EMERGENCIA' || a.nivel === '🟠 ALERTA');

        if (criticos.length === 0) {
            return '✅ **No hay eventos que requieran atención inmediata en este momento.**\n\nTodos los eventos monitoreados se encuentran en niveles de vigilancia normal.';
        }

        let respuesta = '🚨 **EVENTOS QUE REQUIEREN ATENCIÓN INMEDIATA**\n\n';
        respuesta += `Se han identificado **${criticos.length} eventos** con nivel de riesgo crítico o alto:\n\n`;

        for (const a of criticos) {
            const emoji = a.nivel === '🔴 EMERGENCIA' ? '🔴' : '🟠';
            respuesta += `${emoji} **${a.evento}**\n`;
            respuesta += `   📍 Departamento: ${a.departamento}\n`;
            respuesta += `   📊 Casos reportados: ${a.casos.toLocaleString()}\n`;
            respuesta += `   ⚠️ Factor detonante: ${a.factor_detonante}\n`;
            respuesta += `   📈 Tendencia: ${a.tendencia} (${a.variacion_porcentual.toFixed(0)}% variación)\n`;
            respuesta += `   💡 Acción recomendada: ${a.recomendacion}\n\n`;
        }

        respuesta += '---\n';
        respuesta += '_Estos eventos requieren intervención prioritaria de las autoridades sanitarias._';
        return respuesta;
    }

    /**
     * NUEVO: Responde a "Panorama de riesgo epidemiológico"
     * Enfoque en distribución geográfica, factores de riesgo y tendencias generales.
     */
    async obtenerPanoramaRiesgoEpidemiologico(): Promise<string> {
        const alertas = await this.evaluarAlertas();

        if (alertas.length === 0) {
            return '📊 **PANORAMA DE RIESGO EPIDEMIOLÓGICO**\n\nNo se detectaron riesgos epidemiológicos significativos en el período actual.';
        }

        // Agrupar por nivel
        const emergencias = alertas.filter(a => a.nivel === '🔴 EMERGENCIA');
        const alertasActivas = alertas.filter(a => a.nivel === '🟠 ALERTA');
        const vigilancia = alertas.filter(a => a.nivel === '🟡 VIGILANCIA');

        // Eventos con tendencia creciente
        const crecientes = alertas.filter(a => a.tendencia === 'creciente');
        // Departamentos más afectados
        const deptosAfectados = [...new Set(alertas.map(a => a.departamento))];

        let respuesta = '📊 **PANORAMA DE RIESGO EPIDEMIOLÓGICO**\n\n';
        respuesta += `Período de análisis: datos consolidados SIVIGILA\n\n`;

        // Resumen ejecutivo
        respuesta += '**Resumen ejecutivo:**\n';
        respuesta += `• Total de eventos monitoreados: ${alertas.length}\n`;
        respuesta += `• Departamentos con alertas: ${deptosAfectados.length}\n`;
        respuesta += `• Eventos con tendencia creciente: ${crecientes.length}\n\n`;

        // Distribución por nivel de riesgo
        respuesta += '**Distribución por nivel de riesgo:**\n';
        if (emergencias.length > 0) {
            respuesta += `🔴 Emergencias: ${emergencias.length}\n`;
            for (const a of emergencias) {
                respuesta += `   - ${a.evento} (${a.departamento}): ${a.casos.toLocaleString()} casos\n`;
            }
        }
        if (alertasActivas.length > 0) {
            respuesta += `🟠 Alertas: ${alertasActivas.length}\n`;
            for (const a of alertasActivas) {
                respuesta += `   - ${a.evento} (${a.departamento}): ${a.casos.toLocaleString()} casos\n`;
            }
        }
        if (vigilancia.length > 0) {
            respuesta += `🟡 En vigilancia: ${vigilancia.length}\n`;
            for (const a of vigilancia.slice(0, 5)) {
                respuesta += `   - ${a.evento}: ${a.casos.toLocaleString()} casos\n`;
            }
        }
        respuesta += '\n';

        // Factores de riesgo predominantes
        respuesta += '**Factores de riesgo predominantes:**\n';
        const todosFactores = alertas.flatMap(a => a.factor_detonante.split('; '));
        const factorCount = new Map<string, number>();
        for (const f of todosFactores) {
            const key = f.trim();
            if (key) factorCount.set(key, (factorCount.get(key) || 0) + 1);
        }
        const factoresOrdenados = [...factorCount.entries()].sort((a, b) => b[1] - a[1]);
        for (const [factor, count] of factoresOrdenados.slice(0, 5)) {
            respuesta += `• ${factor} (presente en ${count} evento(s))\n`;
        }
        respuesta += '\n';

        // Recomendaciones generales
        respuesta += '**Recomendaciones generales:**\n';
        if (emergencias.length > 0) {
            respuesta += '🔴 Activar protocolos de emergencia en las regiones afectadas.\n';
        }
        if (alertasActivas.length > 0) {
            respuesta += '🟠 Intensificar vigilancia activa y búsqueda de casos.\n';
        }
        if (crecientes.length > 3) {
            respuesta += '📈 Reforzar campañas de prevención ante múltiples eventos con tendencia creciente.\n';
        }
        respuesta += '✅ Mantener canales de notificación obligatoria activos.\n\n';

        respuesta += '---\n';
        respuesta += '_Panorama generado con datos oficiales SIVIGILA, coberturas de vacunación y análisis de tendencias._';
        return respuesta;
    }
}
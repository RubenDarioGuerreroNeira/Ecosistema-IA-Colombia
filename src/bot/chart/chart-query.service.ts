import { Injectable } from '@nestjs/common';
import { ChartService } from './chart.service';
import { AirQualityService } from '../air/air-quality.service';
import { CaliHealthService } from '../cali/cali-health.service';
import { MentalHealthService } from '../mental-health/mental-health.service';
import { HealthDataService } from '../health-data.service';
import { VaccinationService } from '../vaccination.service';
import { normalizeString } from '../../shared/health-utils';

export interface ChartQueryResult {
    success: boolean;
    message?: string;
    photo?: string;
    caption?: string;
    needsLocation?: boolean;
    intent?: 'chart_air_quality' | 'chart_vaccination';
}

@Injectable()
export class ChartQueryService {
    constructor(
        private readonly chartService: ChartService,
        private readonly airQualityService: AirQualityService,
        private readonly caliHealthService: CaliHealthService,
        private readonly mentalHealthService: MentalHealthService,
        private readonly healthDataService: HealthDataService,
        private readonly vaccinationService: VaccinationService,
    ) { }

    async processChartQuery(text: string, region?: string): Promise<ChartQueryResult> {
        const norm = normalizeString(text);

        // --- Helper para detectar si la consulta es explícitamente sobre aire/ambiente ---
        const isAirQuery = (norm.includes('calidad del aire') || norm.includes('aire') || norm.includes('ambiental') || norm.includes('contaminacion')) &&
            (norm.includes('grafic') || norm.includes('visual') || norm.includes('indicador') || norm.includes('mostrar') || norm.includes('muestra'));

        // 1. Calidad del Aire (solo si la consulta menciona explícitamente aire)
        if (isAirQuery) {
            if (!region) {
                return {
                    success: true,
                    message: '☁️ ¿De qué **municipio o departamento** deseas visualizar la calidad del aire? (Ej: "Graficar aire en Cali")',
                    needsLocation: true,
                    intent: 'chart_air_quality',
                };
            }
            const aireData = await this.airQualityService.getAirQualityByMunicipio(region);
            if (aireData && aireData.length > 0) {
                const uniqueVariables = Array.from(new Map(aireData.map((v: any) => [v.variable, v])).values());
                const variables = uniqueVariables.slice(0, 6);
                const labels = variables.map((v: any) => v.variable);
                const data = variables.map((v: any) => parseFloat(v.promedio));
                const chartUrl = this.chartService.generateBarChart(labels, data, `Calidad del Aire en ${region} (Promedios)`);
                return { success: true, photo: chartUrl, caption: `🍃 Indicadores ambientales para ${region}.` };
            }
            return { success: false };
        }

        // 2. Cali Health - Solo cuando se piden EXPRESAMENTE servicios de salud en Cali
        const serviciosKeywords = ['servicios', 'clinicas', 'hospitales', 'prestadores', 'ips'];
        const isCaliServicesQuery = norm.includes('servicios') ||
            (region === 'CALI' && serviciosKeywords.some(k => norm.includes(k)));
        if (isCaliServicesQuery) {
            const stats = this.caliHealthService.getStatsByCategory();
            const chartUrl = this.chartService.generatePieChart(stats.labels, stats.data, 'Servicios de Salud en Cali (Top Categorías)');
            return { success: true, photo: chartUrl, caption: '📊 Distribución de servicios de salud en Cali.' };
        }

        // 3. Salud Mental
        const mentalKeywords = ['grafico de salud mental', 'mental', 'psicologia', 'psiquiatria', 'depresion', 'ansiedad', 'trastorno', 'esquizo', 'bipol', 'demencia', 'delirio', 'psicosis', 'mania', 'spa'];
        if (mentalKeywords.some(k => norm.includes(k)) && (norm.includes('grafic') || norm.includes('visual') || norm.includes('top') || norm.includes('mas frecuentes') || norm.includes('distribucion'))) {
            const top = await this.mentalHealthService.getTopDiagnoses(6);
            const labels = top.map(d => d.diagnostico_ingreso.length > 20 ? d.diagnostico_ingreso.substring(0, 17) + '...' : d.diagnostico_ingreso);
            const data = top.map(d => d.total);
            const chartUrl = this.chartService.generateBarChart(labels, data, 'Top Diagnósticos de Salud Mental (Colombia)');
            return { success: true, photo: chartUrl, caption: '🧠 Diagnósticos de salud mental más frecuentes.' };
        }

        // 4. Top Eventos Salud Pública
        if ((norm.includes('salud publica'))) {
            const top = await this.healthDataService.getTopEvents(6);
            const labels = top.map(e => e.nombre_del_evento.length > 20 ? e.nombre_del_evento.substring(0, 17) + '...' : e.nombre_del_evento);
            const data = top.map(e => e.total_de_eventos);
            const chartUrl = this.chartService.generateBarChart(labels, data, 'Top Eventos de Interés en Salud Pública (Colombia)');
            return { success: true, photo: chartUrl, caption: '🔬 Eventos con mayor incidencia según SIVIGILA.' };
        }

        // 5. Distribución por sexo/zona/tendencia para eventos específicos
        const eventKeywords = ['tuberculosis', 'dengue', 'zika', 'malaria', 'sarampion', 'hepatitis', 'rabia'];
        const detectedEvent = eventKeywords.find(k => norm.includes(k));
        if (detectedEvent) {
            const stats = await this.healthDataService.getStatsForEvent(detectedEvent);
            if (stats) {
                // Subcategorías específicas
                if (norm.includes('sexo') || norm.includes('genero')) {
                    const chartUrl = this.chartService.generatePieChart(['Femenino', 'Masculino'], [stats.femenino, stats.masculino], `Distribución por Sexo: ${stats.nombre_del_evento}`);
                    return { success: true, photo: chartUrl, caption: `👥 Proporción por sexo de ${stats.nombre_del_evento}.` };
                }
                if (norm.includes('zona') || norm.includes('urbano') || norm.includes('rural')) {
                    const chartUrl = this.chartService.generatePieChart(['Urbano', 'Rural'], [stats.urbano, stats.rural], `Distribución por Zona: ${stats.nombre_del_evento}`);
                    return { success: true, photo: chartUrl, caption: `📍 Impacto en áreas urbanas vs rurales.` };
                }
                if (norm.includes('tendencia') || norm.includes('historico') || norm.includes('evolucion')) {
                    const series = await this.healthDataService.getTemporalSeries(detectedEvent);
                    const labels = series.map(s => s.date.toLocaleDateString('es-CO', { month: 'short' }));
                    const data = series.map(s => s.cases);
                    const chartUrl = this.chartService.generateLineChart(labels, data, `Tendencia de ${stats.nombre_del_evento} (6 meses)`);
                    return { success: true, photo: chartUrl, caption: `📈 Evolución de casos de ${stats.nombre_del_evento}.` };
                }

                // --- GRÁFICO GENERAL POR DEFECTO para eventos específicos ---
                const chartUrl = this.chartService.generateBarChart(
                    ['Femenino', 'Masculino'],
                    [stats.femenino, stats.masculino],
                    `Casos de ${stats.nombre_del_evento} en Colombia por Sexo`,
                );
                return {
                    success: true,
                    photo: chartUrl,
                    caption: `📊 Distribución de ${stats.nombre_del_evento} por sexo. Usa "gráfico de ${detectedEvent} por zona/tendencia" para más detalles.`,
                };
            }
        }

        // 6. Vacunación
        if (norm.includes('vacun')) {
            if (!region) {
                const deptos = await this.vaccinationService.getAllDepartament();
                const listaDeptos = deptos.map(d => `• **${d}**`).join('\n');
                return {
                    success: true,
                    message: `💉 Puedo generar gráficos de la  información de vacunación de los siguientes departamentos:\n\n${listaDeptos}\n\n¿De cuál deseas ver la cobertura? (Ej: "Graficar vacunas en Antioquia")`,
                    needsLocation: true,
                    intent: 'chart_vaccination',
                };
            }
            const coberturas = await this.vaccinationService.getCoverageByDepartment(region);
            if (coberturas && coberturas.length > 0) {
                const dataMap = new Map<string, number>();
                coberturas.forEach(c => {
                    const rawVal = parseFloat(c.cobertura_de_vacunaci_n);
                    const val = rawVal <= 1 ? rawVal * 100 : rawVal;
                    if (!isNaN(val)) dataMap.set(c.biol_gico, val);
                });
                const sorted = Array.from(dataMap.entries()).sort(([, a], [, b]) => b - a).slice(0, 8);
                const labels = sorted.map(([l]) => l);
                const data = sorted.map(([, d]) => d);
                const chartUrl = this.chartService.generatePieChart(labels, data, `Cobertura de Vacunación en ${region} (%)`);
                return { success: true, photo: chartUrl, caption: `💉 Coberturas de vacunación en ${region}.` };
            }
            return { success: false, message: `No se encontró información de vacunación en ${region}.` };
        }

        return { success: false };
    }
}
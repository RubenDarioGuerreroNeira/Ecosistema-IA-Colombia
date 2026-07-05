import { Injectable, Logger } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { SaludAnaliticaService } from '../analytic-health/salud-analitica.service';
import { PredictionService } from '../prediction.service';
import { VaccinationService } from '../vaccination.service';
import { AirQualityService } from '../air/air-quality.service';
import { SaludPublicaService } from '../public-health/salud-publica.service';

@Injectable()
export class RiskQuestionsService {
    private readonly logger = new Logger(RiskQuestionsService.name);

    constructor(
        private readonly saludAnaliticaService: SaludAnaliticaService,
        private readonly predictionService: PredictionService,
        private readonly vaccinationService: VaccinationService,
        private readonly airQualityService: AirQualityService,
        private readonly saludPublicaService: SaludPublicaService,
    ) { }

    /**
     * Retorna la lista de eventos disponibles dinámicamente desde SIVIGILA.
     * Usa listarEventos() que ya retorna string[] directamente desde el XML.
     */
    private async getAvailableEvents(): Promise<string[]> {
        try {
            const eventos = await this.saludPublicaService.listarEventos();
            if (!eventos || eventos.length === 0) return [];
            return eventos
                .filter(n => n && n.length > 0)
                .slice(0, 20); // Limitar a 20 para no saturar
        } catch (error) {
            this.logger.warn(`Error obteniendo eventos disponibles: ${error.message}`);
            return [];
        }
    }

    /**
     * Retorna las ubicaciones disponibles dinámicamente desde vacunación y calidad del aire.
     */
    private async getAvailableLocations(): Promise<string[]> {
        try {
            const [vaccinationDeptos, airQualityMunis] = await Promise.all([
                this.vaccinationService.getAllDepartament(),
                this.airQualityService.getAllMunicipios(),
            ]);
            const combined = [...vaccinationDeptos, ...airQualityMunis];
            const unique = Array.from(new Set(combined.map(l => l.trim())))
                .filter(l => l.length > 2);
            return unique.slice(0, 12); // Limitar a 12 para no saturar
        } catch (error) {
            this.logger.warn(`Error obteniendo ubicaciones disponibles: ${error.message}`);
            return [];
        }
    }

    /**
     * Genera el mensaje de lista de eventos y ubicaciones disponibles usando datos dinámicos.
     */
    async getAvailableQuestions(): Promise<string> {
        const [events, locations] = await Promise.all([
            this.getAvailableEvents(),
            this.getAvailableLocations(),
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

    /**
     * Procesa una consulta de texto y retorna una respuesta formateada.
     * Retorna null si la consulta no es de tipo risk analysis.
     */
    async processRiskQuery(
        text: string,
        region?: string,
    ): Promise<{ respuesta: string; tipo: string; event?: string } | null> {
        const norm = normalizeString(text);

        // Detectar si pregunta sobre capacidades del servicio de predicción de riesgos
        if (
            norm.includes('epidemiologico') ||
            norm.includes('eventos epidemiologicos') ||
            norm.includes('riesgos epidemiologicos') ||
            norm.includes('prediccion de riesgos epidemiologicos') ||
            norm.includes('epidemiologicos') ||
            (norm.includes('que') && norm.includes('riesgos') && norm.includes('epidemiologicos')) ||
            (norm.includes('que') && norm.includes('riesgos') && norm.includes('epidemilogicos') && norm.includes('predecir')) ||
            (norm.includes('que') && norm.includes('riesgo') && norm.includes('predecir')) ||
            (norm.includes('riesgos') && norm.includes('epidemias') && norm.includes('puedes predecir')) ||
            (norm.includes('puedes predecir') && norm.includes('epidemias'))
        ) {
            const respuesta = await this.getAvailableQuestions();
            return { respuesta, tipo: 'listado' };
        }

        return null;
    }

    /**
     * Ejecuta el análisis de riesgo para un evento en una región usando PredictionService.
     */
    async analizarRiesgo(event: string, region: string): Promise<string> {
        try {
            return await this.predictionService.predictRisk(region, event);
        } catch (error) {
            this.logger.error(`Error en analizarRiesgo: ${error.message}`);
            return `⚠️ No se pudo realizar la predicción de riesgo para **${event}** en **${region}**.`;
        }
    }
}
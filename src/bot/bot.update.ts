import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Logger } from '@nestjs/common';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali/cali-health.service';
import { BoyacaHealthService } from './boyaca/boyaca-health.service';
import { YopalHealthService } from './yopal/yopal-health.service';
import { AntioquiaHealthService } from './antioquia/antioquia-health.service';
import { SaludPublicaService } from './public-health/salud-publica.service';
import { SaludAnaliticaService } from './analytic-health/salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService, Intencion } from './sexual-health/sexual-health.service';
import { AirQualityService } from './air/air-quality.service';
import { PredictionService } from './prediction.service';
import { ChartService } from './chart/chart.service';
import { VaccinationService } from './vaccination.service';
import { normalizeString } from '../shared/health-utils';
import { escapeMarkdown, normalizeText } from './utils/text-normalizer';
import {
    YOPAL_KEYWORDS,
    RISK_ANALYSIS_KEYWORDS,
    ENVIRONMENTAL_KEYWORDS,
    CYCLE_KEYWORDS,
    GRAPHIC_KEYWORDS,
    DEPARTMENTS,
    CAPITALS,
    MAJOR_VALLE_TOWNS,
    OTHER_REGION_NAMES,
    BYPASS_MARKERS,
    GREETING_REGEX,
} from './constants/keywords';
import {
    MentalHealthService,
    MentalHealthEvent,
    MentalHealthEventWithTotal,
} from './mental-health/mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { RiskQuestionsService } from './questions/risk-questions.service';
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
import { ChartQueryService } from './chart/chart-query.service';
import { GraphicsQuestionsService } from './questions/graphics-questions.service';
import { EarlyWarningService } from './early-warning.service';
import { AdvancedPredictionService } from './advanced-prediction.service';
import { MlPredictionService } from './ml-prediction.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';

// ─── Type definitions ──────────────────────────────────────────────────────────
interface UserState {
    intent: string;
    data?: unknown;
}

interface HealthEvent {
    nombre_del_evento: string;
    [key: string]: unknown;
}

interface ChartQueryResult {
    success: boolean;
    needsLocation?: boolean;
    message?: string;
    intent?: string;
    photo?: string;
    caption?: string;
}

interface StructuralQueryResult {
    handled: boolean;
    needsLocation?: boolean;
    response?: string;
    intent?: string;
}

interface ProviderSearchResult {
    handled: boolean;
    needsLocation?: boolean;
    response?: string;
    intent?: string;
}

interface AirQualityItem {
    variable: string;
    promedio: number;
    unidades: string;
    [key: string]: unknown;
}

interface MentalHealthComparison {
    d1: { diagnostico_ingreso: string; total: number };
    d2: { diagnostico_ingreso: string; total: number };
}

interface AgeDistribution {
    menor_a_1: number;
    de_1_a_4: number;
    de_5_a_9: number;
    de_10_a_14: number;
    de_15_a_19: number;
    de_20_a_49: number;
    de_50_a_64: number;
    _65_y_mas: number;
    total_global: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 4000;
const RESPONSE_NO_INFORMATION = `Lo siento, no tengo información sobre ese tema en mi base de datos actual. 

Mi especialidad es la salud pública en Colombia. Puedo ayudarte con:
1. 🏢 Buscar hospitales, clínicas y prestadores de servicios de salud en diversas ciudades.
2. 🔬 Consultar estadísticas oficiales (SIVIGILA) y análisis de riesgo de enfermedades.
3. 🧠 Recibir orientación sobre salud mental y perfiles de riesgo.
4. 🛡️ Acceder a protocolos de emergencia.
5. ❤️ Obtener guías sobre salud sexual y reproductiva.

¿Te gustaría consultar alguna de estas áreas?`;

const GENERIC_RISK_LIST = `🧠 **Salud Mental (CIE-10):**
- Episodios depresivos (graves, moderados)
- Trastornos de ansiedad (mixtos, fóbicos)
- Trastorno Afectivo Bipolar
- Esquizofrenia y trastornos psicóticos
- Consumo de sustancias psicoactivas (SPA)

🔬 **Salud Pública (SIVIGILA):**
• _Enfermedades Transmisibles:_ Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Varicela, Hepatitis A, B y C
• _Eventos de Violencia:_ Violencia de género e intrafamiliar, agresiones por animales (rabia)
• _Otros:_ Desnutrición aguda, intento de suicidio, defectos congénitos, intoxicaciones, accidentes ofídicos

❤️ **Salud Sexual y Reproductiva:**
- Prevención y derechos en VIH/SIDA
- Sífilis (incluyendo gestacional y congénita)
- Cáncer de cuello uterino y mama (VPH)
- Métodos anticonceptivos y derechos reproductivos`;

const RISK_EVENTS = [
    'Dengue',
    'Zika',
    'Chikungunya',
    'Malaria',
    'Tuberculosis',
    'Hepatitis A',
    'Hepatitis B',
    'Hepatitis C',
    'Sarampión',
    'Rubeola',
    'Tos Ferina',
    'Fiebre Amarilla',
    'Leishmaniasis',
    'Chagas',
    'Intoxicación por alimentos',
    'Accidente ofídico',
    'Ansiedad',
    'Depresión',
    'Estrés',
    'Trastorno mental',
];

@Update()
export class BotUpdate {
    private readonly logger = new Logger(BotUpdate.name);
    private userState = new Map<number, UserState>();

    constructor(
        private readonly genkitService: GenkitService,
        private readonly userService: UserService,
        private readonly statsService: StatsService,
        private readonly boyacaHealthService: BoyacaHealthService,
        private readonly caliHealthService: CaliHealthService,
        private readonly yopalHealthService: YopalHealthService,
        private readonly antioquiaHealthService: AntioquiaHealthService,
        private readonly saludPublicaService: SaludPublicaService,
        private readonly saludAnaliticaService: SaludAnaliticaService,
        private readonly healthStatsService: HealthStatsService,
        private readonly healthDataService: HealthDataService,
        private readonly sexualHealthService: SexualHealthService,
        private readonly airQualityService: AirQualityService,
        private readonly predictionService: PredictionService,
        private readonly chartService: ChartService,
        private readonly mentalHealthService: MentalHealthService,
        private readonly mentalHealthQuestionsService: MentalHealthQuestionsService,
        private readonly vaccinationService: VaccinationService,
        private readonly saludPublicaQuestionsService: SaludPublicaQuestionsService,
        private readonly yopalQuestionsService: YopalQuestionsService,
        private readonly riskQuestionsService: RiskQuestionsService,
        private readonly airQualityQuestionsService: AirQualityQuestionsService,
        private readonly chartQueryService: ChartQueryService,
        private readonly graphicsQuestionsService: GraphicsQuestionsService,
        private readonly earlyWarningService: EarlyWarningService,
        private readonly advancedPredictionService: AdvancedPredictionService,
        private readonly mlPredictionService: MlPredictionService,
        private readonly predictiveQuestionsService: PredictiveQuestionsService,
    ) { }

    // ─── Salud Pública Questions ────────────────────────────────────────────────
    private async handleSaludPublicaQuestions(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);

        const isPublicHealthQuery =
            norm.includes('eventos') ||
            norm.includes('salud publica') ||
            norm.includes('qué info tienes de salud publica') ||
            norm.includes('que info tienes de salud publica') ||
            norm.includes('salud pública') ||
            norm.includes('resumen') ||
            // plural de eventos Rurales
            norm.includes('eventos mas rurales') ||
            norm.includes('los mas rurales') ||
            norm.includes('cuales son los eventos mas rurales') ||
            norm.includes('ranking de eventos rurales') ||

            // Plural eventos Salud Urbana
            norm.includes('cuales son los eventos mas urbanos') ||
            norm.includes('eventos más rurales') ||
            norm.includes('ranking de eventos urbanos') ||
            norm.includes('que evento es el mas urbano en colombia') ||
            // Singular evento salud Rural
            norm.includes('cual es el evento mas rural') ||
            norm.includes('enfermedad mas rural') ||
            norm.includes('mayor concentracion rural') ||
            // Singular evento salud urbano
            norm.includes('cual es el evento mas urbano') ||
            norm.includes('enfermedad mas urbana') ||
            norm.includes('mayor concentracion urbano') ||

            norm.includes('adolescentes') ||
            norm.includes('mayores') ||
            norm.includes('proporcion') ||
            norm.includes('brecha') ||
            norm.includes('sexo') ||
            norm.includes('genero') ||
            norm.includes('eventos con mas casos') ||
            norm.includes('top eventos') ||
            norm.includes('ranking de eventos') ||
            norm.includes('puedes mostrarme el ranking de eventos de salud en colombia') ||
            norm.includes('categorias') ||
            //CATEGORIAS DE EVENTOS DE SALUD PUBLICA
            norm.includes('categorias de eventos de salud publica') ||
            norm.includes('cual es el ranking de categorias') ||
            (norm.includes('cual es el ranking') && norm.includes('categorias')) ||
            norm.includes('mayor incidencia') ||
            norm.includes('las categorias con mayor incidencia') ||

            norm.includes('adultos jovenes');

        if (!isPublicHealthQuery) return false;

        const resultado = await this.saludPublicaQuestionsService.processPublicHealthQuery(text);
        if (!resultado) return false;

        await this.sendLongMessage(ctx, resultado);
        return true;
    }

    // ─── Chart Queries ──────────────────────────────────────────────────────────
    private async handleChartQuery(ctx: Context, text: string): Promise<boolean> {
        const infoResultado = await this.graphicsQuestionsService.processGraphicsQuery(text);
        if (infoResultado) {
            await ctx.reply(infoResultado, { parse_mode: 'Markdown' });
            return true;
        }

        const region = this.detectRegion(text)?.toUpperCase();
        const result = await this.chartQueryService.processChartQuery(text, region);

        if (!result.success) {
            if (result.message) {
                await ctx.reply(result.message);
                return true;
            }
            return false;
        }

        if (result.needsLocation && result.message) {
            await ctx.reply(result.message, { parse_mode: 'Markdown' });
            if (ctx.from?.id && result.intent) {
                this.userState.set(ctx.from.id, { intent: result.intent });
            }
            return true;
        }

        if (result.photo) {
            await ctx.replyWithPhoto(result.photo, { caption: result.caption });
            if (ctx.from?.id) this.userState.delete(ctx.from.id);
            return true;
        }

        if (result.message) {
            await ctx.reply(result.message);
            return true;
        }

        return false;
    }

    // ─── Greeting / Start ────────────────────────────────────────────────────────
    private getTimeGreeting(): string {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 12) return 'Buenos días';
        if (hour >= 12 && hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    }

    private getWelcomeMessage(firstName: string): string {
        const greeting = this.getTimeGreeting();
        return `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud pública con **cobertura nacional**.

Ahora cuento con acceso a datos oficiales (SIVIGILA nacional), archivos locales y fuentes ambientales para ofrecerte información, análisis y recomendaciones.

✨ **¿Qué preguntas soy capaz de responder?: **

El bot está diseñado para responder a consultas de alta precisión basadas en datos reales 
(no solo lenguaje natural):
----------------------------------------------------------------
🥼 **Salud Pública:**
----------------------------------------------------------------
- Me Puedes preguntar:
 "¿Qué info tienes de la salud pública en Colombia?" 
 (y te mostraré las preguntas que puedo responder)
 
----------------------------------------------------------------
📊 **Gráficos:**
----------------------------------------------------------------
 Puedes preguntarme:
 "¿Qué puedes Graficar?" 
 (te mostraré la lista de gráficos que puedo hacer para ti)

------------------------------------------------------------------
📍 **Información sobre Yopal:**
------------------------------------------------------------------
Puedes hacerme esta pregunta:
 ¿que informacion tienes de yopal?
- "Usuarios en Yopal pueden hacer esta consulta -> ¿Qué hospitales hay cerca de mi?"
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"
   ó simplemente me preguntas: 
  ¿tienes alguna información sobre Yopal?
   y te mostrare los datos que tengo disponibles.

------------------------------------------------------------------
  🧠 **Salud Mental y Sexual (CIE-10 y Protocolos):**
------------------------------------------------------------------
Te puedo responder preguntas sobre salud mental solo escribe:
- "Qué información tienes sobre salud mental?"

----------------------------------------------------------------
📈 **Predicciones:**
----------------------------------------------------------------
Puedes Escribirme:
- ¿Qué puedes predecir?" → (muestra las capacidades predictivas generales (alertas, pronósticos, ML, análisis completo)
- ¿Qué riesgos se pueden predecir? → (muestra la lista de eventos y departamentos/municipios disponibles)

----------------------------------------------------------------
📊 **Estadísticas e Inteligencia Epidemiológica:**
----------------------------------------------------------------
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "¿Cuál es la tendencia de la tuberculosis en los últimos 6 meses?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

----------------------------------------------------------------
🛡️ **Análisis de Riesgo y Vacunación:**
----------------------------------------------------------------
- "Analizar riesgo de sarampión en Antioquia" (revisaré casos vs. cobertura de vacuna TV).
- "Analizar riesgo de dengue en Antioquia"
- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

----------------------------------------------------------------
🍃 **Monitoreo Ambiental:**
----------------------------------------------------------------
- "¿Cómo está la calidad del aire hoy en Cali?"
- "Graficar contaminación ambiental en Medellín."

💬 ¿Sobre qué tema te gustaría consultar hoy?`;
    }

    private async sendPersonalizedGreeting(ctx: Context): Promise<void> {
        const firstName = ctx.from?.first_name || 'usuario';
        const welcomeMessage = this.getWelcomeMessage(firstName);

        await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

        if (ctx.from?.id) {
            await this.userService.markAsGreeted(ctx.from.id);
        }
    }

    @Start()
    async start(@Ctx() ctx: Context): Promise<void> {
        await this.sendPersonalizedGreeting(ctx);
    }

    @Help()
    async help(@Ctx() ctx: Context): Promise<void> {
        await ctx.reply(
            `🤖 **Menú de Ayuda - Salud IA**

✨ **¿Qué preguntas soy capaz de responder?**
Estoy diseñado para responder a consultas de alta precisión basadas en datos oficiales:

🔬 Salud Pública (SIVIGILA):
• Enfermedades Transmisibles: Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Varicela, Hepatitis A, B y C
• Eventos de Violencia: Violencia de género e intrafamiliar, agresiones por animales (rabia)
• Otros: Desnutrición aguda, intento de suicidio, defectos congénitos, intoxicaciones, accidentes ofídicos
• Dame un resumen de salud pública
• ¿Qué enfermedad es más rural?
• Comparar dengue vs zika
• ¿Qué enfermedad afecta más a los adolescentes?
• Proporción global por sexo
• Eventos con mayor brecha de género
• ¿Qué eventos son más frecuentes en adultos jóvenes?

📍 **Búsqueda Geográfica y Logística:**
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"
- "¿Qué hospitales hay en Medellín?"
- "Lista de municipios de Boyacá con centros de salud."

📊 **Estadísticas e Inteligencia Epidemiológica:**
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "¿Cuál es la tendencia de la tuberculosis en los últimos 6 meses?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

🛡️ **Análisis de Riesgo y Vacunación:**
- "Analizar riesgo de sarampión en Antioquia"
- "Analizar riesgo de dengue en Antioquia"
- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

🧠 **Salud Mental y Sexual:**
- "¿Cuál es el diagnóstico de salud mental más común en niños?"
- Episodios depresivos (graves, moderados)
- Trastornos de ansiedad (mixtos, fóbicos)
- Trastorno Afectivo Bipolar
- Esquizofrenia y trastornos psicóticos
- Consumo de sustancias psicoactivas (SPA)

❤️ Salud Sexual y Reproductiva:
- "¿Qué derechos tengo para la prevención del VIH?"
- Prevención y derechos en VIH/SIDA
- Sífilis (incluyendo gestacional y congénita)
- Cáncer de cuello uterino y mama (VPH)
- Métodos anticonceptivos y derechos reproductivos

🍃 **Monitoreo Ambiental:**
- "¿Cómo está la calidad del aire hoy en Cali?"
- "Graficar contaminación ambiental en Medellín."

💬 *Tip: Puedes preguntar por cualquier municipio de Colombia para estadísticas SIVIGILA o por regiones específicas (Cali, Antioquia, Boyacá, Yopal) para servicios de salud.*`,
            { parse_mode: 'Markdown' },
        );
    }

    // ─── Long Message Handler ────────────────────────────────────────────────────
    private async sendLongMessage(
        ctx: Context,
        text: string,
        options: { parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' } = {},
    ): Promise<void> {
        if (text.length <= MAX_MESSAGE_LENGTH) {
            await ctx.reply(text, options);
            return;
        }

        let currentPosition = 0;
        while (currentPosition < text.length) {
            let endPosition = currentPosition + MAX_MESSAGE_LENGTH;

            if (endPosition < text.length) {
                const lastNewline = text.lastIndexOf('\n', endPosition);
                if (lastNewline > currentPosition) {
                    endPosition = lastNewline;
                }
            }

            try {
                await ctx.reply(text.substring(currentPosition, endPosition), options);
                currentPosition = endPosition;
            } catch (error) {
                this.logger.error(`Error enviando fragmento de mensaje: ${error.message}`);
                break;
            }
        }
    }

    // ─── Location Handler ────────────────────────────────────────────────────────
    @On('location')
    async onLocation(@Ctx() ctx: Context): Promise<void> {
        if (!ctx.message || !('location' in ctx.message)) return;

        const { latitude, longitude } = ctx.message.location;
        const userId = ctx.from?.id;
        const firstName = ctx.from?.first_name || 'usuario';
        const pending = userId ? this.userState.get(userId) : null;
        if (pending?.intent === 'provider_search_location') {
            this.userState.delete(userId!);
        }

        this.logger.log(`User ${userId} (${firstName}) sent location: Lat ${latitude}, Lon ${longitude}`);

        const radiusKm = 5;
        const nearbyProviders = await this.yopalHealthService.findNearby(
            latitude,
            longitude,
            radiusKm,
        );

        if (nearbyProviders && nearbyProviders.length > 0) {
            let response = `📍 **Prestadores de Salud cercanos en Yopal (dentro de ${radiusKm} km):**

`;
            nearbyProviders.slice(0, 5).forEach((p: any, index: number) => {
                const contacts = this.yopalHealthService.getProviderContacts(p);
                const escapedEntity = this.escapeMarkdown(p.entidad_2 || 'N/A');
                response += `*${index + 1}. ${escapedEntity}*
`;
                response += `   - Dirección: ${this.escapeMarkdown(p.direccion || 'N/A')}
`;
                response += `   - Teléfono: ${contacts.primaryPhone || 'N/A'}
`;
                response += `   - Distancia: ${p.distance!.toFixed(2)} km

`;
            });
            response += `_Estos son los ${Math.min(5, nearbyProviders.length)} más cercanos._`;
            response += `\n\n*Nota:* Esta búsqueda por ubicación usa datos de Yopal.`;
            await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(
                `😔 Lo siento, ${firstName}. No encontré prestadores de salud en Yopal dentro de ${radiusKm} km de tu ubicación. Actualmente esta búsqueda por ubicación está disponible solo para Yopal.`,
            );
        }
    }

    // ─── Main Text Handler ────────────────────────────────────────────────────────
    @On('text')
    async onText(@Ctx() ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) return;

        const messageText = ctx.message.text;

        // Detectar región para posibles análisis posteriores
        const detectedRegion = this.detectRegion(messageText);

        // Continuidad de conversación
        if (await this.handleConversationContinuity(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 0: Consultas de capacidades de servicios específicos
        if (await this.handleServiceCapabilitiesQuery(ctx, messageText)) return;

        // PRIORIDAD 1: Datos estructurales (conteos, listas)
        if (await this.handleStructuralDataQuery(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 2: Salud mental (incluye perfil de riesgo, diagnósticos)
        if (await this.mentalHealthQuestionsService.handleMentalHealthQuery(ctx, messageText)) return;

        // PRIORIDAD 2.5: Consultas de salud pública vía servicio especializado
        if (await this.handleSaludPublicaQuestions(ctx, messageText)) return;

        // PRIORIDAD 3.5: Alertas tempranas, pronósticos y predicciones
        const normPred = normalizeString(messageText);
        if (
            normPred.includes('alertas tempranas') ||
            normPred.includes('alerta temprana') ||
            normPred.includes('alertas de salud') ||
            normPred.includes('panorama de riesgo') ||
            normPred.includes('que eventos requieren atencion') ||
            normPred.includes('pronostico') ||
            normPred.includes('prediccion') ||
            (normPred.includes('tendencia') && normPred.includes('en los proximos')) ||
            (normPred.includes('proyeccion') && normPred.includes('casos')) ||
            normPred.includes('clasificar riesgo')
        ) {
            if (await this.handleNewPredictiveServices(ctx, messageText, detectedRegion)) return;
        }

        // PRIORIDAD 4: Gráficos
        if (await this.handleChartQuery(ctx, messageText)) return;

        // PRIORIDAD 5: Saludos
        if (await this.handleGreeting(ctx, messageText)) return;

        // PRIORIDAD 6: Búsqueda de prestadores
        if (await this.handleProviderSearch(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 7: Yopal específico
        if (await this.handleYopalQuery(ctx, messageText)) return;

        // PRIORIDAD 8: Predicciones
        if (await this.handlePrediction(ctx, messageText)) return;

        // PRIORIDAD 9: Calidad del aire
        if (await this.handleAirQualityQuery(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 10: Estadísticas generales
        const contextData = await this.statsService.getSummary(messageText);
        if (contextData && BYPASS_MARKERS.some(marker => contextData.includes(marker))) {
            await this.sendLongMessage(ctx, contextData);
            return;
        }

        // PRIORIDAD 11: Salud sexual
        if (await this.handleSexualHealthQuery(ctx, messageText)) return;

        // PRIORIDAD 12: Análisis de riesgo específico
        if (await this.handleRiskAnalysis(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 13: Salud pública (eventos por nombre)
        if (await this.handleSaludPublica(ctx, messageText, detectedRegion)) return;

        // PRIORIDAD 14: IA general
        await this.handleGeneralQuery(ctx, messageText, contextData);
    }

    // ─── Conversation Continuity ──────────────────────────────────────────────────
    private async handleConversationContinuity(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : undefined;
        if (!pending) return false;

        const isShortResponse = text.trim().split(/\s+/).length <= 3;
        if (!isShortResponse) return false;

        const region = detectedRegion || text.trim();

        this.logger.log(`Reanudando intent "${pending.intent}" para region "${region}"`);

        switch (pending.intent) {
            case 'health_event_analysis':
                return await this.handleSaludPublica(ctx, text, region);
            case 'risk_analysis':
                return await this.handleRiskAnalysis(ctx, text, region);
            case 'predict_risk':
                return await this.handlePrediction(ctx, text);
            case 'air_quality':
                return await this.handleAirQualityQuery(ctx, text, region);
            case 'chart_air_quality':
            case 'chart_vaccination':
                return await this.handleChartQuery(ctx, text);
            case 'count_providers':
            case 'list_structural':
                return await this.handleStructuralDataQuery(ctx, text, region);
            case 'provider_search':
                return await this.handleProviderSearch(ctx, text, region);
            default:
                return false;
        }
    }


    // ─── Sexual Health ────────────────────────────────────────────────────────────
    private async handleSexualHealthQuery(ctx: Context, text: string): Promise<boolean> {
        const results = await this.sexualHealthService.searchByKeyword(text);
        if (results && results.length > 0) {
            const answer = results[0].respuesta;
            await this.sendLongMessage(ctx, answer);
            return true;
        }
        return false;
    }

    // ─── General Query (IA fallback) ─────────────────────────────────────────────
    private async handleGeneralQuery(ctx: Context, text: string, preFetchedContext?: string): Promise<void> {
        const contextData = preFetchedContext || (await this.statsService.getSummary(text));

        let augmentedPrompt = text;
        if (contextData && !contextData.includes('[INFO]')) {
            augmentedPrompt = `
### CONTEXTO DE DATOS REALES (COLOMBIA) ###
${contextData}
### FIN DEL CONTEXTO ###

INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. 
Si el contexto no contiene información relevante para responder la consulta, responde EXACTAMENTE con este mensaje: "${RESPONSE_NO_INFORMATION}"
Si el contexto contiene estadísticas, limítate a analizarlas y presentarlas. NO generes información que no esté presente en el contexto.

Consulta: ${text}
      `;
        } else {
            augmentedPrompt = `Consulta: ${text}

INSTRUCCIÓN: Como asistente experto en salud pública colombiana, si la consulta no está relacionada con tus capacidades (servicios de salud, estadísticas de salud pública, salud mental o sexual), responde EXACTAMENTE con este mensaje: "${RESPONSE_NO_INFORMATION}"`;
        }

        try {
            const norm = normalizeString(text);
            if (
                norm.includes('que informacion tienes') &&
                norm.includes('salud mental')
            ) {
                await ctx.reply(this.mentalHealthQuestionsService.getAvailableQuestions(), {
                    parse_mode: 'Markdown',
                });
                return;
            }

            const response = await this.genkitService.generateResponse(augmentedPrompt);
            await this.sendLongMessage(ctx, response);
        } catch (error) {
            this.logger.error(`Error en handleGeneralQuery: ${error.message}`);
            await ctx.reply(
                '⚠️ Lo siento, mi servicio de inteligencia artificial no está disponible en este momento. Por favor, intenta de nuevo en unos minutos.',
            );
        }
    }

    // ─── Risk Analysis ────────────────────────────────────────────────────────────
    private async handleRiskAnalysis(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const norm = normalizeString(text);
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : null;

        const isRiskAnalysis =
            ((norm.includes('riesgo') || norm.includes('analizar')) &&
                !norm.includes(' vs ')) ||
            pending?.intent === 'risk_analysis';

        if (!isRiskAnalysis) return false;
        if (norm.includes('calidad del aire')) return false;

        const event = this.extractRiskEvent(norm, pending);

        if (event) {
            try {
                if (!detectedRegion) {
                    await ctx.reply(
                        `🛡️ ¿En qué **municipio o departamento** deseas analizar el riesgo de **${event}**?`,
                        { parse_mode: 'Markdown' },
                    );
                    if (userId) {
                        this.userState.set(userId, { intent: 'risk_analysis', data: { event } });
                    }
                    return true;
                }

                // Usar PredictionService.predictRisk que combina SIVIGILA + vacunación + calidad del aire
                const analysis = await this.riskQuestionsService.analizarRiesgo(event, detectedRegion);
                if (userId) this.userState.delete(userId);
                await this.sendLongMessage(ctx, analysis);
                return true;
            } catch (error) {
                this.logger.error(`Error in handleRiskAnalysis: ${error.message}`);
            }
        }
        return false;
    }

    private extractRiskEvent(norm: string, pending: UserState | null | undefined): string | undefined {
        const fromKeywords = RISK_ANALYSIS_KEYWORDS.find((k) => norm.includes(k));
        if (fromKeywords) return fromKeywords;
        const fromRiskEvents = RISK_EVENTS.find((e) => norm.includes(e.toLowerCase()));
        if (fromRiskEvents) return fromRiskEvents;
        const fromPending = (pending?.data as { event?: string } | undefined)?.event;
        if (fromPending) return fromPending;
        // Fallback: si contiene "riesgo de" o "analizar riesgo de", extraer lo que sigue
        const fallbackMatch = norm.match(/(?:riesgo de|analizar riesgo de)\s+([a-záéíóúñ\s]+?)(?:\s+en\s+|$)/);
        if (fallbackMatch && fallbackMatch[1]) {
            return fallbackMatch[1].trim();
        }
        return undefined;
    }

    // ─── Region Detection ──────────────────────────────────────────────────────────
    private detectRegion(text: string): string | undefined {
        const allRegions = [...DEPARTMENTS, ...CAPITALS, ...MAJOR_VALLE_TOWNS, ...OTHER_REGION_NAMES];

        const cleanText = normalizeText(text);

        const matchedRegion = allRegions.find((r) => {
            const cleanRegion = normalizeText(r);
            const regex = new RegExp(`\\b${cleanRegion}\\b`, 'i');
            return regex.test(cleanText);
        });

        if (matchedRegion) {
            return matchedRegion === 'atioquia' ? 'Antioquia' : matchedRegion;
        }

        // Extracción dinámica para patrones específicos donde la región no está en las listas estáticas
        const matchAire = text.match(/aire\s+en\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:\s*[,]|$)/i);
        if (matchAire && matchAire[1]) {
            return matchAire[1].trim();
        }

        return undefined;
    }

    // ─── Greeting Handler ──────────────────────────────────────────────────────────
    private async handleGreeting(ctx: Context, text: string): Promise<boolean> {
        const userId = ctx.from?.id;
        const isGreeting = GREETING_REGEX.test(text.trim());

        this.logger.log(`handleGreeting - userId=${userId}, isGreeting=${isGreeting}`);

        if (userId && !(await this.userService.hasBeenGreeted(userId))) {
            this.logger.log(`Greeting new user`);
            return true;
        } else if (isGreeting) {
            this.logger.log(`Greeting existing user`);
            const firstName = ctx.from?.first_name || 'usuario';
            await ctx.reply(
                `¡Hola, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud respaldado por datos oficiales.

✨ **¿Qué preguntas soy capaz de responder?**
El bot está diseñado para responder a consultas de alta precisión basadas en datos reales:

📍 **Búsqueda Geográfica y Logística:**
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"

📊 **Estadísticas e Inteligencia Epidemiológica:**
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

🛡️ **Análisis de Riesgo y Vacunación:**
- "Analizar riesgo de sarampión en Antioquia"
- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

🧠 **Salud Mental y Sexual:**
- Te puedo responder preguntas sobre salud mental basadas en datos oficiales.
Por ejemplo: "¿Qué información tienes sobre salud mental?"

🍃 **Monitoreo Ambiental:**
- "¿Cómo está la calidad del aire hoy en Cali?"

¿Qué necesitas consultar hoy?`,
                { parse_mode: 'Markdown' },
            );
            return true;
        }

        this.logger.log(`No greeting detected`);
        return false;
    }

    // ─── Yopal Query ────────────────────────────────────────────────────────────────
    private async handleYopalQuery(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);
        const cleanQuery = norm.replace(/\s+/g, '').replace(/k/g, 'c');

        const isYopalQuery = YOPAL_KEYWORDS.some(keyword =>
            cleanQuery.includes(keyword.replace(/k/g, 'c'))
        );

        if (!isYopalQuery) return false;

        const respuesta = await this.yopalQuestionsService.processYopalQuery(text);
        if (!respuesta) return false;

        await this.sendLongMessage(ctx, respuesta, { parse_mode: 'Markdown' });
        return true;
    }

    // ─── Request Location ──────────────────────────────────────────────────────────
    private async requestLocationForNearbyProviders(ctx: Context, userId?: number): Promise<void> {
        const replyText =
            '📍 Por ahora te puedo ayudar a buscar prestadores de servicios de salud en Yopal, en un radio de 5Km cercanos, por favor comparte tu ubicación usando el botón de ubicación de Telegram.';
        await ctx.reply(replyText, {
            reply_markup: {
                keyboard: [[{ text: 'Enviar ubicación', request_location: true }]],
                one_time_keyboard: true,
                resize_keyboard: true,
            },
        });
        if (userId !== undefined) {
            this.userState.set(userId, { intent: 'provider_search_location' });
        }
    }

    // ─── Structural Data Query ──────────────────────────────────────────────────────
    private async handleStructuralDataQuery(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const userId = ctx.from?.id;
        const result = await this.saludPublicaQuestionsService.handleStructuralDataQuery(text, detectedRegion);

        if (!result.handled) return false;

        if (result.needsLocation && result.response) {
            await ctx.reply(result.response, { parse_mode: 'Markdown' });
            if (userId && result.intent) this.userState.set(userId, { intent: result.intent });
            return true;
        }

        if (result.response) {
            if (userId) this.userState.delete(userId);
            await this.sendLongMessage(ctx, result.response, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    // ─── Provider Search ────────────────────────────────────────────────────────────
    private async handleProviderSearch(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const userId = ctx.from?.id;

        const providerCapabilities = await this.saludPublicaQuestionsService.processProviderCapabilitiesQuery(text);
        if (providerCapabilities) {
            await this.sendLongMessage(ctx, providerCapabilities, { parse_mode: 'Markdown' });
            return true;
        }

        const result = await this.saludPublicaQuestionsService.handleProviderSearchQuery(text, detectedRegion);
        if (!result.handled) return false;

        if (result.needsLocation && result.response) {
            if (result.intent === 'provider_search_location') {
                await this.requestLocationForNearbyProviders(ctx, userId);
            } else {
                await ctx.reply(result.response);
                if (userId && result.intent) this.userState.set(userId, { intent: result.intent });
            }
            return true;
        }

        if (result.response) {
            if (userId) this.userState.delete(userId);
            await this.sendLongMessage(ctx, result.response, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    // ─── Prediction Handler ──────────────────────────────────────────────────────────
    private async handlePrediction(ctx: Context, text: string): Promise<boolean> {
        const lowerText = text.toLowerCase();
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : null;

        if (await this.handleRiskPrediction(ctx, text, lowerText, userId, pending)) return true;
        if (await this.handleCasePrediction(ctx, lowerText, userId, pending)) return true;

        // Si es pregunta general sobre predicciones, mostrar mensaje afirmativo y opciones (sin pedir ubicación)
        if (
            lowerText.includes('prediccion') ||
            lowerText.includes('pronostico') ||
            lowerText.includes('predecir') ||
            lowerText.includes('proyeccion') ||
            lowerText.includes('clasificar riesgo') ||
            lowerText.includes('puedes predecir riesgos') ||
            lowerText.includes('riesgos') ||
            lowerText.includes('alerta temprana')
        ) {
            await this.sendPredictiveOverview(ctx);
            return true;
        }

        return false;
    }

    private async sendPredictiveOverview(ctx: Context): Promise<void> {
        const eventsList = RISK_EVENTS.slice(0, 8).map(e => `• ${e}`).join('\n');

        // Obtener ubicaciones disponibles dinámicamente desde los servicios
        let availableLocations: string[] = [];
        try {
            const [vaccinationDeptos, airQualityMunis] = await Promise.all([
                this.vaccinationService.getAllDepartament(),
                this.airQualityService.getAllMunicipios(),
            ]);

            // Combinar departamentos y municipios, eliminando duplicados
            const combined = [...vaccinationDeptos, ...airQualityMunis];
            const unique = Array.from(new Set(combined.map(l => l.trim()))).filter(l => l.length > 2);
            availableLocations = unique.slice(0, 10); // Limitar a 10 para no saturar el mensaje
        } catch (error) {
            this.logger.warn(`Error obteniendo ubicaciones disponibles: ${error.message}`);
        }

        // Fallback si no se pudieron obtener datos dinámicamente
        if (availableLocations.length === 0) {
            availableLocations = ['Norte de Santander', 'Antioquia', 'Valle del Cauca', 'Boyacá', 'Casanare (Yopal)', 'Meta', 'Cundinamarca'];
        }

        const locationsList = availableLocations.map(l => `**${l}**`).join(', ');
        const message = `🔮 **Sí, puedo predecir y evaluar riesgos epidemiológicos en Colombia.**\n\n` +
            `Actualmente puedo generar análisis de riesgo combinando datos oficiales de SIVIGILA, cobertura de vacunación y calidad del aire para eventos como:\n\n` +
            `${eventsList}\n\n` +
            `📍 **Ubicaciones disponibles para predicción:**\n` +
            `${locationsList}.\n\n` +
            `💬 *Escribe por ejemplo:* "predecir riesgo de dengue en Norte de Santander".\n` +
            `También puedes consultar: "pronóstico de casos", "alertas tempranas" o "clasificar riesgo".`;
        await this.sendLongMessage(ctx, message, { parse_mode: 'Markdown' });
    }

    private async handleRiskPrediction(
        ctx: Context,
        text: string,
        lowerText: string,
        userId: number | undefined,
        pending: UserState | null | undefined,
    ): Promise<boolean> {
        const isRiskPred = lowerText.includes('predecir riesgo') || pending?.intent === 'predict_risk';
        if (!isRiskPred) return false;

        const parts = lowerText.replace('predecir riesgo de', '').split(' en ');
        const eventName = pending?.data ? (pending.data as { event?: string }).event : undefined;
        let finalEventName = eventName || parts[0].trim();
        const region = this.detectRegion(text);
        const departamento = region || 'Antioquia';

        // Si no hay evento explícito, buscar en palabras clave de riesgo
        if (!finalEventName) {
            finalEventName = RISK_ANALYSIS_KEYWORDS.find((k) => lowerText.includes(k)) || '';
        }

        if (!region && !lowerText.includes(' en ')) {
            if (finalEventName) {
                const prediction = await this.predictionService.predictRisk(departamento, finalEventName);
                if (userId !== undefined) this.userState.delete(userId!);
                await this.sendLongMessage(ctx, prediction);
                return true;
            }
            await ctx.reply(`🔮 ¿En qué **municipio o departamento** deseas realizar la predicción de riesgo para **${finalEventName}**?`, { parse_mode: 'Markdown' });
            if (userId) this.userState.set(userId, { intent: 'predict_risk', data: { event: finalEventName } });
            return true;
        }

        const prediction = await this.predictionService.predictRisk(departamento, finalEventName);
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(ctx, prediction);
        return true;
    }

    private async handleCasePrediction(
        ctx: Context,
        lowerText: string,
        userId: number | undefined,
        pending: UserState | null | undefined,
    ): Promise<boolean> {
        const isCasePred = lowerText.startsWith('predecir casos') || pending?.intent === 'predict_cases';
        if (!isCasePred) return false;

        const eventName = lowerText.replace('predecir casos', '').trim();
        if (!eventName) {
            await this.sendLongMessage(ctx, "Por favor, especifica un evento. Ejemplo: 'predecir casos dengue'");
            return true;
        }

        const resultado = await this.saludPublicaService.procesarPregunta(eventName);
        if (!resultado.evento) {
            await this.sendLongMessage(ctx, 'No encontré ese evento para predecir.');
            return true;
        }

        const temporalData = await this.healthDataService.getTemporalSeries(resultado.evento.nombre_del_evento);
        const cases = temporalData.map((d: any) => d.cases);
        const prediccion = this.healthStatsService.predictNextValue(cases);
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
            ctx,
            `📊 **Predicción para ${resultado.evento.nombre_del_evento}:**
Basado en datos históricos de los últimos 6 meses: ${cases.join(', ')}
El próximo valor proyectado es: **${prediccion}** casos.`,
        );
        return true;
    }

    // ─── Air Quality ────────────────────────────────────────────────────────────────
    private async handleAirQualityQuery(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const norm = text.toLowerCase();
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : null;

        const airQualityCapabilities = await this.airQualityQuestionsService.processAirQualityQuery(text);
        if (airQualityCapabilities?.tipo === 'listado') {
            await ctx.reply(airQualityCapabilities.respuesta, { parse_mode: 'Markdown' });
            return true;
        }

        if (!norm.includes('calidad del aire') && !norm.includes('calidad aire') && pending?.intent !== 'air_quality') return false;

        // Si no se detectó región por las listas, intentar extraerla del texto después de "calidad del aire en" o "calidad aire en"
        let region = detectedRegion;
        if (!region) {
            const matchCalidadAire = norm.match(/calidad\s+(?:del\s+)?aire\s+en\s+([a-z\s]+?)(?:\s*[,]|$)/i);
            if (matchCalidadAire && matchCalidadAire[1]) {
                region = matchCalidadAire[1].trim().toUpperCase();
            }
        }

        if (!region) {
            await ctx.reply('☁️ ¿De qué **municipio o departamento** deseas conocer la calidad del aire?', { parse_mode: 'Markdown' });
            if (userId) this.userState.set(userId, { intent: 'air_quality' });
            return true;
        }

        const aireData = await this.airQualityService.getAirQualityByMunicipio(region);

        if (aireData && aireData.length > 0) {
            if (userId !== undefined) this.userState.delete(userId!);
            const uniqueVariables = Array.from(new Map(aireData.map((v: AirQualityItem) => [v.variable, v])).values());
            const variables = uniqueVariables.slice(0, 3)
                .map((item: AirQualityItem) => `- ${item.variable}: ${item.promedio} ${item.unidades}`)
                .join('\n');
            await this.sendLongMessage(ctx, `🍃 **Indicadores ambientales en ${region}:**\n${variables}`);
            return true;
        } else {
            if (userId !== undefined) this.userState.delete(userId!);
            await ctx.reply(`⚠️ No encontré datos de calidad del aire para **${region}**. Asegúrate de que el nombre del municipio sea correcto.`);
            return true;
        }
    }

    // ─── Salud Pública (eventos por nombre) ──────────────────────────────────────────
    private async handleSaludPublica(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        try {
            const userId = ctx.from?.id;
            const pending = userId ? this.userState.get(userId) : null;

            if (detectedRegion && pending?.intent === 'health_event_analysis' && pending.data) {
                await this.executeHealthEventAnalysis(ctx, (pending.data as { event: HealthEvent }).event, detectedRegion);
                if (userId !== undefined) this.userState.delete(userId!);
                return true;
            }

            // No interceptar consultas generales sobre capacidades de salud pública
            const norm = normalizeString(text);
            if (this.isPublicHealthCapabilitiesQuery(norm)) {
                return false;
            }

            const resultado = await this.saludPublicaService.procesarPregunta(text);
            if (!resultado || !resultado.encontrado) return false;

            if (resultado.encontrado) {
                if (resultado.evento) {
                    if (!detectedRegion) {
                        await ctx.reply(
                            `📊 ¿De qué **municipio o departamento** deseas conocer las estadísticas de **${resultado.evento.nombre_del_evento}**?`,
                            { parse_mode: 'Markdown' },
                        );
                        if (userId) this.userState.set(userId, { intent: 'health_event_analysis', data: { event: resultado.evento } });
                        return true;
                    }
                    await this.executeHealthEventAnalysis(ctx, resultado.evento, detectedRegion);
                    return true;
                } else if (resultado.contenido) {
                    await this.sendLongMessage(ctx, resultado.contenido);
                    return true;
                }
            }
        } catch (err) {
            this.logger.error(`Error en handleSaludPublica: ${err.message}`);
        }
        return false;
    }

    private isPublicHealthCapabilitiesQuery(norm: string): boolean {
        return (
            (norm.includes('que info') && norm.includes('salud publica')) ||
            (norm.includes('que informacion') && norm.includes('salud publica')) ||
            (norm.includes('que sabes') && norm.includes('salud publica')) ||
            (norm.includes('que puedes') && norm.includes('salud publica')) ||
            norm.includes('que preguntas puedo hacer sobre salud publica') ||
            (norm.includes('salud publica') && (norm.includes('info') || norm.includes('informacion')))
        );
    }

    private async executeHealthEventAnalysis(ctx: Context, event: HealthEvent, region: string): Promise<void> {
        const { contenido } = await this.saludPublicaService._formatearRespuesta({ evento: event }, 'detalle');
        let respuestaFinal = contenido;

        this.logger.log(`Llamando analizarRiesgoEvento para ${event.nombre_del_evento} en ${region}`);

        const analisis = await this.saludAnaliticaService.analizarRiesgoEvento(event.nombre_del_evento, region);
        respuestaFinal += `\n\n${analisis}`;

        const isEnvRelevant = ENVIRONMENTAL_KEYWORDS.some(k =>
            event.nombre_del_evento.toLowerCase().includes(k)
        );

        try {
            if (isEnvRelevant) {
                const aireData = await this.airQualityService.getAirQualityByMunicipio(region);
                if (aireData && aireData.length > 0) {
                    const uniqueVariables = Array.from(
                        new Map(aireData.map((v: AirQualityItem) => [v.variable, v])).values()
                    );
                    const variables = uniqueVariables.slice(0, 3)
                        .map((item: AirQualityItem) => `- ${item.variable}: ${item.promedio} ${item.unidades}`)
                        .join('\n');
                    respuestaFinal += `\n\n🍃 **Indicadores ambientales en ${region}:**\n${variables}\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
                } else {
                    respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas. No se encontraron datos ambientales locales para ${region}).`;
                }
            } else {
                respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
            }
        } catch (e) {
            respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
        }

        await this.sendLongMessage(ctx, respuestaFinal);
    }

    // ─── Service Capabilities Query ──────────────────────────────────────────────────
    private async handleServiceCapabilitiesQuery(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);
        const userId = ctx.from?.id;

        // PRIORITARIO: Mostrar eventos y ubicaciones específicas de predicción de riesgo
        const riskResponse = await this.riskQuestionsService.processRiskQuery(text);
        if (riskResponse) {
            await ctx.reply(riskResponse.respuesta, { parse_mode: 'Markdown' });
            // Si la respuesta es el listado de capacidades, guardar estado para predicción
            if (riskResponse.tipo === 'listado' && userId) {
                this.userState.set(userId, { intent: 'predict_risk' });
            }
            return true;
        }

        // Solo si NO es consulta de riesgos, mostrar capacidades predictivas generales
        if (await this.handlePredictiveCapabilitiesQuery(ctx, norm)) return true;

        const airQualityResponse = await this.airQualityQuestionsService.processAirQualityQuery(text);
        if (airQualityResponse?.tipo === 'listado') {
            await ctx.reply(airQualityResponse.respuesta, { parse_mode: 'Markdown' });
            return true;
        }

        const providerCapabilities = await this.saludPublicaQuestionsService.processProviderCapabilitiesQuery(text);
        if (providerCapabilities) {
            await this.sendLongMessage(ctx, providerCapabilities, { parse_mode: 'Markdown' });
            return true;
        }

        if (await this.handleGraphicsCapabilitiesQuery(ctx, norm, text)) return true;

        return false;
    }

    private async handlePredictiveCapabilitiesQuery(ctx: Context, norm: string): Promise<boolean> {
        if (
            norm.includes('que riesgos se pueden predecir') ||
            norm.includes('que eventos se pueden predecir') ||
            norm.includes('que puedes predecir') ||
            norm.includes('que predicciones') ||
            norm.includes('que pronosticos') ||
            norm.includes('que alertas') ||
            norm.includes('que clasificaciones') ||
            (norm.includes('que') && norm.includes('prediccion')) ||
            (norm.includes('que') && norm.includes('pronostico')) ||
            (norm.includes('que') && norm.includes('alerta temprana')) ||
            (norm.includes('que') && norm.includes('clasificar riesgo')) ||
            norm.includes('que sabes de predicciones') ||
            norm.includes('que puedes responder sobre predicciones') ||
            norm.includes('que info tienes de predicciones')
        ) {
            const respuesta = this.predictiveQuestionsService.getAvailableQuestions();
            await ctx.reply(respuesta, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    private async handleGraphicsCapabilitiesQuery(ctx: Context, norm: string, text: string): Promise<boolean> {
        if (
            norm.includes('que graficos') ||
            norm.includes('que graficas') ||
            norm.includes('que puedes graficar') ||
            norm.includes('que tipo de graficos') ||
            (norm.includes('ayuda') && norm.includes('grafico'))
        ) {
            const respuesta = await this.graphicsQuestionsService.processGraphicsQuery(text);
            if (respuesta) {
                await ctx.reply(respuesta, { parse_mode: 'Markdown' });
                return true;
            }
        }
        return false;
    }

    // ─── New Predictive Services ────────────────────────────────────────────────────
    private async handleNewPredictiveServices(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const norm = normalizeString(text);
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : null;

        if (await this.handleEarlyWarning(ctx, norm, userId)) return true;
        if (await this.handleAdvancedPrediction(ctx, norm, text, detectedRegion, userId, pending)) return true;
        if (await this.handleMLClassification(ctx, norm, text, detectedRegion, userId, pending)) return true;

        return false;
    }

    private async handleEarlyWarning(
        ctx: Context,
        norm: string,
        userId: number | undefined,
    ): Promise<boolean> {
        if (
            norm.includes('alertas tempranas') ||
            norm.includes('alerta temprana') ||
            norm.includes('alertas de salud') ||
            norm.includes('panorama de riesgo') ||
            norm.includes('que eventos requieren atencion')
        ) {
            if (userId) this.userState.delete(userId);
            const resumen = await this.predictiveQuestionsService.obtenerAlertasTempranas();
            await this.sendLongMessage(ctx, resumen, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    private async handleAdvancedPrediction(
        ctx: Context,
        norm: string,
        text: string,
        detectedRegion?: string,
        userId?: number,
        pending?: UserState | null,
    ): Promise<boolean> {
        if (
            norm.includes('pronostico') ||
            (norm.includes('prediccion') && !norm.includes('riesgo')) ||
            (norm.includes('predecir') && !norm.includes('riesgo')) ||
            (norm.includes('prediccion avanzada')) ||
            (norm.includes('tendencia de') && norm.includes('en los proximos')) ||
            (norm.includes('proyeccion') && norm.includes('casos')) ||
            pending?.intent === 'advanced_prediction'
        ) {
            const region = detectedRegion || 'Colombia';

            const eventoMatch = norm.match(/(?:tendencia de|pronostico de|prediccion de|proyeccion de)\s+([a-z\s]+?)(?:\s+en\s+|$)/);
            const eventoEspecifico = eventoMatch?.[1]?.trim() || (pending?.data as { event?: string } | undefined)?.event;

            if (eventoEspecifico) {
                if (userId) this.userState.delete(userId);
                const prediccion = await this.predictiveQuestionsService.predecirEvento(eventoEspecifico, region);
                if (prediccion) {
                    await this.sendLongMessage(ctx, prediccion, { parse_mode: 'Markdown' });
                } else {
                    await ctx.reply(`No encontré datos suficientes para proyectar **${eventoEspecifico}** en **${region}**.`);
                }
                return true;
            }

            if (!detectedRegion) {
                await ctx.reply('📊 ¿De qué **departamento** deseas ver los pronósticos de salud pública?', { parse_mode: 'Markdown' });
                if (userId) this.userState.set(userId, { intent: 'advanced_prediction' });
                return true;
            }

            if (userId) this.userState.delete(userId);
            const multiples = await this.predictiveQuestionsService.obtenerPronosticosMultiples(region);
            await this.sendLongMessage(ctx, multiples, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    private async handleMLClassification(
        ctx: Context,
        norm: string,
        text: string,
        detectedRegion?: string,
        userId?: number,
        pending?: UserState | null,
    ): Promise<boolean> {
        if (
            norm.includes('clasificar riesgo') ||
            norm.includes('analisis de riesgo con ia') ||
            norm.includes('random forest') ||
            norm.includes('machine learning') ||
            (norm.includes('riesgo') && norm.includes('inteligencia artificial')) ||
            pending?.intent === 'ml_classification'
        ) {
            const region = detectedRegion || 'Colombia';

            const eventoMatch = norm.match(/(?:clasificar riesgo de|riesgo de|analisis de)\s+([a-z\s]+?)(?:\s+en\s+|$)/);
            const eventoEspecifico = eventoMatch?.[1]?.trim() || (pending?.data as { event?: string } | undefined)?.event;

            if (eventoEspecifico && !norm.includes('todos') && !norm.includes('completo')) {
                if (userId) this.userState.delete(userId);
                const clasificacion = await this.predictiveQuestionsService.clasificarRiesgo(eventoEspecifico, region);
                if (clasificacion) {
                    await this.sendLongMessage(ctx, clasificacion, { parse_mode: 'Markdown' });
                } else {
                    const eventosLista = await this.predictiveQuestionsService.listarEventosDisponibles();
                    await ctx.reply(
                        `No encontré datos para clasificar el riesgo de **${eventoEspecifico}** en mi base de datos. ❌\n\n` +
                        `Tengo información disponible sobre estas enfermedades:\n\n${eventosLista}\n\n` +
                        `¿Quieres consultar alguna de ellas?`,
                        { parse_mode: 'Markdown' },
                    );
                }
                return true;
            }

            if (userId) this.userState.delete(userId);
            const analisisCompleto = await this.predictiveQuestionsService.obtenerAnalisisCompleto(region);
            await this.sendLongMessage(ctx, analisisCompleto, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    escapeMarkdown(text: string | undefined): string {
        if (!text) return '';
        return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    }
}
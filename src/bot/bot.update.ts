import { Update, Start, Help, On, Ctx, Command, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
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
import * as skillsData from './skills-data.json';
import { escapeMarkdown, normalizeText } from './utils/text-normalizer.js';
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
} from './constants/keywords.js';
import {
    MentalHealthService,
    MentalHealthEvent,
    MentalHealthEventWithTotal,
} from './mental-health/mental-health.service';
import { MentalHealthQuestionsService } from './questions/mental-health-questions.service';
import { SaludPublicaQuestionsService } from './questions/salud-publica-questions.service';
import { YopalQuestionsService } from './questions/yopal-questions.service';
import { AntioquiaQuestionsService } from './antioquia/antioquia-questions.service';
import { AirQualityQuestionsService } from './questions/air-quality-questions.service';
import { ChartQueryService } from './chart/chart-query.service';
import { GraphicsQuestionsService } from './questions/graphics-questions.service';
import { EarlyWarningService } from './early-warning.service';
import { AdvancedPredictionService } from './advanced-prediction.service';
import { MlPredictionService } from './ml-prediction.service';
import { PredictiveQuestionsService } from './questions/predictive-questions.service';
import { MentalHealthHandler } from './handlers/mental-health.handler';

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
export class BotUpdate implements OnApplicationBootstrap {
    private readonly logger = new Logger(BotUpdate.name);
    private userState = new Map<number, UserState>();

    constructor(
        @InjectBot() private readonly bot: Telegraf<Context>,
        private readonly mentalHealthHandler: MentalHealthHandler,
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
        private readonly antioquiaQuestionsService: AntioquiaQuestionsService,
        private readonly airQualityQuestionsService: AirQualityQuestionsService,
        private readonly chartQueryService: ChartQueryService,
        private readonly graphicsQuestionsService: GraphicsQuestionsService,
        private readonly earlyWarningService: EarlyWarningService,
        private readonly advancedPredictionService: AdvancedPredictionService,
        private readonly mlPredictionService: MlPredictionService,
        private readonly predictiveQuestionsService: PredictiveQuestionsService,
    ) { }

    // ─── OnApplicationBootstrap: Register bot commands ──────────────────────────
    async onApplicationBootstrap(): Promise<void> {
        try {
            await this.bot.telegram.setMyCommands([
                { command: 'start', description: '🚀 Iniciar el bot y ver el menú principal' },
                { command: 'skills', description: '📋 Ver todas mis capacidades y áreas de conocimiento' },
                { command: 'help', description: '❓ Ver ayuda detallada con ejemplos de consultas' },
            ]);
            this.logger.log('Comandos del bot registrados exitosamente en Telegram');
        } catch (error) {
            this.logger.error(`Error registrando comandos: ${error.message}`);
        }
    }

    // ─── Salud Pública Questions ────────────────────────────────────────────────
    private async handleSaludPublicaQuestions(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);

        const isPublicHealthQuery =
            norm.includes('eventos') ||
            norm.includes('evento') ||
            norm.includes('salud publica') ||
            norm.includes('qué info tienes de salud publica') ||
            norm.includes('que info tienes de salud publica') ||
            norm.includes('salud pública') ||
            norm.includes('resumen') ||
            norm.includes('eventos mas rurales') ||
            norm.includes('los mas rurales') ||
            norm.includes('cuales son los eventos mas rurales') ||
            norm.includes('ranking de eventos rurales') ||
            norm.includes('cuales son los eventos mas urbanos') ||
            norm.includes('eventos más rurales') ||
            norm.includes('ranking de eventos urbanos') ||
            norm.includes('que evento es el mas urbano en colombia') ||
            norm.includes('cual es el evento mas rural') ||
            norm.includes('enfermedad mas rural') ||
            norm.includes('mayor concentracion rural') ||
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
            norm.includes('categorias de eventos de salud publica') ||
            norm.includes('cual es el ranking de categorias') ||
            (norm.includes('cual es el ranking') && norm.includes('categorias')) ||
            norm.includes('mayor incidencia') ||
            norm.includes('las categorias con mayor incidencia') ||
            norm.includes('eventos que mas afectan a las mujeres ') ||
            norm.includes('eventos de salud en mujeres ') ||
            norm.includes('enfermedades que mas afectan a las mujeres') ||
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

    private getCommonQuestionMenu(): string {
        return `✨ **¿Qué preguntas soy capaz de responder?: **

El bot está diseñado para responder a consultas de alta precisión basadas en datos reales 
(no solo lenguaje natural):

----------------------------------------------------------------
🥼 **Salud Pública:**
----------------------------------------------------------------
Me Puedes preguntar:
 
"¿Qué info tienes de la salud pública en Colombia?" 
 (y te mostraré las preguntas que puedo responder)
 
----------------------------------------------------------------
📊 **Gráficos:**
----------------------------------------------------------------
 Puedes preguntarme:

 "¿Qué puedes Graficar?" 
 (te mostraré la lista de gráficos que puedo hacer para ti)

 "¿ Puedes graficar la cobertura de vacunacion en Colombia?"

 - "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

------------------------------------------------------------------
📍 **Información sobre Yopal:**
------------------------------------------------------------------
Puedes hacerme esta pregunta:

-"Usuarios en Yopal pueden hacer esta consulta -> ¿Qué hospitales hay cerca de mi?"
-"¿Qué hospitales tienen urgencias 24 horas en Yopal?"

   ó simplemente me preguntas: 

   ¿tienes alguna información sobre Yopal?
   y te mostrare los datos que tengo disponibles.

------------------------------------------------------------------
📍 **Información sobre Antioquia:**
------------------------------------------------------------------
Puedes hacerme esta pregunta:

-"¿Tienes alguna información sobre Antioquia?
   y te mostrare Todas las preguntas que puedo responderte sobre Antioquia"

------------------------------------------------------------------
  🧠 **Salud Mental y Sexual (CIE-10 y Protocolos):**
------------------------------------------------------------------
Te puedo responder preguntas sobre salud mental solo escribe:
- "Qué información tienes sobre salud mental?"

----------------------------------------------------------------
📈 **Predicciones:**
----------------------------------------------------------------
Puedes Escribirme:

- "Servicios predictivos y clasificacion de riesgos" 
(te mostrare mis capacidades disponibles)

- Predicción de riesgos epidemiológicos 
(muestra la lista de eventos y departamentos disponibles)

----------------------------------------------------------------
📊 **Estadísticas e Inteligencia Epidemiológica:**
----------------------------------------------------------------
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"

- "¿Cuál es la tendencia de la tuberculosis en los últimos 6 meses?"



----------------------------------------------------------------
🛡️ **Análisis de Riesgo y Vacunación:**
----------------------------------------------------------------

- Vacunación

- ¿Puedes gráficar la informacion sobre vacunación en Colombia?
  (te mostrare los departamentos y indicadores de vacunación)

- "Panorama de riesgo epidemiologico" 
   (te mostrare los eventos y los departamentos).

- "Analizar riesgo de zika en Yopal"

- "Analizar riesgo de dengue en Antioquia"

- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

----------------------------------------------------------------
🍃 **Monitoreo Ambiental:**
----------------------------------------------------------------
• "¿Qué información tienes sobre calidad del aire?"
 (Te mostrare el listado de municipios y departamentos)

 ejemplo :
 
• "Calidad del aire en Bogotá"
•"Indicadores ambientales en Medellín"

💬 ¿Sobre qué tema te gustaría consultar hoy?`;
    }

    private getWelcomeMessage(firstName: string): string {
        const greeting = this.getTimeGreeting();
        return `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud pública con **cobertura nacional**.

Ahora cuento con acceso a datos oficiales (SIVIGILA nacional), archivos locales y fuentes ambientales para ofrecerte información, análisis y recomendaciones.

${this.getCommonQuestionMenu()}`;
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

    @Command('skills')
    async skills(@Ctx() ctx: Context): Promise<void> {
        const data = (skillsData as any).default || skillsData;
        const skills = data.skills || [];

        let message = `🤖 **Salud IA - Mis Capacidades**\n\n`;
        message += `Soy un asistente de salud pública colombiana con **${skills.length} áreas de conocimiento**:\n\n`;

        for (const skill of skills) {
            if (!skill.enabled) continue;
            message += `${skill.icon} **${skill.name}**\n`;
            message += `   ${skill.description}\n`;
            message += `   _Ejemplos:_ ${skill.examples.slice(0, 3).join(' • ')}\n\n`;
        }

        message += `💬 *Escribe /help para ver la ayuda detallada o /start para el menú principal.*`;

        await this.sendLongMessage(ctx, message, { parse_mode: 'Markdown' });
    }

    @Help()
    async help(@Ctx() ctx: Context): Promise<void> {
        const helpText = `🤖 **Menú de Ayuda - Salud IA**

✨ **¿Qué preguntas soy capaz de responder?**
Estoy diseñado para responder a consultas de alta precisión basadas en datos oficiales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 **SALUD PÚBLICA (SIVIGILA)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Enfermedades Transmisibles:**
• Dengue, Zika, Chikungunya, Malaria
• Tuberculosis, Varicela, Hepatitis A, B y C
• Tos Ferina, Sarampión, Rubeola
• Leishmaniasis, Chagas, Fiebre Amarilla

**Eventos de Violencia:**
• Violencia de género e intrafamiliar
• Agresiones por animales (rabia)
• Accidentes ofídicos

**Otros eventos:**
• Desnutrición aguda, Intento de suicidio
• Defectos congénitos, Intoxicaciones

**Preguntas:**
• "Dame un resumen de salud pública"
• "¿Qué enfermedad es más rural/urbana?"
• "Comparar dengue vs zika"
• "¿Qué afecta más a adolescentes?"
• "Eventos más frecuentes en niños"
• "Proporción global por sexo"
• "Brecha de género"
• "Eventos en adultos jóvenes"
• "Top 5 eventos más reportados"
• "Eventos que más afectan mujeres/hombres"
• "Categorías de eventos de salud pública"`;

        const mentalHealthText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 **SALUD MENTAL (CIE-10)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Diagnósticos disponibles:**
• Episodios depresivos (graves, moderados)
• Trastornos de ansiedad (mixtos, fóbicos)
• Trastorno Afectivo Bipolar
• Esquizofrenia y trastornos psicóticos
• Consumo de sustancias psicoactivas (SPA)

**Preguntas:**
• "¿Cuántos casos hay de depresión?"
• "¿Diagnósticos más frecuentes?"
• "Compara depresión vs ansiedad"
• "Perfil de riesgo de esquizofrenia"
• "Diagnósticos en niños/adolescentes/adultos/mayores"
• "Distribución de edades en salud mental"
• "Lista todos los diagnósticos"`;

        const sexualHealthText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❤️ **SALUD SEXUAL Y REPRODUCTIVA**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Prevención y derechos en VIH/SIDA
• Sífilis (gestacional y congénita)
• Cáncer de cuello uterino y mama (VPH)
• Métodos anticonceptivos y derechos reproductivos`;

        const providersText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 **BÚSQUEDA DE PRESTADORES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Yopal:**
• "Hospitales cerca de mi" (comparte ubicación)
• "Urgencias 24 horas en Yopal"
• "Buscar MEDIMAS en Yopal"

**Cali / Valle del Cauca:**
• "¿Dónde queda Hospital Primitivo Iglesias?"
• "Hospitales en Cali"

**Antioquia:**
• "Hospitales en Medellín"
• "Clínicas en Envigado"
• "Municipios con centros de salud"

**Boyacá:**
• "Hospitales en Tunja"
• "Centros de salud en Boyacá"`;

        const predictionsText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **PREDICCIONES Y RIESGO**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Alertas:**
• "Alertas tempranas de salud pública"

**Pronósticos:**
• "Pronóstico de dengue en Antioquia"
• "Tendencia de tuberculosis"
• "Proyección de casos de malaria"
• ¿Sobre que municipios y de que enfermedades puedes hacer el analisis de riesgos?

**Clasificación IA:**
• "Clasificar riesgo de dengue en Cali"
• "Analizar riesgo de sarampión"`;

        const chartsText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 **GRÁFICOS Y VISUALIZACIONES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Top eventos de salud pública"
• "Gráfico de dengue por sexo"
• "Zika en rural vs urbano"
• "Tendencia de tuberculosis"
• "Gráfico de salud mental"
• "Graficar vacunas en Antioquia"
• "Gráfico de servicios en Cali"`;

        const airQualityText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍃 **CALIDAD DEL AIRE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Calidad del aire en Bogotá"
• "Indicadores ambientales en Medellín"
• "¿Qué información tienes sobre calidad del aire?"`;

        const vaccinationText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💉 **VACUNACIÓN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Cobertura de vacunación en Antioquia"
• "Cobertura de BCG en Santander"

💬 *Tip: Pregunta por cualquier municipio o departamento para estadísticas SIVIGILA.*`;

        await this.sendLongMessage(ctx, helpText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, mentalHealthText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, sexualHealthText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, providersText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, predictionsText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, chartsText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, airQualityText, { parse_mode: 'Markdown' });
        await this.sendLongMessage(ctx, vaccinationText, { parse_mode: 'Markdown' });
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
        try {
            if (!ctx.message || !('text' in ctx.message)) return;

            const messageText = ctx.message.text;
            this.logger.log(`onText received - userId=${ctx.from?.id}, text="${messageText}"`);

            // Feedback de carga para el usuario
            if (ctx.from?.id) {
                await this.bot.telegram.sendChatAction(ctx.from.id, 'typing');
            }

            const detectedRegion = this.detectRegion(messageText);

            if (await this.handleConversationContinuity(ctx, messageText, detectedRegion)) return;

            if (await this.handleServiceCapabilitiesQuery(ctx, messageText)) return;

            if (await this.handleStructuralDataQuery(ctx, messageText, detectedRegion)) return;

            if (await this.mentalHealthHandler.handle(ctx, messageText)) return;

            if (await this.handleSaludPublicaQuestions(ctx, messageText)) return;

            if (await this.handleYopalQuery(ctx, messageText)) return;

            const normPred = normalizeString(messageText);

            // 🚨 INTERCEPCIÓN DIRECTA: Alertas Tempranas Automáticas
            // Debe ir ANTES que cualquier otro handler para garantizar la ruta correcta
            if (
                normPred.includes('alertas tempranas automaticas') ||
                normPred.includes('alerta temprana automatica') ||
                normPred.includes('alertas automaticas')
            ) {
                const userIdDirect = ctx.from?.id;
                if (userIdDirect) this.userState.delete(userIdDirect);
                const resumen = await this.predictiveQuestionsService.obtenerAlertasTempranasAutomaticas();
                await this.sendLongMessage(ctx, resumen, { parse_mode: 'Markdown' });
                return;
            }

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

            if (await this.handleChartQuery(ctx, messageText)) return;

            if (await this.handleGreeting(ctx, messageText)) return;

            if (await this.handleServiceCali(ctx, messageText)) return;

            if (normPred.includes('mental')) {
                if (await this.mentalHealthQuestionsService.handleMentalHealthQuery(ctx, messageText)) return;
            }

            if (await this.handleAntioquiaQuery(ctx, messageText)) return;

            if (await this.handleVaccination(ctx, messageText, detectedRegion)) return;

            if (await this.handleProviderSearch(ctx, messageText, detectedRegion)) return;

            if (await this.handlePredictiveCapabilitiesQuery(ctx, messageText)) return;

            if (await this.handlePrediction(ctx, messageText)) return;

            if (await this.handleAirQualityQuery(ctx, messageText, detectedRegion)) return;

            // Fallback genérico si no se maneja nada más
            const response = await this.genkitService.generateResponse(messageText);
            await this.sendLongMessage(ctx, response);
        } catch (error) {
            this.logger.error(`Error no controlado en onText para userId=${ctx.from?.id}:`, error);
            // El filtro de excepciones global capturará este error si lo relanzamos o podemos responder directamente aquí.
            // Dada la configuración del TelegramExceptionFilter, relanzar es seguro.
            throw error;
        }
    }

    // ─── Vaccination ────────────────────────────────────────────────────────────
    private async handleVaccination(ctx: Context, text: string, detectedRegion?: string): Promise<boolean> {
        const userId = ctx.from?.id;
        const pending = userId ? this.userState.get(userId) : null;
        const norm = normalizeString(text);
        // Evitar que consultas sobre prestadores/hospitales entren en el manejador de vacunación
        if (
            norm.includes('hospital') ||
            norm.includes('hospitales') ||
            norm.includes('clinica') ||
            norm.includes('clinicas') ||
            norm.includes('cliníca') ||
            norm.includes('clínicas')
        ) {
            this.logger.log('handleVaccination - consulta sobre prestadores detectada, saltando manejador de vacunación');
            return false;
        }
        this.logger.log(`handleVaccination invoked - userId=${userId}, text="${text}", norm="${norm}"`);
        this.logger.log(`handleVaccination - detectedRegion="${detectedRegion}"`);

        this.logger.log(`handleVaccination - entró en bloque general de vacunación? ${norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('informacion sobre vacunas')}`);
        // Detectar si es una pregunta general sobre vacunación (sin región específica)
        if (norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('informacion sobre vacunas')) {
            if (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('departamento')) {
                if (detectedRegion) {
                    const indicators = await this.vaccinationService.getAvailableIndicatorsByDepartment(detectedRegion);
                    if (indicators && indicators.length > 0) {
                        const response = `📊 **Indicadores de vacunación disponibles en ${detectedRegion}:**\n\n${indicators.map(i => `• ${i}`).join('\n')}`;
                        await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                        return true;
                    } else {
                        await ctx.reply(`No se encontraron indicadores de vacunación para ${detectedRegion}.`);
                        return true;
                    }
                }
                await ctx.reply('📍 ¿Para qué departamento deseas consultar los indicadores de vacunación?');
                return true;
            }

            // Pregunta específica sobre indicadores por municipio
            if (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('municipio')) {
                if (detectedRegion) {
                    const indicators = await this.vaccinationService.getAvailableIndicatorsByMunicipio(detectedRegion);
                    if (indicators && indicators.length > 0) {
                        const response = `📊 **Indicadores de vacunación disponibles en ${detectedRegion}:**\n\n${indicators.map(i => `• ${i}`).join('\n')}`;
                        await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                        return true;
                    } else {
                        await ctx.reply(`No se encontraron indicadores de vacunación para ${detectedRegion}.`);
                        return true;
                    }
                }
                await ctx.reply('📍 ¿Para qué municipio deseas consultar los indicadores de vacunación?');
                return true;
            }

            // Pregunta sobre estadísticas por departamento
            if (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('departamento') && detectedRegion) {
                const stats = await this.vaccinationService.getVaccinationStatsByDepartment(detectedRegion);
                await ctx.reply(stats, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta sobre estadísticas por municipio
            if (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('municipio') && detectedRegion) {
                const stats = await this.vaccinationService.getVaccinationStatsByMunicipio(detectedRegion);
                await ctx.reply(stats, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta sobre top departamentos
            if (norm.includes('top') && norm.includes('vacunacion') && (norm.includes('departamentos') || norm.includes('departamento'))) {
                const topDepts = await this.vaccinationService.getTopDepartmentsByCoverage();
                if (topDepts && topDepts.length > 0) {
                    const response = `🏆 **Top 5 Departamentos por Cobertura de Vacunación:**\n\n${topDepts.map((d, i) => `${i + 1}. **${d.departamento}**: ${d.cobertura_de_vacunaci_n}%`).join('\n')}`;
                    await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                    return true;
                }
            }

            // Pregunta sobre filtro por tipo biológico
            const biologicoMatch = text.match(/(?:biol[oó]gico(?:s)?(?:\s+de)?\s*[:\-]?\s*|vacunas?\s+de\s+)([a-z0-9áéíóúñÁÉÍÓÚÑ\s]+)/i);
            if ((norm.includes('biolog') || norm.includes('tipo biol')) && !norm.includes('indicadores') && !norm.includes('estadisticas')) {
                const biologico = biologicoMatch?.[1]?.trim();
                if (!biologico || biologico.length < 2) {
                    await ctx.reply('📍 ¿Cuál es el tipo biológico o vacuna que deseas filtrar?');
                    if (userId) {
                        this.userState.set(userId, { intent: 'vaccination_filter_biologico' });
                    }
                    return true;
                }

                const results = await this.vaccinationService.getVaccinationByBiologico(biologico);
                if (!results || results.length === 0) {
                    await ctx.reply(`No encontré registros de vacunación para el biológico "${biologico}".`);
                    return true;
                }

                const response = `💉 **Vacunación filtrada por biológico: ${biologico}**\n\n${results.slice(0, 20).map(r => `• ${r.departamento} / ${r.indicator1 || 'Indicador'}: ${r.cobertura_de_vacunaci_n}% (${r.biol_gico || 'N/A'})`).join('\n')}`;
                await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta de búsqueda flexible por múltiples criterios
            if ((norm.includes('filtra') || norm.includes('filtro') || norm.includes('buscar') || norm.includes('consulta') || norm.includes('criterios')) &&
                (norm.includes('departamento') || norm.includes('municipio') || norm.includes('biolog') || norm.includes('año') || norm.includes('ano'))) {
                const criteria: { departamento?: string; municipio?: string; biologico?: string; year?: string } = {};
                const deptMatch = text.match(/departamento(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
                const muniMatch = text.match(/municipio(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
                const biologicoTextMatch = text.match(/(?:biol[oó]gico(?:s)?(?:\s+de)?\s*[:\-]?\s*|vacunas?\s+de\s+)([a-z0-9áéíóúñÁÉÍÓÚÑ\s]+)/i);
                const yearMatch = text.match(/\b(19|20)\d{2}\b/);

                if (deptMatch && deptMatch[1]) {
                    criteria.departamento = deptMatch[1].trim();
                }
                if (muniMatch && muniMatch[1]) {
                    criteria.municipio = muniMatch[1].trim();
                }
                if (biologicoTextMatch && biologicoTextMatch[1]) {
                    criteria.biologico = biologicoTextMatch[1].trim();
                }
                if (yearMatch && yearMatch[0]) {
                    criteria.year = yearMatch[0];
                }

                if (Object.keys(criteria).length === 0) {
                    await ctx.reply('📍 ¿Qué criterios quieres usar para la búsqueda de vacunación? Puedes especificar departamento, municipio, tipo biológico o año.');
                    if (userId) {
                        this.userState.set(userId, { intent: 'vaccination_search_criteria' });
                    }
                    return true;
                }

                const results = await this.vaccinationService.searchVaccinationData(criteria);
                if (!results || results.length === 0) {
                    await ctx.reply('No encontré resultados de vacunación con los criterios indicados.');
                    return true;
                }

                const response = `🔎 **Búsqueda de vacunación**\n\n${results.slice(0, 20).map(r => `• ${r.departamento} / ${r.indicator1 || 'Indicador'} (${r.biol_gico || 'N/A'}): ${r.cobertura_de_vacunaci_n}%`).join('\n')}`;
                await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta sobre resumen por año
            if ((norm.includes('resumen') && norm.includes('vacunacion')) || (norm.includes('vacunacion') && norm.includes('año')) || (norm.includes('vacunacion') && norm.includes('ano'))) {
                const summary = await this.vaccinationService.getCoverageSummary();
                await ctx.reply(summary, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta sobre departamentos/municipios disponibles
            if ((norm.includes('municipios') || norm.includes('departamentos')) && norm.includes('vacunacion')) {
                const deptos = await this.vaccinationService.getAllDepartament();
                const municipios = await this.vaccinationService.getAllMunicipios();
                const response = `💉 **Ubicaciones disponibles para vacunación:**\n\n**Departamentos:** ${deptos.slice(0, 10).join(', ')}${deptos.length > 10 ? '...' : ''}\n\n**Municipios:** ${municipios.slice(0, 10).join(', ')}${municipios.length > 10 ? '...' : ''}`;
                await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                return true;
            }

            // Pregunta sobre indicadores altos y bajos por departamento
            const matchesIndicatorsLowHigh = (
                norm.includes('indicadores') &&
                norm.includes('vacunacion') &&
                (norm.includes('bajos') || norm.includes('bajo') || norm.includes('alto') || norm.includes('altos'))
            );
            this.logger.log(`handleVaccination - bloque altos/bajos? ${matchesIndicatorsLowHigh}, detectedRegion="${detectedRegion}"`);
            if (matchesIndicatorsLowHigh) {
                if (detectedRegion) {
                    // Priorizar coincidencia con municipios si la región detectada corresponde a un municipio
                    const municipiosList = await this.vaccinationService.getAllMunicipios();
                    const detectedNorm = normalizeString(detectedRegion);
                    const matchedMunicipio = municipiosList.find(m => {
                        const mNorm = normalizeString(m || '');
                        return mNorm === detectedNorm || mNorm.includes(detectedNorm) || detectedNorm.includes(mNorm);
                    });

                    if (matchedMunicipio) {
                        const highest = await this.vaccinationService.getHighestIndicatorsByMunicipio(matchedMunicipio);
                        const lowest = await this.vaccinationService.getLowestIndicatorsByMunicipio(matchedMunicipio);
                        let response = `📊 **Indicadores de vacunación - ${matchedMunicipio}**\n\n`;
                        if (highest && highest.length > 0) {
                            response += `🏆 **Más altos:**\n${highest.map(h => `• ${h.indicator1}: ${h.cobertura_de_vacunaci_n}%`).join('\n')}\n\n`;
                        }
                        if (lowest && lowest.length > 0) {
                            response += `📉 **Más bajos:**\n${lowest.map(l => `• ${l.indicator1}: ${l.cobertura_de_vacunaci_n}%`).join('\n')}`;
                        }
                        await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                        return true;
                    }

                    // Si no coincide con municipio, tratar como departamento
                    const highestDept = await this.vaccinationService.getHighestIndicatorsByDepartamento(detectedRegion);
                    const lowestDept = await this.vaccinationService.getLowestIndicatorsByDepartamento(detectedRegion);

                    let responseDept = `📊 **Indicadores de vacunación - ${detectedRegion}**\n\n`;
                    if (highestDept && highestDept.length > 0) {
                        responseDept += `🏆 **Más altos:**\n${highestDept.map(h => `• ${h.indicator1}: ${h.cobertura_de_vacunaci_n}%`).join('\n')}\n\n`;
                    }
                    if (lowestDept && lowestDept.length > 0) {
                        responseDept += `📉 **Más bajos:**\n${lowestDept.map(l => `• ${l.indicator1}: ${l.cobertura_de_vacunaci_n}%`).join('\n')}`;
                    }
                    await this.sendLongMessage(ctx, responseDept, { parse_mode: 'Markdown' });
                    return true;
                }
                // Si no se detectó una región desde detectRegion, intentar inferir municipio directamente desde el texto
                if (!detectedRegion) {
                    try {
                        const municipiosList = await this.vaccinationService.getAllMunicipios();
                        const textNorm = normalizeString(text);
                        const matchedFromText = municipiosList.find(m => {
                            const mNorm = normalizeString(m || '');
                            return textNorm.includes(mNorm) || mNorm.includes(textNorm);
                        });
                        if (matchedFromText) {
                            const highest = await this.vaccinationService.getHighestIndicatorsByMunicipio(matchedFromText);
                            const lowest = await this.vaccinationService.getLowestIndicatorsByMunicipio(matchedFromText);
                            let response = `📊 **Indicadores de vacunación - ${matchedFromText}**\n\n`;
                            if (highest && highest.length > 0) {
                                response += `🏆 **Más altos:**\n${highest.map(h => `• ${h.indicator1}: ${h.cobertura_de_vacunaci_n}%`).join('\n')}\n\n`;
                            }
                            if (lowest && lowest.length > 0) {
                                response += `📉 **Más bajos:**\n${lowest.map(l => `• ${l.indicator1}: ${l.cobertura_de_vacunaci_n}%`).join('\n')}`;
                            }
                            await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                            return true;
                        }
                    } catch (err) {
                        this.logger.warn(`Error buscando municipios en texto: ${err.message}`);
                    }
                }

                // Sin región detectada - preguntar por el departamento y guardar estado
                await ctx.reply('📍 ¿Para qué **departamento** deseas consultar los indicadores de vacunación (altos/bajos)?', { parse_mode: 'Markdown' });
                if (userId) {
                    this.userState.set(userId, { intent: 'vaccination_indicators' });
                }
                return true;
            }

            // indicadores altos y bajos por municipio
            const municipios = await this.vaccinationService.getAllMunicipios();
            const municipioLowHigh = (norm.includes('indicadores') &&
                norm.includes('vacunacion') &&
                (norm.includes('bajos') || norm.includes('bajo') || norm.includes('alto') || norm.includes('altos'))
            );

            if (municipioLowHigh) {
                if (detectedRegion) {
                    const detectedNorm = normalizeString(detectedRegion);
                    const matchedMunicipio = municipios.find(m => {
                        const mNorm = normalizeString(m || '');
                        return mNorm === detectedNorm || mNorm.includes(detectedNorm) || detectedNorm.includes(mNorm);
                    });

                    if (matchedMunicipio) {
                        const highest = await this.vaccinationService.getHighestIndicatorsByMunicipio(matchedMunicipio);
                        const lowest = await this.vaccinationService.getLowestIndicatorsByMunicipio(matchedMunicipio);
                        let response = `📊 **Indicadores de vacunación - ${matchedMunicipio}**\n\n`;
                        if (highest && highest.length > 0) {
                            response += `🏆 **Más altos:**\n${highest.map(h => `• ${h.indicator1}: ${h.cobertura_de_vacunaci_n}%`).join('\n')}\n\n`;
                        }
                        if (lowest && lowest.length > 0) {
                            response += `📉 **Más bajos:**\n${lowest.map(l => `• ${l.indicator1}: ${l.cobertura_de_vacunaci_n}%`).join('\n')}`;
                        }
                        await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                        return true;
                    }
                }

                // Sin región detectada o no se reconoció el municipio - preguntar por el municipio y guardar estado
                await ctx.reply('📍 ¿Para qué **municipio** deseas consultar los indicadores de vacunación (altos/bajos)?', { parse_mode: 'Markdown' });
                if (userId) {
                    this.userState.set(userId, { intent: 'vaccination_indicators' });
                }
                return true;
            }


            // Consulta con región detectada - mostrar cobertura
            if (detectedRegion) {
                const coverage = await this.vaccinationService.getCoverageByDepartment(detectedRegion);
                if (coverage && coverage.length > 0) {
                    const response = `💉 **Cobertura de vacunación en ${detectedRegion}:**\n\n${coverage.slice(0, 10).map(c => `${c.indicator1 || 'Indicador'}: ${c.cobertura_de_vacunaci_n}% (${c.biol_gico || 'N/A'})`).join('\n')}`;
                    await this.sendLongMessage(ctx, response, { parse_mode: 'Markdown' });
                    return true;
                }
            }

            // Pregunta general sobre vacunación
            const available = await this.vaccinationService.getAvailabeQuestions();
            await ctx.reply(available, { parse_mode: 'Markdown' });
            this.logger.log(`handleVaccination - respondió con lista general de vacunación`);
            return true;
        }
        this.logger.log(`handleVaccination - SALIENDO false, texto no consideró consulta de vacunación`);
        return false;
    }

    // ─── Antioquia Health Service ─────────────────────────────────────────────
    private async handleAntioquiaQuery(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);

        if (
            norm.includes('analizar riesgo') || norm.includes('riesgos') || norm.includes('riesgo') ||
            norm.includes('analisis de riesgo') || norm.includes('riesgo de') || norm.includes('mental')
        ) {
            return false;
        }

        // Excluir consultas de vacunación para que las maneje handleVaccination
        if (norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('vacunas') || norm.includes('vacun')) {
            return false;
        }

        const mentionsAntioquia = norm.includes('antioquia');
        if (!mentionsAntioquia) return false;

        const result = await this.antioquiaQuestionsService.processAntioquiaQuery(text);
        if (!result) return false;

        await this.sendLongMessage(ctx, result, { parse_mode: 'Markdown' });
        return true;
    }

    // ─── Cali Health Service ────────────────────────────────────────────────────
    private async handleServiceCali(ctx: Context, text: string): Promise<boolean> {
        const norm = normalizeString(text);

        if (norm.includes('analizar riesgo') || norm.includes('clasificar riesgo') || norm.includes('riesgo de') || norm.includes('riesgos')
            || norm.includes('riesgo')) {
            return false;
        } else

            if (
                (norm.includes('indicadores') && norm.includes('altos') || norm.includes('vacunacion')) ||
                (norm.includes('altos') && norm.includes('indicadores') && norm.includes('vacunacion')) ||
                (norm.includes('vacunacion') && norm.includes('indicadores')) ||
                (norm.includes('indicadores') && norm.includes('bajos')) ||
                (norm.includes('bajos') && norm.includes('indicadores')) ||
                (norm.includes('indicadores') && norm.includes('altos') && norm.includes('bajos')) ||
                (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('altos')) ||
                (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('bajos')) ||
                (norm.includes('indicadores') && norm.includes('vacunacion') && norm.includes('altos') && norm.includes('bajos')) ||
                (norm.includes('indicadores') && norm.includes('altos') && norm.includes('bajos') && norm.includes('vacunacion')) ||
                norm.includes('vacunacion')

            ) {
                return false;
            }

        const mentionsCali = norm.includes('cali');
        if (!mentionsCali) return false;

        const result = await this.caliHealthService.processCaliQuery(text);
        if (!result) return false;

        await ctx.reply(result.respuesta, { parse_mode: 'Markdown' });
        return true;
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
            case 'vaccination_indicators':
                // Reanudar consulta de indicadores de vacunación altos/bajos con la región indicada
                if (userId) this.userState.delete(userId);
                return await this.handleVaccination(ctx, text, region);
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
                (norm.includes('que informacion tienes') && norm.includes('salud mental')) ||
                norm.includes('mental')

            ) {
                await ctx.reply(await this.mentalHealthQuestionsService.getAvailableQuestions(), {
                    parse_mode: 'Markdown',
                });
                return;
            }

            if (
                norm.includes('que informacion tienes') && norm.includes('salud mental') ||
                norm.includes('mental')


            ) {
                await ctx.reply(await this.mentalHealthQuestionsService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                return;
            }
            if (norm.includes('que informacion tienes') && norm.includes('salud pública')) {
                await ctx.reply(await this.saludPublicaQuestionsService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                return;
            }

            if (norm.includes('que informacion tienes') && norm.includes('análisis de riesgo')) {
                await ctx.reply(await this.predictiveQuestionsService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                return;
            }
            if (norm.includes('que informacion tienes') || norm.includes('sabes') && norm.includes('calidad del aire')) {
                await ctx.reply(await this.airQualityQuestionsService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                return;
            }
            if (norm.includes('que informacion tienes') && norm.includes('vacunacion')) {
                // Responder con las preguntas disponibles del servicio de vacunación
                if (this.vaccinationService && typeof this.vaccinationService.getAvailableQuestions === 'function') {
                    await ctx.reply(await this.vaccinationService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                    return;
                }
            }
            if (norm.includes('que informacion tienes') && norm.includes('gráficos')) {
                await ctx.reply(await this.graphicsQuestionsService.getAvailableQuestions(), { parse_mode: 'Markdown' });
                return;
            }

            if (norm.includes('que enfermedad es mas ') && (norm.includes('urbana') || norm.includes('rural'))) {
                const respuesta = await this.saludPublicaQuestionsService.processPublicHealthQuery(text);
                if (respuesta) {
                    await ctx.reply(respuesta, { parse_mode: 'Markdown' });
                }
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

                const analysis = await this.predictiveQuestionsService.clasificarRiesgo(event, detectedRegion);
                if (userId) this.userState.delete(userId);
                if (analysis) {
                    await this.sendLongMessage(ctx, analysis, { parse_mode: 'Markdown' });
                    return true;
                }
                return false;
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

${this.getCommonQuestionMenu()}`,
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


        // excluyo calidad del aire
        if (norm.includes('calidad') || norm.includes('aire') || norm.includes('mental')) {
            return false;
        }

        // Valido que excluya las palabras analis de riesgo, riesgos
        if ((!isYopalQuery) || norm.includes('analizar riesgo') || norm.includes('analisis de riesgo') || norm.includes('riesgo de')
            || norm.includes('riesgos') || norm.includes('riesgo'))
            return false;

        // valido que no  contnetga las palabras Vacunas, Municipio,departamentos
        if (
            (norm.includes('vacunas') && norm.includes('municipios') && norm.includes('departamentos')) ||
            (norm.includes('vacunas') && norm.includes('municipios')) ||
            (norm.includes('vacunas') && norm.includes('departamentos')) ||
            (norm.includes('vacunacion') && norm.includes('municipios') && norm.includes('departamentos')) ||
            (norm.includes('vacunacion') && norm.includes('municipios')) ||
            (norm.includes('vacunacion') && norm.includes('departamentos')) ||
            norm.includes('vacunas') || norm.includes('vacunacion')

        )
            return false;

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

    //Manejador de Provedores de salud 
    private async handleProviderSearch(
        ctx: Context,
        text: string,
        detectedRegion?: string,
    ): Promise<boolean> {
        const userId = ctx.from?.id;
        const norm = normalizeString(text);

        if (
            norm.includes('analizar riesgo') ||
            norm.includes('analisis de riesgo') ||
            norm.includes('analisis de riesgo') ||
            norm.includes('clasificar riesgo') ||
            norm.includes('riesgos') ||
            norm.includes('riesgo') ||
            norm.includes('riesgo de')
        ) return false;

        const providerCapabilities = await this.saludPublicaQuestionsService.processProviderCapabilitiesQuery(text);
        if (providerCapabilities) {
            await this.sendLongMessage(ctx, providerCapabilities, { parse_mode: 'Markdown' });
            return true;
        }

        // Excluir consultas de vacunación para que las maneje handleVaccination
        if (
            norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('vacunas') || norm.includes('vacun') ||
            norm.includes('biologico') || norm.includes('biol_gico') || norm.includes('cobertura')
        ) {
            return false;
        }

        // Responder a consultas generales sobre vacunación
        if (
            norm.includes('informacion') &&
            (norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('vacunas') || norm.includes('vacun'))
        ) {
            if (this.vaccinationService && typeof this.vaccinationService.getAvailableQuestions === 'function') {
                const q = await this.vaccinationService.getAvailableQuestions();
                await ctx.reply(q, { parse_mode: 'Markdown' });
                return true;
            }
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

        if (
            lowerText.includes('prediccion') ||
            lowerText.includes('pronostico') ||
            lowerText.includes('que puedes predecir') ||
            lowerText.includes('predecir') ||
            lowerText.includes('proyeccion') ||
            lowerText.includes('clasificar riesgo') ||
            lowerText.includes('puedes predecir riesgos') ||
            lowerText.includes('alerta temprana')
        ) {
            await this.sendPredictiveOverview(ctx);
            return true;
        }

        return false;
    }

    private async sendPredictiveOverview(ctx: Context): Promise<void> {
        const eventsList = RISK_EVENTS.slice(0, 8).map(e => `• ${e}`).join('\n');

        let availableLocations: string[] = [];
        try {
            const [vaccinationDeptos, airQualityMunis] = await Promise.all([
                this.vaccinationService.getAllDepartament(),
                this.airQualityService.getAllMunicipios(),
            ]);

            const combined = [...vaccinationDeptos, ...airQualityMunis];
            const unique = Array.from(new Set(combined.map(l => l.trim()))).filter(l => l.length > 2);
            availableLocations = unique.slice(0, 10);
        } catch (error) {
            this.logger.warn(`Error obteniendo ubicaciones disponibles: ${error.message}`);
        }

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

        if (!finalEventName) {
            finalEventName = RISK_ANALYSIS_KEYWORDS.find((k) => lowerText.includes(k)) || '';
        }

        if (!region && !lowerText.includes(' en ')) {
            if (finalEventName) {
                try {
                    const clasificacion = await this.predictiveQuestionsService.clasificarRiesgo(finalEventName, departamento);
                    if (clasificacion) {
                        if (userId !== undefined) this.userState.delete(userId!);
                        await this.sendLongMessage(ctx, clasificacion, { parse_mode: 'Markdown' });
                        return true;
                    }
                } catch (error) {
                    this.logger.warn(`Error en clasificarRiesgo para ${finalEventName} en ${departamento}: ${error.message}`);
                }
                const prediction = await this.predictionService.predictRisk(departamento, finalEventName);
                if (userId !== undefined) this.userState.delete(userId!);
                await this.sendLongMessage(ctx, prediction);
                return true;
            }
            await ctx.reply(`🔮 ¿En qué **municipio o departamento** deseas realizar la predicción de riesgo para **${finalEventName}**?`, { parse_mode: 'Markdown' });
            if (userId) this.userState.set(userId, { intent: 'predict_risk', data: { event: finalEventName } });
            return true;
        }

        try {
            const clasificacion = await this.predictiveQuestionsService.clasificarRiesgo(finalEventName, departamento);
            if (clasificacion) {
                if (userId !== undefined) this.userState.delete(userId!);
                await this.sendLongMessage(ctx, clasificacion, { parse_mode: 'Markdown' });
                return true;
            }
        } catch (error) {
            this.logger.warn(`Error en clasificarRiesgo para ${finalEventName} en ${departamento}: ${error.message}`);
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

        if (
            !norm.includes('calidad del aire') &&
            !norm.includes('calidad aire') &&
            !norm.includes('aire') &&
            pending?.intent !== 'air_quality'
        ) return false;

        let region = detectedRegion;
        if (!region) {
            const matchCalidadAire = norm.match(/calidad\s+(?:del\s+)?aire\s+en\s+([a-z\s]+?)(?:\s*[,]|$)/i);
            if (matchCalidadAire && matchCalidadAire[1]) {
                region = matchCalidadAire[1].trim().toUpperCase();
            }
        }

        if (!region) {
            let municipiosDisponibles = 'Amazonas, Antioquia, Arauca, Atlántico, Bogotá, Bolívar, Boyacá, Caldas, Caquetá, Casanare, Cauca, Cesar, Chocó, Córdoba, Cundinamarca, Guainía, Guaviare, Huila, La Guajira, Magdalena, Meta, Nariño, Norte de Santander, Putumayo, Quindío, Risaralda, San Andrés, Santander, Sucre, Tolima, Valle del Cauca, Vaupés, Vichada';
            try {
                const munis = await this.airQualityService.getAllMunicipios();
                if (munis && munis.length > 0) {
                    municipiosDisponibles = munis.slice(0, 30).join(', ');
                }
            } catch (e) {
                this.logger.warn(`Error obteniendo municipios: ${e.message}`);
            }
            await ctx.reply(
                `☁️ **Consulta de Calidad del Aire**\n\n` +
                `Puedo consultar la calidad del aire para los siguientes municipios y departamentos:\n\n` +
                `${municipiosDisponibles}\n\n` +
                `💬 *Por ejemplo:* "Calidad del aire en Bogotá" o "Indicadores ambientales en Medellín"`,
                { parse_mode: 'Markdown' }
            );
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
            (norm.includes('salud publica') && (norm.includes('info') || norm.includes('informacion'))) ||
            norm === 'salud publica'
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
        this.logger.log(`handleServiceCapabilitiesQuery - userId=${userId}, norm="${norm}"`);

        const riskResponse = await this.predictiveQuestionsService.processPredictiveQuery(text);
        if (riskResponse) {
            await ctx.reply(riskResponse.respuesta, { parse_mode: 'Markdown' });
            if (riskResponse.tipo === 'listado_riesgos' && userId) {
                this.userState.set(userId, { intent: 'predict_risk' });
            }
            return true;
        }

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
            norm.includes('riesgos') ||
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
            norm.includes('graficar') ||
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
        // 🚨 PRIORIDAD 1: ALERTAS TEMPRANAS AUTOMÁTICAS → análisis completo y automatizado
        // Debe ir ANTES que "alerta temprana" genérico para evitar captura prematura
        if (
            norm.includes('alertas tempranas automaticas') ||
            norm.includes('alerta temprana automatica') ||
            norm.includes('alertas automaticas') ||
            (norm.includes('alertas tempranas') && norm.includes('automaticas'))
        ) {
            if (userId) this.userState.delete(userId);
            const resumen = await this.predictiveQuestionsService.obtenerAlertasTempranasAutomaticas();
            await this.sendLongMessage(ctx, resumen, { parse_mode: 'Markdown' });
            return true;
        }

        // Pregunta 1: "Alertas tempranas de salud pública" → resumen general
        // NOTA: Excluye "automatica" para evitar conflicto con la prioridad superior
        if (
            (norm.includes('alertas tempranas') && !norm.includes('automaticas')) ||
            (norm.includes('alerta temprana') && !norm.includes('automatica')) ||
            norm.includes('alertas de salud')
        ) {
            if (userId) this.userState.delete(userId);
            const resumen = await this.predictiveQuestionsService.obtenerAlertasTempranas();
            await this.sendLongMessage(ctx, resumen, { parse_mode: 'Markdown' });
            return true;
        }

        // Pregunta 2: "¿Qué eventos requieren atención inmediata?" → solo EMERGENCIA + ALERTA
        if (norm.includes('que eventos requieren atencion')) {
            if (userId) this.userState.delete(userId);
            const respuesta = await this.predictiveQuestionsService.obtenerEventosAtencionInmediata();
            await this.sendLongMessage(ctx, respuesta, { parse_mode: 'Markdown' });
            return true;
        }

        // Pregunta 3.0 Que departamentos pueds predecir riesgos
        if (norm.includes('que departamentos tienes informacion de riesgos') || norm.includes('departamentos')
            && norm.includes('riegos')
        ) {
            if (userId) this.userState.delete(userId);
            const respuesta = await this.predictiveQuestionsService.listarUbicacionesDisponibles();
            await this.sendLongMessage(ctx, respuesta.join('\n'), { parse_mode: 'Markdown' });
            return true;
        }


        if (norm.includes('predictivo') || norm.includes('clasificacion')
            && norm.includes('riesgo') || norm.includes('alertas') || norm.includes('prediccion avanzada') &&
            norm.includes('riesgos') || norm.includes('riesgo')
        ) {
            if (userId) this.userState.delete(userId);
            const respuesta = await this.predictiveQuestionsService.listarEventosDisponibles();
            await this.sendLongMessage(ctx, respuesta, { parse_mode: 'Markdown' });
            return true;
        }

        // Pregunta 3: "Panorama de riesgo epidemiológico" → distribución geográfica y factores
        if (norm.includes('panorama de riesgo')) {
            if (userId) this.userState.delete(userId);
            const respuesta = await this.predictiveQuestionsService.obtenerPanoramaRiesgoEpidemiologico();
            await this.sendLongMessage(ctx, respuesta, { parse_mode: 'Markdown' });
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

            // Extracción mejorada para manejar frases como "tendencia de zika en los proximos meses en Cali"
            // Primero intentar extraer el evento (antes del primer "en")
            const eventoMatch = norm.match(/(?:tendencia de|pronostico de|prediccion de|proyeccion de)\s+([a-záéíóúñ]+)/);
            let eventoEspecifico = eventoMatch?.[1]?.trim() || (pending?.data as { event?: string } | undefined)?.event;

            // Validar que el evento extraído no sea una palabra temporal como "proximos", "meses", etc.
            if (eventoEspecifico && (eventoEspecifico.includes('proximos') || eventoEspecifico.includes('meses'))) {
                eventoEspecifico = undefined;
            }

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
            norm.includes('analizar riesgo de') ||
            norm.includes('analisis de riesgo con ia') ||
            norm.includes('random forest') ||
            norm.includes('machine learning') ||
            (norm.includes('riesgo') && norm.includes('inteligencia artificial')) ||
            pending?.intent === 'ml_classification'
        ) {
            const region = detectedRegion || 'Colombia';

            const eventoMatch = norm.match(/(?:clasificar riesgo de|analizar riesgo de|riesgo de|analisis de)\s+([a-z\s]+?)(?:\s+en\s+|$)/);
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
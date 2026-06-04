import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Logger } from '@nestjs/common';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { AntioquiaHealthService } from './antioquia-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SaludAnaliticaService } from './salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService, Intencion } from './sexual-health.service';
import { AirQualityService } from './air-quality.service';
import { PredictionService } from './prediction.service';
import { EMERGENCY_PROTOCOLS } from './emergency-protocols';
import { ChartService } from './chart.service';
import { VaccinationService } from './vaccination.service';
import { normalizeString, sanitizeLogInput } from '../shared/health-utils';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthQuestionsService } from './mental-health-questions.service';

@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  private userState = new Map<number, { intent: string; data?: any }>();

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
  ) {}

  private async handleChartQuery(ctx: Context, text: string): Promise<boolean> {
    const norm = normalizeString(text);
    const sanitizedText = sanitizeLogInput(text);
    console.log(`DEBUG: handleChartQuery - norm="${norm}"`);
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    const isChartRequest =
      norm.includes('grafic') ||
      norm.includes('visual') ||
      norm.includes('mostrar') ||
      norm.includes('ver') ||
      pending?.intent === 'chart_air_quality' ||
      pending?.intent === 'chart_vaccination';

    if (!isChartRequest) return false;

    // DETERMINAR REGIÓN PRIMERO (Usando límites de palabra para evitar que "cali" coincida con "calidad")
    const region = this.detectRegion(text)?.toUpperCase();

    // 1. CALIDAD DEL AIRE (Si menciona aire o ambiental, tiene prioridad la ciudad detectada)
    if (
      norm.includes('aire') ||
      norm.includes('ambiental') ||
      norm.includes('contaminacion') ||
      pending?.intent === 'chart_air_quality'
    ) {
      console.log(
        `DEBUG: handleChartQuery - Matched Air Quality Chart for region: ${region || 'COLOMBIA'}`,
      );

      if (!region) {
        await ctx.reply(
          '☁️ ¿De qué **municipio o departamento** deseas visualizar la calidad del aire? (Ej: "Graficar aire en Cali")',
          { parse_mode: 'Markdown' },
        );
        if (userId !== undefined)
          // Corregido: intent debe ser 'chart_air_quality'
          this.userState.set(userId!, { intent: 'chart_air_quality' });
        return true;
      }

      const targetRegion = region;
      const aireData =
        await this.airQualityService.getAirQualityByMunicipio(targetRegion);

      if (aireData && aireData.length > 0) {
        if (userId !== undefined) this.userState.delete(userId!);
        // Eliminar duplicados basándose en el nombre de la variable
        const uniqueVariables = Array.from(
          new Map(aireData.map((v: any) => [v.variable, v])).values(),
        );

        // Tomamos las variables más comunes
        const variables = uniqueVariables.slice(0, 6);
        const labels = variables.map((v: any) => v.variable);
        const data = variables.map((v: any) => parseFloat(v.promedio));

        const chartUrl = this.chartService.generateBarChart(
          labels,
          data,
          `Calidad del Aire en ${targetRegion} (Promedios)`,
        );

        await ctx.replyWithPhoto(chartUrl, {
          caption: `🍃 Visualización de los indicadores ambientales más recientes para ${targetRegion}.`,
        });
        return true;
      }
    }

    // 2. CALI HEALTH (Solo si la región es Cali y no es sobre aire)
    if (region === 'CALI' || norm.includes('servicios')) {
      console.log(`DEBUG: handleChartQuery - Matched Cali Health Chart`);
      const stats = this.caliHealthService.getStatsByCategory();
      const chartUrl = this.chartService.generatePieChart(
        stats.labels,
        stats.data,
        'Servicios de Salud en Cali (Top Categorías)',
      );

      await ctx.replyWithPhoto(chartUrl, {
        caption:
          '📊 Aquí tienes la distribución de los servicios de salud en Cali por categorías principales.',
      });
      return true;
    }

    // 3. SALUD MENTAL (Top Diagnósticos)
    if (
      norm.includes('mental') ||
      norm.includes('psicologia') ||
      norm.includes('psiquiatria') ||
      norm.includes('depresion') ||
      norm.includes('ansiedad') ||
      norm.includes('trastorno') ||
      norm.includes('esquizo') ||
      norm.includes('bipol') ||
      norm.includes('demencia') ||
      norm.includes('delirio') ||
      norm.includes('psicosis') ||
      norm.includes('mania') ||
      norm.includes('spa')
    ) {
      console.log(`DEBUG: handleChartQuery - Matched Mental Health Chart`);
      const top = await this.mentalHealthService.getTopDiagnoses(6);
      const labels = top.map((d) =>
        d.diagnostico_ingreso.length > 20
          ? d.diagnostico_ingreso.substring(0, 17) + '...'
          : d.diagnostico_ingreso,
      );
      const data = top.map((d) => d.total);

      const chartUrl = this.chartService.generateBarChart(
        labels,
        data,
        'Top Diagnósticos de Salud Mental (Colombia)',
      );

      await ctx.replyWithPhoto(chartUrl, {
        caption:
          '🧠 Estos son los diagnósticos de salud mental más frecuentes según los registros nacionales.',
      });
      return true;
    }

    // 4. SALUD PÚBLICA (Top Eventos Nacionales)
    if (
      norm.includes('salud publica') ||
      norm.includes('eventos') ||
      norm.includes('enfermedades')
    ) {
      console.log(`DEBUG: handleChartQuery - Matched Public Health Chart`);
      const top = await this.healthDataService.getTopEvents(6);
      const labels = top.map((e) =>
        e.nombre_del_evento.length > 20
          ? e.nombre_del_evento.substring(0, 17) + '...'
          : e.nombre_del_evento,
      );
      const data = top.map((e) => e.total_de_eventos);

      const chartUrl = this.chartService.generateBarChart(
        labels,
        data,
        'Top Eventos de Interés en Salud Pública (Colombia)',
      );

      await ctx.replyWithPhoto(chartUrl, {
        caption:
          '🔬 Estos son los eventos de salud pública con mayor incidencia reportada a nivel nacional según SIVIGILA 2026.',
      });
      return true;
    }

    // 5. DISTRIBUCIÓN POR SEXO O ZONA (SIVIGILA)
    const eventKeywords = [
      'tuberculosis',
      'dengue',
      'zika',
      'malaria',
      'sarampion',
      'rubeola',
      'hepatitis',
      'rabia',
    ];
    const detectedEvent = eventKeywords.find((k) => norm.includes(k));

    if (detectedEvent) {
      const stats =
        await this.healthDataService.getStatsForEvent(detectedEvent);
      if (stats) {
        // Caso A: Por Sexo
        if (norm.includes('sexo') || norm.includes('genero')) {
          const chartUrl = this.chartService.generatePieChart(
            ['Femenino', 'Masculino'],
            [stats.femenino, stats.masculino],
            `Distribución por Sexo: ${stats.nombre_del_evento}`,
          );
          await ctx.replyWithPhoto(chartUrl, {
            caption: `👥 Proporción de hombres y mujeres afectados por **${stats.nombre_del_evento}** según el reporte nacional.`,
            parse_mode: 'Markdown',
          });
          return true;
        }

        // Caso B: Por Zona (Urbano/Rural)
        if (
          norm.includes('zona') ||
          norm.includes('urbano') ||
          norm.includes('rural')
        ) {
          const chartUrl = this.chartService.generatePieChart(
            ['Urbano', 'Rural'],
            [stats.urbano, stats.rural],
            `Distribución por Zona: ${stats.nombre_del_evento}`,
          );
          await ctx.replyWithPhoto(chartUrl, {
            caption: `📍 Impacto de **${stats.nombre_del_evento}** en áreas urbanas frente a rurales.`,
            parse_mode: 'Markdown',
          });
          return true;
        }

        // Caso C: Tendencia Temporal (Líneas)
        if (
          norm.includes('tendencia') ||
          norm.includes('historico') ||
          norm.includes('evolucion')
        ) {
          const series =
            await this.healthDataService.getTemporalSeries(detectedEvent);
          const labels = series.map((s) =>
            s.date.toLocaleDateString('es-CO', { month: 'short' }),
          );
          const data = series.map((s) => s.cases);

          const chartUrl = this.chartService.generateLineChart(
            labels,
            data,
            `Tendencia de ${stats.nombre_del_evento} (6 meses)`,
          );
          await ctx.replyWithPhoto(chartUrl, {
            caption: `📈 Evolución proyectada de casos de **${stats.nombre_del_evento}** basada en el acumulado anual histórico.`,
            parse_mode: 'Markdown',
          });
          return true;
        }
      }
    }

    // 6. VACUNACIÓN (Coberturas por Departamento)
    if (norm.includes('vacun') || pending?.intent === 'chart_vaccination') {
      console.log(`DEBUG: handleChartQuery - Matched Vaccination Chart`);

      if (!region) {
        await ctx.reply(
          '💉 ¿De qué **departamento** deseas visualizar la cobertura de vacunación? (Ej: "Graficar vacunas en Antioquia")',
          { parse_mode: 'Markdown' },
        );
        if (userId !== undefined)
          this.userState.set(userId!, { intent: 'chart_vaccination' });
        return true;
      }

      const targetRegion = region;
      const coberturas =
        await this.vaccinationService.getCoverageByDepartment(targetRegion);

      if (coberturas && coberturas.length > 0) {
        if (userId !== undefined) this.userState.delete(userId!);
        const dataMap = new Map<string, number>();
        coberturas.forEach((c) => {
          const rawVal = parseFloat(c.cobertura_de_vacunaci_n);
          // Normalización: si es <= 1 se trata como proporción, si es > 1 como porcentaje directo
          const val = rawVal <= 1 ? rawVal * 100 : rawVal;
          if (!isNaN(val)) dataMap.set(c.biol_gico, val);
        });

        // Ordenar por cobertura de mayor a menor y tomar los top 8 para claridad
        const sorted = Array.from(dataMap.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8);

        const labels = sorted.map(([l]) => l);
        const data = sorted.map(([, d]) => d);

        const chartUrl = this.chartService.generatePieChart(
          labels,
          data,
          `Cobertura de Vacunación en ${targetRegion} (%)`,
        );

        await ctx.replyWithPhoto(chartUrl, {
          caption: `💉 Visualización de las coberturas de vacunación reportadas en **${targetRegion}**.`,
        });
        return true;
      }
    }

    return false;
  }

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private async sendPersonalizedGreeting(ctx: Context) {
    const firstName = ctx.from?.first_name || 'usuario';
    const greeting = this.getTimeGreeting();
    const welcomeMessage = `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud pública con **cobertura nacional**.

Ahora cuento con acceso a datos oficiales (SIVIGILA nacional), archivos locales y fuentes ambientales para ofrecerte información, análisis y recomendaciones.

✨ **¿Qué preguntas soy capaz de responder?**
El bot está diseñado para responder a consultas de alta precisión basadas en datos reales (no solo lenguaje natural):

📍 **Búsqueda Geográfica y Logística:**
-  "¿Donde hay un Hospital cerca de mi?"
-  "Buscar cliníca cerca de mi"
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"
- "Lista de municipios de Boyacá con centros de salud."

📊 **Estadísticas e Inteligencia Epidemiológica:**
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "¿Cuál es la tendencia de la tuberculosis en los últimos 6 meses?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

🛡️ **Análisis de Riesgo y Vacunación:**
- "Analizar riesgo de sarampión en Antioquia" (revisaré casos vs. cobertura de vacuna TV).
- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

🧠 **Salud Mental y Sexual (CIE-10 y Protocolos):**
- "¿Cuál es el diagnóstico de salud mental más común en niños?"
- "¿Cuál es el perfil de riesgo para la ansiedad?"
- "¿Qué derechos tengo para la prevención del VIH?"

🍃 **Monitoreo Ambiental:**
- "¿Cómo está la calidad del aire hoy en Cali?"
- "Graficar contaminación ambiental en Medellín."

💬 ¿Sobre qué tema te gustaría consultar hoy?`;

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

    if (ctx.from?.id) {
      await this.userService.markAsGreeted(ctx.from.id);
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    await this.sendPersonalizedGreeting(ctx);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(
      `🤖 **Menú de Ayuda - Salud IA**

✨ **¿Qué preguntas soy capaz de responder?**
Estoy diseñado para responder a consultas de alta precisión basadas en datos oficiales:

🔬 Salud Pública (SIVIGILA):
• Enfermedades Transmisibles: Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Varicela, Hepatitis A, B y C
• Eventos de Violencia: Violencia de género e intrafamiliar, agresiones por animales (rabia)
• Otros: Desnutrición aguda, intento de suicidio, defectos congénitos, intoxicaciones, accidentes ofídicos

📍 **Búsqueda Geográfica y Logística:**
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"
- "Lista de municipios de Boyacá con centros de salud."


📊 **Estadísticas e Inteligencia Epidemiológica:**
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "¿Cuál es la tendencia de la tuberculosis en los últimos 6 meses?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

🛡️ **Análisis de Riesgo y Vacunación:**
- "Analizar riesgo de sarampión en Antioquia"
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

  private escapeMarkdown(text: string): string {
    return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  private async sendLongMessage(
    ctx: Context,
    text: string,
    options: { parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' } = {},
  ) {
    const MAX_LENGTH = 4000;
    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text, options);
      return;
    }

    let currentPosition = 0;
    while (currentPosition < text.length) {
      let endPosition = currentPosition + MAX_LENGTH;

      if (endPosition < text.length) {
        const lastNewline = text.lastIndexOf('\n', endPosition);
        if (lastNewline > currentPosition) {
          endPosition = lastNewline;
        }
      }

      await ctx.reply(text.substring(currentPosition, endPosition), options);
      currentPosition = endPosition;
    }
  }

  @On('location')
  async onLocation(@Ctx() ctx: Context) {
    if (!ctx.message || !('location' in ctx.message)) return;

    const { latitude, longitude } = ctx.message.location;
    const userId = ctx.from?.id;
    const firstName = ctx.from?.first_name || 'usuario';
    const pending = userId ? this.userState.get(userId) : null;
    if (pending?.intent === 'provider_search_location') {
      this.userState.delete(userId!);
    }

    this.logger.log(
      `DEBUG: onLocation - User ${userId} (${firstName}) sent location: Lat ${latitude}, Lon ${longitude}`,
    );

    // Solo se procesará para Yopal por ahora, ya que tiene las coordenadas en el XML
    // TODO: Considerar geocodificación para Antioquia y Boyacá si el proyecto lo escala.
    const radiusKm = 5; // Radio de búsqueda por defecto en KM

    const nearbyProviders = await this.yopalHealthService.findNearby(
      latitude,
      longitude,
      radiusKm,
    );

    if (nearbyProviders && nearbyProviders.length > 0) {
      let response = `📍 **Prestadores de Salud cercanos en Yopal (dentro de ${radiusKm} km):**

`;
      nearbyProviders.slice(0, 5).forEach((p, index) => {
        const contacts = this.yopalHealthService.getProviderContacts(p);
        response += `*${index + 1}. ${this.escapeMarkdown(p.entidad_2 || 'N/A')}*
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

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const messageText = (ctx.message as { text: string }).text;

    // Detectar región para posibles análisis posteriores
    const detectedRegion = this.detectRegion(messageText);

    // PRIORIDAD 0: Continuidad de la conversación
    // Si hay un proceso pendiente (como esperar el municipio para SPA), lo resolvemos primero.
    if (
      await this.handleConversationContinuity(ctx, messageText, detectedRegion)
    )
      return;

    // Flujo de prioridades
    // 1. PRIORIDAD ABSOLUTA: Consultas de Datos Estructurales (Conteos y Listas)
    // Se ejecuta primero porque handleProviderSearch a veces intercepta estas consultas erróneamente
    if (await this.handleStructuralDataQuery(ctx, messageText, detectedRegion))
      return;

    if (await this.handleChartQuery(ctx, messageText)) return;
    if (await this.handleGreeting(ctx, messageText)) return;

    // PRIORIDAD: SALUD MENTAL (antes de statsService para evitar bypass incorrecto)
    if (await this.handleMentalHealthQuery(ctx, messageText)) return;

    if (await this.handleProviderSearch(ctx, messageText, detectedRegion))
      return;
    if (await this.handleYopalQuery(ctx, messageText)) return;
    if (await this.handlePrediction(ctx, messageText)) return;
    if (await this.handleAirQualityQuery(ctx, messageText, detectedRegion))
      return;

    // ESTADÍSTICAS Y COMPARATIVAS (StatsService)
    const contextData = await this.statsService.getSummary(messageText);
    const bypassMarkers = [
      '--- ANÁLISIS',
      '--- RANKING',
      '--- DISTRIBUCIÓN',
      '--- ANÁLISIS GLOBAL',
      '--- SALUD MENTAL',
      '--- PERFIL DE RIESGO',
      '--- COMPARATIVA SIVIGILA',
      'En el grupo de',
      'La enfermedad de salud mental que más afecta',
    ];

    if (
      contextData &&
      bypassMarkers.some((marker) => contextData.includes(marker))
    ) {
      await this.sendLongMessage(ctx, contextData);
      return;
    }

    // ANÁLISIS DE RIESGO E INCIDENCIA DETALLADA
    if (await this.handleSexualHealthQuery(ctx, messageText)) return;
    if (await this.handleRiskAnalysis(ctx, messageText, detectedRegion)) return;
    if (await this.handleSaludPublica(ctx, messageText, detectedRegion)) return;

    // MANEJO GENERAL (IA con contexto)
    await this.handleGeneralQuery(ctx, messageText, contextData);
  }

  private async handleConversationContinuity(
    ctx: Context,
    text: string,
    region?: string,
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;
    if (!pending || !region) return false;

    // Solo reanudamos si es una respuesta corta (máximo 3 palabras, ej: "En Yopal")
    const isShortResponse = text.trim().split(/\s+/).length <= 3;
    if (!isShortResponse) return false;

    console.log(
      `DEBUG: handleConversationContinuity - Reanudando intent "${pending.intent}" para region "${region}"`,
    );

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

  private async handleMentalHealthQuery(
    ctx: Context,
    text: string,
  ): Promise<boolean> {
    const norm = normalizeString(text);

    // Detectar si es una consulta de salud mental por palabras clave
    const isMentalHealth =
      norm.includes('salud mental') ||
      norm.includes('psicologia') ||
      norm.includes('psiquiatria') ||
      norm.includes('depresion') ||
      norm.includes('ansiedad') ||
      norm.includes('trastorno') ||
      norm.includes('esquizo') ||
      norm.includes('bipol') ||
      norm.includes('demencia') ||
      norm.includes('delirio') ||
      norm.includes('psicosis') ||
      norm.includes('mania') ||
      norm.includes('agorafobia') ||
      norm.includes('retraso') ||
      norm.includes('spa') ||
      (norm.includes('diagnostico') && norm.includes('mental'));

    // Detectar perfil de riesgo o factor de riesgo (puede venir solo sin otras palabras clave)
    const isRiskProfileQuery =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    // También detectar por menciones de ciclos de vida + diagnóstico/salud
    const isLifeCycleQuery =
      (norm.includes('ninos') ||
        norm.includes('nino') ||
        norm.includes('adolescente') ||
        norm.includes('jovenes') ||
        norm.includes('joven') ||
        norm.includes('adultos') ||
        norm.includes('adulto') ||
        norm.includes('mayores') ||
        norm.includes('mayor')) &&
      (norm.includes('diagnostico') ||
        norm.includes('frecuente') ||
        norm.includes('comunes') ||
        norm.includes('mental') ||
        norm.includes('salud'));

    if (!isMentalHealth && !isLifeCycleQuery && !isRiskProfileQuery)
      return false;

    // Detectar cuando preguntan por perfil/factor de riesgo sin especificar diagnóstico
    const hasRiskKeyword =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    // Si pregunta por riesgo pero no menciona ninguna patología clave
    const isGenericRiskQuery =
      hasRiskKeyword &&
      !norm.includes('depres') &&
      !norm.includes('ansied') &&
      !norm.includes('trastorn') &&
      !norm.includes('esquizo') &&
      !norm.includes('bipol') &&
      !norm.includes('spa') &&
      !norm.includes('dengue') &&
      !norm.includes('zika') &&
      !norm.includes('chikun') &&
      !norm.includes('malaria') &&
      !norm.includes('tuberculosis') &&
      !norm.includes('vih') &&
      !norm.includes('sifilis') &&
      !norm.includes('cancer') &&
      !norm.includes('anticoncep');

    if (isGenericRiskQuery) {
      let list = '🧠 **Salud Mental (CIE-10):**\n';
      list += '- Episodios depresivos (graves, moderados)\n';
      list += '- Trastornos de ansiedad (mixtos, fóbicos)\n';
      list += '- Trastorno Afectivo Bipolar\n';
      list += '- Esquizofrenia y trastornos psicóticos\n';
      list += '- Consumo de sustancias psicoactivas (SPA)';

      list += '\n\n🔬 **Salud Pública (SIVIGILA):**\n';
      list +=
        '• _Enfermedades Transmisibles:_ Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Varicela, Hepatitis A, B y C\n';
      list +=
        '• _Eventos de Violencia:_ Violencia de género e intrafamiliar, agresiones por animales (rabia)\n';
      list +=
        '• _Otros:_ Desnutrición aguda, intento de suicidio, defectos congénitos, intoxicaciones, accidentes ofídicos';

      list += '\n\n❤️ **Salud Sexual y Reproductiva:**\n';
      list += '- Prevención y derechos en VIH/SIDA\n';
      list += '- Sífilis (incluyendo gestacional y congénita)\n';
      list += '- Cáncer de cuello uterino y mama (VPH)\n';
      list += '- Métodos anticonceptivos y derechos reproductivos';

      await ctx.reply(
        '❓ No detecté de qué patología deseas conocer el perfil de riesgo.\n\n' +
          'Por favor, especifica la enfermedad. Aquí tienes las áreas que manejo:\n\n' +
          list +
          '\n\n**Ejemplo:** "¿Cuál es el perfil de riesgo de depresión?" o "Riesgo de dengue"',
        { parse_mode: 'Markdown' },
      );
      return true;
    }

    const explicitDiagnosis =
      await this.mentalHealthService.getStatsForDiagnosis(text);

    // 1. Consulta general sobre capacidades
    if (
      norm.includes('que informacion tienes') ||
      norm.includes('que puedes') ||
      norm.includes('ayuda') ||
      norm.includes('como funciona') ||
      norm.includes('que sabes')
    ) {
      await ctx.reply(
        this.mentalHealthQuestionsService.getAvailableQuestions(),
        {
          parse_mode: 'Markdown',
        },
      );
      return true;
    }

    // 2. Top diagnósticos
    if (
      norm.includes('frecuente') ||
      norm.includes('top') ||
      norm.includes('mas comunes')
    ) {
      const top = await this.mentalHealthService.getTopDiagnoses(5);
      const lines = top.map(
        (d, i) => `${i + 1}. **${d.diagnostico_ingreso}**: ${d.total} casos`,
      );
      await ctx.reply(
        `🧠 **Top diagnósticos de salud mental:**\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }

    // 3. Distribución por edad/ciclo de vida
    if (norm.includes('distribucion') && norm.includes('edad')) {
      const dist = await this.mentalHealthService.getAgeDistribution();
      const lines = [
        `👤 Menor a 1 año: ${dist.menor_a_1}`,
        `👶 1-4 años: ${dist.de_1_a_4}`,
        `🧒 5-9 años: ${dist.de_5_a_9}`,
        `🧑 10-14 años: ${dist.de_10_a_14}`,
        `🧑 15-19 años: ${dist.de_15_a_19}`,
        `👨 20-49 años: ${dist.de_20_a_49}`,
        `🧔 50-64 años: ${dist.de_50_a_64}`,
        `👴 65+ años: ${dist._65_y_mas}`,
      ];
      await ctx.reply(
        `📊 **Distribución por edad en salud mental:**\n\n${lines.join('\n')}\n\n📈 Total: ${dist.total_global} casos`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }

    // 4. Diagnósticos por ciclo de vida
    // IMPORTANTE: Verificar primero los ciclos más específicos antes que los generales
    // para evitar que 'adulto' coincida con 'adolescente'
    const cycleKeywords = [
      { keys: ['adolescente', 'adolescentes'], cycle: 'adolescentes' },
      { keys: ['jovenes', 'joven'], cycle: 'jovenes' },
      { keys: ['mayores', 'mayor'], cycle: 'mayores' },
      { keys: ['ninos', 'nino', 'nena'], cycle: 'niños' },
      { keys: ['adultos', 'adulto'], cycle: 'adultos' },
    ];

    for (const { keys, cycle } of cycleKeywords) {
      const hasCycle = keys.some((k) => norm.includes(k));
      if (
        hasCycle &&
        (norm.includes('diagnostico') ||
          norm.includes('frecuente') ||
          norm.includes('comunes'))
      ) {
        const top = await this.mentalHealthService.getTopByLifeCycle(cycle, 3);
        if (top.length > 0) {
          const lines = top.map(
            (d) => `- **${d.diagnostico_ingreso}**: ${d.total_en_ciclo} casos`,
          );
          await ctx.reply(
            `🧠 **Diagnósticos más frecuentes en ${cycle}:**\n\n${lines.join('\n')}`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }
    }

    // 5. Perfil de riesgo para diagnóstico específico
    if (
      (norm.includes('perfil') || norm.includes('factor')) &&
      norm.includes('riesgo')
    ) {
      // Extraer el nombre del diagnóstico del texto
      let diagName =
        explicitDiagnosis?.diagnostico_ingreso ||
        text
          .replace(/[¿?]/g, '') // Eliminar signos de interrogación al inicio y final
          .replace(/(perfil|factor) de riesgo (de |del )?/i, '')
          .replace(/en salud mental/i, '')
          .replace(/cu[áa]l\s+es\s+el/i, '') // Manejar tildes y espacios
          .replace(/^\s*(el|la|los|las)\s+/i, '') // Eliminar artículos sobrantes al inicio
          .trim();

      // Limpieza adicional para evitar que "perfil de riesgo" quede en el nombre
      diagName = diagName.replace(/perfil de riesgo/gi, '').trim();

      // Si no se especificó diagnóstico o quedó muy corto, mostrar enfermedades disponibles
      if (!diagName || diagName.length < 3) return false; // Permitir que generic query lo atrape arriba

      const profile =
        await this.mentalHealthService.getRiskProfileByDiagnosis(diagName);
      if (profile) {
        const lines = Object.entries(profile.distribucion).map(
          ([cycle, count]) => `- ${cycle}: ${count}`,
        );
        await ctx.reply(
          `🧠 **Perfil de riesgo: ${profile.diagnostico}**\n\nTotal: ${profile.total} casos\n\n**Distribución por ciclo de vida:**\n${lines.join('\n')}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      } else {
        await ctx.reply(
          `⚠️ No encontré datos específicos sobre el factor o perfil de riesgo para "${diagName}" en mis registros de salud mental.`,
        );
        return true;
      }
    }

    // 6. Comparativa entre diagnósticos
    if (norm.includes('compara') && norm.includes(' vs ')) {
      const parts = text.split(/\s+vs\s+/i);
      if (parts.length === 2) {
        const d1Name = parts[0].replace(/compara\s*/i, '').trim();
        const d2Name = parts[1].trim();
        const comp =
          await this.mentalHealthService.getComparisonBetweenDiagnoses(
            d1Name,
            d2Name,
          );
        if (comp) {
          await ctx.reply(
            `⚖️ **Comparativa:**\n\n**${comp.d1.diagnostico_ingreso}:** ${comp.d1.total} casos\n**${comp.d2.diagnostico_ingreso}:** ${comp.d2.total} casos`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }
    }

    // 7. Búsqueda de diagnóstico específico
    const cleanSearch = text
      .replace(/cuantos? casos hay de?/i, '')
      .replace(/casos de?/i, '')
      .replace(/\?/g, '')
      .trim();

    if (cleanSearch.length > 3) {
      const stats =
        await this.mentalHealthService.getStatsForDiagnosis(cleanSearch);
      if (stats) {
        await ctx.reply(
          `🧠 **${stats.diagnostico_ingreso}**\n\n` +
            `📊 **Total:** ${stats.total} casos\n` +
            `🆔 **Código:** ${stats.codigo_dx_ingreso}\n` +
            `📅 **Año:** ${stats.a_o_diagn_stico}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }

    return false;
  }

  private async handleSexualHealthQuery(
    ctx: Context,
    text: string,
  ): Promise<boolean> {
    const results = await this.sexualHealthService.searchByKeyword(text);
    if (results && results.length > 0) {
      const answer = results[0].respuesta;
      await this.sendLongMessage(ctx, answer);
      return true;
    }
    return false;
  }

  private async handleGeneralQuery(
    ctx: Context,
    text: string,
    preFetchedContext?: string,
  ) {
    const contextData =
      preFetchedContext || (await this.statsService.getSummary(text));

    const respuestaProfesionalNoInformacion = `Lo siento, no tengo información sobre ese tema en mi base de datos actual. 
    
    Mi especialidad es la salud pública en Colombia. Puedo ayudarte con:
    1. 🏢 Buscar hospitales, clínicas y prestadores de servicios de salud en diversas ciudades.
    2. 🔬 Consultar estadísticas oficiales (SIVIGILA) y análisis de riesgo de enfermedades.
    3. 🧠 Recibir orientación sobre salud mental y perfiles de riesgo.
    4. 🛡️ Acceder a protocolos de emergencia.
    5. ❤️ Obtener guías sobre salud sexual y reproductiva.

    ¿Te gustaría consultar alguna de estas áreas?`;

    let augmentedPrompt = text;
    if (contextData && !contextData.includes('[INFO]')) {
      augmentedPrompt = `
### CONTEXTO DE DATOS REALES (COLOMBIA) ###
${contextData}
### FIN DEL CONTEXTO ###

INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. 
Si el contexto no contiene información relevante para responder la consulta, responde EXACTAMENTE con este mensaje: "${respuestaProfesionalNoInformacion}"
Si el contexto contiene estadísticas, limítate a analizarlas y presentarlas. NO generes información que no esté presente en el contexto.

Consulta: ${text}
      `;
    } else {
      augmentedPrompt = `Consulta: ${text}

INSTRUCCIÓN: Como asistente experto en salud pública colombiana, si la consulta no está relacionada con tus capacidades (servicios de salud, estadísticas de salud pública, salud mental o sexual), responde EXACTAMENTE con este mensaje: "${respuestaProfesionalNoInformacion}"`;
    }

    try {
      const norm = normalizeString(text);
      // Detección más robusta
      if (
        norm.includes('que informacion tienes') &&
        norm.includes('salud mental')
      ) {
        await ctx.reply(
          this.mentalHealthQuestionsService.getAvailableQuestions(),
          {
            parse_mode: 'Markdown',
          },
        );
        return;
      }

      const response =
        await this.genkitService.generateResponse(augmentedPrompt);
      await this.sendLongMessage(ctx, response);
    } catch (error) {
      await ctx.reply(
        '⚠️ Lo siento, mi servicio de inteligencia artificial no está disponible en este momento. Por favor, intenta de nuevo en unos minutos.',
      );
    }
  }

  private async handleRiskAnalysis(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const norm = text.toLowerCase();
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    const isRiskAnalysis =
      ((norm.includes('riesgo') || norm.includes('analizar')) &&
        !norm.includes(' vs ')) ||
      pending?.intent === 'risk_analysis';

    if (!isRiskAnalysis) return false;

    if (norm.includes('calidad del aire')) return false; // Handled by air quality

    // Intentar extraer el evento (ej: tuberculosis, dengue)
    const keywords = [
      'tuberculosis',
      'dengue',
      'zika',
      'malaria',
      'sarampion',
      'rubeola',
      'fiebre amarilla',
      'hepatitis',
      'polio',
      'tos ferina',
    ];
    const event =
      keywords.find((k) => norm.includes(k)) || pending?.data?.event;

    if (event) {
      try {
        if (!detectedRegion) {
          await ctx.reply(
            `🛡️ ¿En qué **municipio o departamento** deseas analizar el riesgo de **${event}**?`,
            { parse_mode: 'Markdown' },
          );
          if (userId)
            this.userState.set(userId, {
              intent: 'risk_analysis',
              data: { event },
            });
          return true;
        }

        const region = detectedRegion;
        const analysis = await this.saludAnaliticaService.analizarRiesgoEvento(
          event,
          region,
        );
        if (userId) this.userState.delete(userId);
        await this.sendLongMessage(ctx, analysis);
        return true;
      } catch (error) {
        console.error('Error in handleRiskAnalysis:', error);
      }
    }
    return false;
  }

  private detectRegion(text: string): string | undefined {
    const departments = [
      'Amazonas',
      'Antioquia',
      'Arauca',
      'Atlántico',
      'Bolívar',
      'Boyacá',
      'Caldas',
      'Caquetá',
      'Casanare',
      'Cauca',
      'Cesar',
      'Chocó',
      'Córdoba',
      'Cundinamarca',
      'Guainía',
      'Guaviare',
      'Huila',
      'La Guajira',
      'Magdalena',
      'Meta',
      'Nariño',
      'Norte de Santander',
      'Putumayo',
      'Quindío',
      'Risaralda',
      'San Andrés',
      'Santander',
      'Sucre',
      'Tolima',
      'Valle del Cauca',
      'Vaupés',
      'Vichada',
    ];

    const capitals = [
      'Leticia',
      'Medellín',
      'Arauca',
      'Barranquilla',
      'Cartagena',
      'Tunja',
      'Manizales',
      'Florencia',
      'Yopal',
      'Popayán',
      'Valledupar',
      'Quibdó',
      'Montería',
      'Bogotá',
      'Inírida',
      'San José del Guaviare',
      'Neiva',
      'Riohacha',
      'Santa Marta',
      'Villavicencio',
      'Pasto',
      'Cúcuta',
      'Mocoa',
      'Armenia',
      'Pereira',
      'Bucaramanga',
      'Sincelejo',
      'Ibagué',
      'Cali',
      'Mitú',
      'Puerto Carreño',
    ];

    const majorValle = [
      'Buga',
      'Tuluá',
      'Palmira',
      'Jamundí',
      'Cartago',
      'Buenaventura',
      'Yumbo',
      'Candelaria',
      'Florida',
      'El Cerrito',
      'Sevilla',
      'Zarzal',
      'Caicedonia',
      'Guacarí',
      'Roldanillo',
    ];

    const others = [
      'valle',
      'capresoca',
      'coomeva',
      'medimas',
      'sanitas',
      'nueva eps',
      'coosalud',
      'horo',
      'orinoquia',
      'atioquia', // Typo common
    ];

    const regions = [...departments, ...capitals, ...majorValle, ...others];

    const cleanText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents for better matching
      .replace(/\s+/g, ' ') // Normalizar espacios
      .replace(/k/g, 'c')
      .trim();

    const matchedRegion = regions.find((r) => {
      const cleanRegion = r
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/k/g, 'c');
      // Usamos límites de palabra (\b) para evitar que "cali" coincida con "calidad"
      const regex = new RegExp(`\\b${cleanRegion}\\b`, 'i');
      return regex.test(cleanText);
    });

    return matchedRegion === 'atioquia' ? 'Antioquia' : matchedRegion;
  }

  private escapeRegexChar(char: string): string {
    return /[.*+?^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }

  private buildAccentInsensitivePattern(input: string): string {
    const normalized = input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const words = normalized
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word
          .split('')
          .map((char) => {
            switch (char) {
              case 'a':
                return '[aá]';
              case 'e':
                return '[eé]';
              case 'i':
                return '[ií]';
              case 'o':
                return '[oó]';
              case 'u':
                return '[uúü]';
              default:
                return this.escapeRegexChar(char);
            }
          })
          .join(''),
      );

    return words.join('\\s+');
  }

  private removeDetectedRegionFromSearchTerm(
    text: string,
    detectedRegion: string,
  ): string {
    const regionPattern = this.buildAccentInsensitivePattern(detectedRegion);
    const regionRegex = new RegExp(`\\b(?:en\\s+)?${regionPattern}\\b`, 'i');
    return text.replace(regionRegex, '').replace(/\s+/g, ' ').trim();
  }

  private async handleGreeting(ctx: Context, text: string): Promise<boolean> {
    const userId = ctx.from?.id;
    const isGreeting =
      /^(hola|buenos dias|buenas tardes|buenas noches|saludos|hi|hello|\/start|que sabes hacer|que puedes hacer)/i.test(
        text.trim(),
      );
    // Log sanitizado para evitar log injection
    console.log(
      `DEBUG: handleGreeting - userId=${userId}, isGreeting=${isGreeting}`,
    );

    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      console.log(`DEBUG: handleGreeting - Greeting new user`);
      return true;
    } else if (isGreeting) {
      console.log(`DEBUG: handleGreeting - Greeting existing user`);
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
- "¿Cuál es el diagnóstico de salud mental más común en niños?"
- "¿Qué derechos tengo para la prevención del VIH?"

🍃 **Monitoreo Ambiental:**
- "¿Cómo está la calidad del aire hoy en Cali?"

¿Qué necesitas consultar hoy?`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }
    console.log(`DEBUG: handleGreeting - No greeting detected`);
    return false;
  }

  private async handleYopalQuery(ctx: Context, text: string): Promise<boolean> {
    try {
      const lcQuery = text.toLowerCase();
      const cleanQuery = lcQuery.replace(/\s+/g, '').replace(/k/g, 'c');

      if (
        lcQuery.includes('yopal') ||
        ['capresoca', 'coomeva', 'horo', 'orinoquia'].some((e) =>
          cleanQuery.includes(e.replace(/k/g, 'c')),
        )
      ) {
        const { content, found } =
          await this.yopalHealthService.answerNaturalQuestion(text);

        if (found) {
          await this.sendLongMessage(ctx, content, {
            parse_mode: 'Markdown',
          });
          return true;
        }
      }
    } catch (err) {
      console.error('Yopal bypass failed', err);
    }
    return false;
  }

  private formatProviderResult(provider: any, source: string): string {
    const name = (
      provider.sede ||
      provider.nombre_de_sede ||
      provider.nombreprestador ||
      provider.entidad_2 ||
      provider.razon_social ||
      'Centro de salud'
    ).toString();

    const address = (
      provider.direccion ||
      provider.direcci_n ||
      'Dirección no disponible'
    ).toString();

    const phone = (
      provider.telefono ||
      provider.tel_fono ||
      'Teléfono no disponible'
    ).toString();

    const city =
      provider.ciudad ||
      provider.municipio ||
      provider.departamento ||
      provider.nombre_centro_poblado ||
      '';
    const extra =
      provider.servicio ||
      provider.grupo ||
      provider.claseprestador ||
      provider.caracter ||
      '';

    let result = `🏥 *${this.escapeMarkdown(this.cleanEncoding(name))}*\n`;
    result += `📍 ${this.escapeMarkdown(this.cleanEncoding(address))}\n`;
    if (city) {
      result += `📌 ${this.escapeMarkdown(this.cleanEncoding(city.toString()))}\n`;
    }
    result += `📞 ${this.escapeMarkdown(phone)}`;
    if (extra) {
      result += `\nℹ️ ${this.escapeMarkdown(extra)}`;
    }
    result += `\n*Fuente:* ${this.escapeMarkdown(source)}`;
    return result;
  }

  private cleanEncoding(text: string | undefined): string {
    if (!text) return '';
    return text
      .replace(/Ã‘/g, 'Ñ')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã“/g, 'Ó')
      .replace(/Ã³/g, 'ó')
      .replace(/Ã/g, 'Í')
      .replace(/Ã­/g, 'í')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã©/g, 'é')
      .replace(/Ãš/g, 'Ú')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Á')
      .replace(/Ã¡/g, 'á')
      .replace(/Â°/g, '°')
      .replace(/NÂº/g, 'N°');
  }

  private isProviderLocationQuery(text: string): boolean {
    const norm = text.toLowerCase();
    return /(?:donde\s+(?:queda|esta|est[áa])|d[oó]nde\s+queda|d[oó]nde\s+est[áa]|ubicaci[oó]n|direcci[oó]n|direccion|ubicado|ubicada|localizaci[oó]n|busca(?:r)?\s.*(?:hospital|cl[ií]nica|eps|centro|sede|prestador|servicio)|(?:hospital(?:es)?|cl[ií]nica[s]?|centro[s]?|sede[s]?|prestador(?:es)?|servicio[s]?|eps)\b|c[oó]digo\s+(?:de\s+)?(?:habilitaci[oó]n|prestador))/.test(
      norm,
    );
  }

  private isNearbyLocationQuery(text: string): boolean {
    const norm = text.toLowerCase();
    return /(?:\bcerca\b|\bcercano\b|\bcercana\b|\bmás cercano\b|\bmas cercano\b|\bm[áa]s cerca\b|\ba mi alrededor\b|\bpr[óo]ximo\b|\bpr[óo]xima\b|\bmi ubicaci[oó]n\b|\bcerca de m[ií]\b)/.test(
      norm,
    );
  }

  private async requestLocationForNearbyProviders(
    ctx: Context,
    userId?: number,
  ) {
    const replyText =
      '📍 por ahora te puedo ayudar a buscar prestadores de servicios de salud en Yopal, en un radio de 5Km cercanos, por favor comparte tu ubicación usando el botón de ubicación de Telegram.';
    await ctx.reply(replyText, {
      reply_markup: {
        keyboard: [
          [
            {
              text: 'Enviar ubicación',
              request_location: true,
            },
          ],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    if (userId !== undefined) {
      this.userState.set(userId, { intent: 'provider_search_location' });
    }
  }

  private async handleStructuralDataQuery(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const norm = normalizeString(text);
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    console.log(
      `DEBUG: handleStructuralDataQuery - region="${detectedRegion}"`,
    );

    // 1. Detección de intención
    const isCountQuery =
      /cuantos?\s+(?:hospitales|centros|prestadores)/.test(norm) ||
      pending?.intent === 'count_providers';
    const isListQuery =
      ((norm.includes('lista') ||
        norm.includes('muestreme') ||
        norm.includes('cuales') ||
        norm.includes('ver')) &&
        (norm.includes('municipios') ||
          norm.includes('pueblos') ||
          norm.includes('ciudades') ||
          norm.includes('prestadores'))) ||
      pending?.intent === 'list_structural';

    if (!isCountQuery && !isListQuery) return false;

    // 0. Bloqueo de Consultas Masivas (Prioridad sobre todo lo demás)
    const isBroadSearch =
      norm.includes('todos') ||
      norm.includes('todo') ||
      norm.includes('complet');
    const involvesProviders =
      norm.includes('prestador') ||
      norm.includes('hospital') ||
      norm.includes('centro');

    if (isBroadSearch && involvesProviders) {
      await ctx.reply(
        '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").',
      );
      if (userId) this.userState.delete(userId);
      return true;
    }

    // 2. PERSISTENCIA: Si falta la región
    if (!detectedRegion) {
      const msg = isCountQuery
        ? '📊 ¿De qué **municipio o departamento** deseas saber el conteo de servicios de salud?'
        : '📍 ¿De qué **municipio o departamento** deseas ver la lista de municipios o prestadores?';
      await ctx.reply(msg, { parse_mode: 'Markdown' });
      if (userId)
        this.userState.set(userId, {
          intent: isCountQuery ? 'count_providers' : 'list_structural',
        });
      return true;
    }

    const region = detectedRegion.toLowerCase();
    let handled = false;

    // 3. Ejecución de Conteo
    if (isCountQuery) {
      console.log(`DEBUG: handleStructuralDataQuery - Matched Count Query`);
      if (region.includes('boyac')) {
        const count = this.boyacaHealthService.getHospitalCount();
        await ctx.reply(
          `📊 En **Boyacá** he encontrado **${count}** hospitales y centros de salud registrados.`,
        );
        handled = true;
      } else if (region.includes('antioquia')) {
        const count = this.antioquiaHealthService.searchProviders(
          'hospital',
          1000,
        ).length;
        await ctx.reply(
          `📊 En **Antioquia** he encontrado aproximadamente **${count}** hospitales registrados.`,
        );
        handled = true;
      } else if (region.includes('yopal')) {
        await ctx.reply(
          `📊 En **Yopal** tengo registros de diversos prestadores de salud.`,
        );
        handled = true;
      }
    }

    // 4. Ejecución de Listas
    if (isListQuery && !handled) {
      console.log(`DEBUG: handleStructuralDataQuery - Matched List Query`);

      // Caso específico: Lista de Municipios
      if (
        norm.includes('municipio') ||
        norm.includes('pueblo') ||
        norm.includes('ciudad')
      ) {
        let municipios: string[] = [];
        let regionName = '';

        if (region.includes('antioquia')) {
          municipios = this.antioquiaHealthService.getMunicipios();
          regionName = 'Antioquia';
        } else if (region.includes('boyac')) {
          municipios = this.boyacaHealthService.getMunicipios();
          regionName = 'Boyacá';
        }

        if (municipios.length > 0) {
          if (userId !== undefined) this.userState.delete(userId!);
          const list = municipios.slice(0, 50).join(', ');
          const total = municipios.length;
          await this.sendLongMessage(
            ctx,
            `📍 **Municipios disponibles en ${regionName} (${total}):**\n\n${list}${total > 50 ? '... y más.' : ''}\n\n💡 *Tip: Puedes buscar prestadores escribiendo el nombre de cualquiera de estos municipios.*`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }

      // Caso específico: Lista/Resumen de Prestadores en una región
      if (norm.includes('prestador')) {
        if (region.includes('boyac')) {
          if (userId !== undefined) this.userState.delete(userId!);
          const summary = this.boyacaHealthService.getKnowledgeSummary();
          await ctx.reply(
            `🏢 **Boyacá:** ${summary}\n\n💡 *Tip: Para ver prestadores específicos, busca por nombre de municipio o código.*`,
          );
          return true;
        }
        if (region.includes('antioquia')) {
          if (userId !== undefined) this.userState.delete(userId!);
          const summary = this.antioquiaHealthService.getKnowledgeSummary();
          await ctx.reply(`🏢 **Antioquia:** ${summary}`);
          return true;
        }
      }
    }

    if (handled) {
      if (userId !== undefined) this.userState.delete(userId!);
      return true;
    }

    return false;
  }

  private async searchProvidersAcrossServices(
    query: string,
  ): Promise<Array<{ source: string; provider: any }>> {
    const results: Array<{ source: string; provider: any }> = [];

    const caliMatches = this.caliHealthService.findByIdentifier(query);
    const caliSearchMatches = this.caliHealthService.searchProviders(query);
    const boyacaMatches = this.boyacaHealthService.findByIdentifier(query);
    const boyacaSearchMatches = this.boyacaHealthService.searchProviders(query);
    const antioquiaMatches = this.antioquiaHealthService.searchProviders(
      query,
      10,
    );
    const yopalMatches =
      this.yopalHealthService.findByIdentifier?.(query) || [];
    const yopalSearchMatches = this.yopalHealthService.searchProviders(query);

    const sanitizedQuery = sanitizeLogInput(query);
    console.log(
      `DEBUG: searchProvidersAcrossServices - Cali=${caliMatches.length}, CaliSearch=${caliSearchMatches.length}, ` +
        `BoyacaId=${boyacaMatches.length}, BoyacaSearch=${boyacaSearchMatches.length}, ` +
        `Antioquia=${antioquiaMatches.length}, YopalId=${yopalMatches.length}, YopalSearch=${yopalSearchMatches.length}`,
    );

    const pushUnique = (
      service: string,
      providers: any[],
      keyFn: (provider: any) => string,
    ) => {
      for (const provider of providers) {
        const key = `${service}|${keyFn(provider)}`;
        if (
          !results.some(
            (item) =>
              item.source === service &&
              keyFn(item.provider) === keyFn(provider),
          )
        ) {
          results.push({ source: service, provider });
        }
      }
    };

    if (caliMatches && caliMatches.length > 0) {
      pushUnique(
        'Cali',
        caliMatches,
        (provider) =>
          provider.sede || provider.servicio || provider.direccion || '',
      );
    }
    if (caliSearchMatches && caliSearchMatches.length > 0) {
      pushUnique(
        'Cali',
        caliSearchMatches,
        (provider) =>
          provider.sede || provider.servicio || provider.direccion || '',
      );
    }

    if (boyacaMatches && boyacaMatches.length > 0) {
      pushUnique(
        'Boyacá',
        boyacaMatches,
        (provider) =>
          provider.nombre_de_sede ||
          provider.razon_social ||
          provider.direccion ||
          '',
      );
    }
    if (boyacaSearchMatches && boyacaSearchMatches.length > 0) {
      pushUnique(
        'Boyacá',
        boyacaSearchMatches,
        (provider) =>
          provider.nombre_de_sede ||
          provider.razon_social ||
          provider.direccion ||
          '',
      );
    }

    if (antioquiaMatches && antioquiaMatches.length > 0) {
      pushUnique(
        'Antioquia',
        antioquiaMatches,
        (provider) =>
          provider.nombreprestador ||
          provider.nombre_sede ||
          provider.nit ||
          '',
      );
    }

    if (yopalMatches && yopalMatches.length > 0) {
      pushUnique(
        'Yopal',
        yopalMatches,
        (provider) =>
          provider.entidad_2 || provider.servicio || provider.direccion || '',
      );
    }
    if (yopalSearchMatches && yopalSearchMatches.length > 0) {
      pushUnique(
        'Yopal',
        yopalSearchMatches,
        (provider) =>
          provider.entidad_2 || provider.servicio || provider.direccion || '',
      );
    }

    return results;
  }

  private async handleProviderSearch(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const isLocationQuery = this.isProviderLocationQuery(text);
    const isNearbySearch = this.isNearbyLocationQuery(text);
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    if (
      !isLocationQuery &&
      !isNearbySearch &&
      pending?.intent !== 'provider_search'
    )
      return false;

    if (isNearbySearch) {
      await this.requestLocationForNearbyProviders(ctx, userId);
      return true;
    }

    const norm = normalizeString(text);

    // 0. Bloqueo de Consultas Masivas
    if (
      norm.includes('todos') ||
      norm.includes('todo') ||
      norm.includes('complet')
    ) {
      await ctx.reply(
        '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").',
      );
      if (userId !== undefined) this.userState.delete(userId!);
      return true;
    }

    // 1. Extraer término de búsqueda limpio (quitando la región si está presente para mayor precisión)
    let searchTerm = text;
    if (detectedRegion) {
      searchTerm = this.removeDetectedRegionFromSearchTerm(
        text,
        detectedRegion,
      );
      // Si el término quedó vacío o es muy corto, usamos el texto original
      if (searchTerm.length < 3) searchTerm = text;
    }

    // 2. CASO A: Sin ciudad especificada -> Búsqueda automática en todas las bases (Cali, Yopal, etc)
    if (!detectedRegion) {
      const allMatches = await this.searchProvidersAcrossServices(searchTerm);
      if (allMatches.length > 0) {
        const uniqueMatches = this.aggregateProviderResults(allMatches);
        const response = uniqueMatches
          .slice(0, 5)
          .map((item) => this.formatProviderResult(item.provider, item.source))
          .join('\n\n');

        if (userId !== undefined) this.userState.delete(userId!);
        await ctx.reply(
          `🔍 He encontrado estos resultados en mi base de datos:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      // Si no hay resultados y la consulta es corta, preguntamos la región como antes
      if (norm.split(' ').length < 3) {
        await ctx.reply(
          '🏢 ¿En qué **municipio o departamento** deseas buscar servicios de salud?',
        );
        if (userId) this.userState.set(userId, { intent: 'provider_search' });
        return true;
      }
    }

    // 3. CASO B: Con ciudad especificada -> Búsqueda dirigida a la región
    const region = detectedRegion?.toLowerCase() || '';
    if (region.includes('cali') || region.includes('valle')) {
      const caliMatches = this.caliHealthService.searchProviders(searchTerm);
      if (caliMatches.length > 0) {
        const response = caliMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Cali'))
          .join('\n\n');
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
          ctx,
          ` Resultados encontrados en **Cali**:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré resultados de servicios de salud en **Cali**. Intenta especificar otra sede, servicio o municipio dentro de Cali.`,
      );
      return true;
    }

    if (region.includes('boyac')) {
      const boyacaMatches =
        this.boyacaHealthService.findByIdentifier(searchTerm);
      if (boyacaMatches.length > 0) {
        const response = boyacaMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Boyacá'))
          .join('\n\n');
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
          ctx,
          `📍 Resultados encontrados en **Boyacá**:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré resultados de servicios de salud en **Boyacá**. Intenta especificar otro nombre de sede, NIT o municipio.`,
      );
      return true;
    }

    if (region.includes('medell')) {
      const antioquiaMatches = this.antioquiaHealthService.searchProviders(
        searchTerm,
        10,
      );
      if (antioquiaMatches.length > 0) {
        const response = antioquiaMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Antioquia'))
          .join('\n\n');
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
          ctx,
          `📍 Resultados encontrados en **Medellín (Antioquia)**:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré resultados de servicios de salud en **Medellín**. Intenta especificar otro nombre de sede, NIT o busca otra clínica/hospital en esa ciudad.`,
      );
      return true;
    }

    if (region.includes('antioquia')) {
      const antioquiaMatches = this.antioquiaHealthService.searchProviders(
        searchTerm,
        10,
      );
      if (antioquiaMatches.length > 0) {
        const response = antioquiaMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Antioquia'))
          .join('\n\n');
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
          ctx,
          `📍 Resultados encontrados en **Antioquia**:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré resultados de servicios de salud en **Antioquia**. Intenta especificar otro nombre de sede, NIT o busca otra clínica/hospital en ese departamento.`,
      );
      return true;
    }

    if (region.includes('yopal')) {
      const yopalMatches = this.yopalHealthService.searchProviders(searchTerm);
      if (yopalMatches.length > 0) {
        const response = yopalMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Yopal'))
          .join('\n\n');
        if (userId !== undefined) this.userState.delete(userId!);
        await this.sendLongMessage(
          ctx,
          ` Resultados encontrados en **Yopal**:\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }

      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré resultados de servicios de salud en **Yopal**. Por favor, intenta con otro nombre o pregunta por otro municipio.`,
      );
      return true;
    }

    // 4. Fallback final global por si la detección de región fue incorrecta o falló
    const finalMatches = await this.searchProvidersAcrossServices(searchTerm);
    if (finalMatches.length > 0) {
      if (userId !== undefined) this.userState.delete(userId!);
      const uniqueMatches = this.aggregateProviderResults(finalMatches);
      const response = uniqueMatches
        .slice(0, 5)
        .map((item) => this.formatProviderResult(item.provider, item.source))
        .join('\n\n');

      const regionName = detectedRegion ? ` para **${detectedRegion}**` : '';
      await ctx.reply(
        `🔍 Resultados encontrados${regionName}:\n\n${response}`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }

    return false;
  }

  private aggregateProviderResults(
    allMatches: Array<{ source: string; provider: any }>,
  ): Array<{ source: string; provider: any }> {
    const uniqueMatches = new Map<string, { source: string; provider: any }>();
    for (const item of allMatches) {
      const p = item.provider;
      // Clave de unicidad basada en nombre y dirección para evitar duplicados entre Cali y Yopal
      const key = `${item.source}|${p.sede || p.nombre_de_sede || p.nombreprestador || p.entidad_2 || p.razon_social || p.direccion || ''}`;
      if (!uniqueMatches.has(key)) uniqueMatches.set(key, item);
    }
    return Array.from(uniqueMatches.values());
  }

  private async handlePrediction(ctx: Context, text: string): Promise<boolean> {
    const lowerText = text.toLowerCase();
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    // 1. Predicción de Riesgo (Nueva Funcionalidad)
    const isRiskPred =
      lowerText.includes('predecir riesgo') ||
      pending?.intent === 'predict_risk';
    if (isRiskPred) {
      const parts = lowerText.replace('predecir riesgo de', '').split(' en ');
      const eventName = pending?.data?.event || parts[0].trim();
      const region = this.detectRegion(text);
      const departamento = region || 'Antioquia';

      if (!eventName) {
        await this.sendLongMessage(
          ctx,
          "Por favor, especifica un evento. Ejemplo: 'predecir riesgo de dengue en Cali'",
        );
        return true;
      }

      if (!region && !lowerText.includes(' en ')) {
        await ctx.reply(
          `🔮 ¿En qué **municipio o departamento** deseas realizar la predicción de riesgo para **${eventName}**?`,
          { parse_mode: 'Markdown' },
        );
        if (userId)
          this.userState.set(userId, {
            intent: 'predict_risk',
            data: { event: eventName },
          });
        return true;
      }

      const prediction = await this.predictionService.predictRisk(
        departamento,
        eventName,
      );
      if (userId !== undefined) this.userState.delete(userId!);
      await this.sendLongMessage(ctx, prediction);
      return true;
    }

    // 2. Predicción de Casos (Funcionalidad anterior)
    const isCasePred =
      lowerText.startsWith('predecir casos') ||
      pending?.intent === 'predict_cases';
    if (isCasePred) {
      const eventName = lowerText.replace('predecir casos', '').trim();

      if (!eventName) {
        await this.sendLongMessage(
          ctx,
          "Por favor, especifica un evento. Ejemplo: 'predecir casos dengue'",
        );
        return true;
      }

      const resultado =
        await this.saludPublicaService.procesarPregunta(eventName);
      if (!resultado.evento) {
        await this.sendLongMessage(
          ctx,
          'No encontré ese evento para predecir.',
        );
        return true;
      }

      const temporalData = await this.healthDataService.getTemporalSeries(
        resultado.evento.nombre_del_evento,
      );
      const cases = temporalData.map((d) => d.cases);
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
    return false;
  }
  private async handleAirQualityQuery(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const norm = text.toLowerCase();
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    if (!norm.includes('calidad del aire') && pending?.intent !== 'air_quality')
      return false;

    if (!detectedRegion) {
      await ctx.reply(
        '☁️ ¿De qué **municipio o departamento** deseas conocer la calidad del aire?',
        { parse_mode: 'Markdown' },
      );
      if (userId) this.userState.set(userId, { intent: 'air_quality' });
      return true;
    }

    const region = detectedRegion;
    const aireData =
      await this.airQualityService.getAirQualityByMunicipio(region);

    if (aireData && aireData.length > 0) {
      if (userId !== undefined) this.userState.delete(userId!);
      // Eliminar duplicados basándose en el nombre de la variable
      const uniqueVariables = Array.from(
        new Map(aireData.map((v: any) => [v.variable, v])).values(),
      );
      const variables = uniqueVariables
        .slice(0, 3) // Tomamos las 3 primeras variables únicas
        .map(
          (item: any) =>
            `- ${item.variable}: ${item.promedio} ${item.unidades}`,
        )
        .join('\n');
      await this.sendLongMessage(
        ctx,
        `🍃 **Indicadores ambientales en ${region}:**\n${variables}`,
      );
      return true;
    } else {
      if (userId !== undefined) this.userState.delete(userId!);
      await ctx.reply(
        `⚠️ No encontré datos de calidad del aire para **${region}**. Asegúrate de que el nombre del municipio sea correcto.`,
      );
      return true;
    }

    return false;
  }

  private async handleSaludPublica(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    try {
      const userId = ctx.from?.id;
      const pending = userId ? this.userState.get(userId) : null;

      // Si el texto es solo una región y tenemos un evento pendiente, lo procesamos
      if (detectedRegion && pending?.intent === 'health_event_analysis') {
        // amazonq-ignore-next-line
        // amazonq-ignore-next-line
        await this.executeHealthEventAnalysis(
          ctx,
          pending.data.event,
          detectedRegion,
        );
        if (userId !== undefined) this.userState.delete(userId!);
        return true;
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
            if (userId)
              this.userState.set(userId, {
                intent: 'health_event_analysis',
                data: { event: resultado.evento },
              });
            return true;
          }

          // amazonq-ignore-next-line
          await this.executeHealthEventAnalysis(
            ctx,
            resultado.evento,
            detectedRegion,
          );
          return true;
        } else if (resultado.contenido) {
          await this.sendLongMessage(ctx, resultado.contenido);
          return true;
        }
      }
    } catch (err) {
      console.error('DEBUG: Error en handleSaludPublica:', err);
    }
    return false;
  }

  private async executeHealthEventAnalysis(
    ctx: Context,
    event: any,
    region: string,
  ) {
    const { contenido } = await this.saludPublicaService._formatearRespuesta(
      { evento: event },
      'detalle',
    );
    let respuestaFinal = contenido;

    console.log(
      `DEBUG: handleSaludPublica - Llamando analizarRiesgoEvento para ${event.nombre_del_evento} en ${region}`,
    );

    const analisis = await this.saludAnaliticaService.analizarRiesgoEvento(
      event.nombre_del_evento,
      region,
    );
    respuestaFinal += `\n\n${analisis}`;

    // ENRIQUECIMIENTO: Datos de calidad del aire
    const environmentalKeywords = [
      'dengue',
      'zika',
      'chikun',
      'malaria',
      'tuberculosis',
      'contaminacion',
      'chagas',
      'ofidico',
      'animales',
      'eta',
      'alimentos',
      'intoxicacion',
      'desnutricion',
      'respiratoria',
    ];
    const isEnvRelevant = environmentalKeywords.some((k) =>
      event.nombre_del_evento.toLowerCase().includes(k),
    );

    try {
      if (isEnvRelevant) {
        const aireData =
          await this.airQualityService.getAirQualityByMunicipio(region);
        if (aireData && aireData.length > 0) {
          const uniqueVariables = Array.from(
            new Map(aireData.map((v: any) => [v.variable, v])).values(),
          );
          const variables = uniqueVariables
            .slice(0, 3)
            .map(
              (item: any) =>
                `- ${item.variable}: ${item.promedio} ${item.unidades}`,
            )
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
}

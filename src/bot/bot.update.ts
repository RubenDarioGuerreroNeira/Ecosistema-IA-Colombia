import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
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
import { normalizeString } from '../shared/health-utils';
import { MentalHealthService } from './mental-health.service';

@Update()
export class BotUpdate {
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
  ) {}

  private async handleChartQuery(ctx: Context, text: string): Promise<boolean> {
    const norm = normalizeString(text);
    console.log(`DEBUG: handleChartQuery - norm="${norm}"`);
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    const isChartRequest =
      norm.includes('grafic') ||
      norm.includes('visual') ||
      norm.includes('mostrar') ||
      norm.includes('ver') ||
      pending?.intent === 'chart_air_quality';

    if (!isChartRequest) return false;

    // DETERMINAR REGIÓN PRIMERO (Usando límites de palabra para evitar que "cali" coincida con "calidad")
    let region = '';
    if (/\bcali\b/i.test(norm)) region = 'CALI';
    else if (/\bbogota\b/i.test(norm)) region = 'BOGOTA';
    else if (/\bmedellin\b/i.test(norm)) region = 'MEDELLIN';
    else if (/\byopal\b/i.test(norm)) region = 'YOPAL';

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
        if (userId) this.userState.set(userId, { intent: 'chart_air_quality' });
        return true;
      }

      const targetRegion = region;
      const aireData =
        await this.airQualityService.getAirQualityByMunicipio(targetRegion);

      if (aireData && aireData.length > 0) {
        if (userId) this.userState.delete(userId);
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
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Servicios en Cali', callback_data: 'chart_cali' },
                { text: '🧠 Salud Mental', callback_data: 'chart_mental' },
              ],
            ],
          },
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
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔄 Analizar Salud Mental',
                callback_data: 'chart_mental',
              },
              { text: '🍃 Calidad del Aire', callback_data: 'chart_aire' },
            ],
          ],
        },
      });
      return true;
    }

    // 3. SALUD MENTAL (Top Diagnósticos)
    if (
      norm.includes('mental') ||
      norm.includes('psicologia') ||
      norm.includes('psiquiatria') ||
      norm.includes('depresion') ||
      norm.includes('ansiedad')
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
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Servicios en Cali', callback_data: 'chart_cali' },
              { text: '🍃 Calidad del Aire', callback_data: 'chart_aire' },
            ],
          ],
        },
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
          '🔬 Estos son los eventos de salud pública con mayor incidencia reportada a nivel nacional según SIVIGILA.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🧠 Salud Mental', callback_data: 'chart_mental' }],
          ],
        },
      });
      return true;
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

  ✨ **Qué puedo hacer por ti:**
  - 🔎 **Buscar servicios de salud:** hospitales, clínicas, EPS, laboratorios y prestadores por ciudad o dirección.
  - 📊 **Estadísticas SIVIGILA:** consultar casos, distribuciones por sexo/edad, y resúmenes por evento.
  - ⚖️ **Comparativas regionales:** comparar incidencia entre dos regiones (ej. Cali vs Palmira).
  - 🛡️ **Análisis de riesgo:** evaluación que integra vacunación y factores ambientales.
  - 💉 **Información de vacunación:** coberturas por departamento y su impacto en riesgo.
  - 🔮 **Predicciones:** proyecciones simples de casos y riesgo por evento y departamento.
  - 🍃 **Indicadores ambientales:** calidad del aire y variables ambientales por municipio.
  - 🧠 **Salud mental:** perfiles de riesgo y tendencias relacionadas.
  - ❤️ **Salud sexual:** preguntas frecuentes, prevención, derechos y rutas de atención.
  - 🚨 **Protocolos y urgencias:** guías de emergencia y búsqueda de urgencias 24h.
  - 📍 **Búsquedas avanzadas (Yopal):** ubicación, contactos, gerentes, auditoría y análisis de prestadores.
  - 🗂️ **Reportes y series temporales:** generar series temporales sintéticas y resúmenes.
  - 📈 **Visualización gráfica:** generar gráficos dinámicos de salud mental, calidad del aire y servicios de salud.

  🔎 **Ejemplos de preguntas que puedes hacerme:**
  - 🍃 "Graficar aire en Cali" o "Visualizar contaminación en Medellín"
  - 🧠 "Graficar diagnósticos de salud mental" o "Ver gráfico de salud mental"
  - 📊 "Muéstrame un gráfico de los servicios en Cali"
  - 🔬 "Graficar eventos de salud pública" o "Ver gráfico de eventos SIVIGILA"
  - 🛡️ "Analizar riesgo de dengue en Valle del Cauca"
  - 🏢 "¿Dónde queda el Hospital Primitivo Iglesias?"
  - 💉 "¿Cuál es la cobertura de vacunación de BCG en Antioquia?"
  - 🚨 "¿Qué hospitales tienen urgencias 24 horas en Yopal?"

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
      `🤖 **Menú de Ayuda - Salud IA (Versión Nacional)**

Puedes consultarme sobre cualquier región de Colombia:

📊 **Análisis Regional y Comparativo:**
- "¿Cómo está el dengue en Risaralda?"
- "Compara tuberculosis en Cali vs Tuluá"
- "Análisis de riesgo de zika en Valle del Cauca"

🏢 **Búsqueda de Servicios:**
- "Hospitales en [Municipio]"
- "Centros de salud en [Región]"

📈 **Visualización Gráfica:**
- "Visualizar calidad del aire en [Ciudad]"
- "Muéstrame un gráfico de los servicios en Cali"
- "Gráfico de salud mental"

🔬 **Estadísticas de Salud Pública:**
- Consultas directas de casos (SIVIGILA).
- Análisis de género, edad y zona para eventos específicos.

💬 *Tip: Ahora tengo datos de todo el país. ¡Prueba comparando dos ciudades!*`,
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

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const messageText = (ctx.message as { text: string }).text;

    // Detectar región para posibles análisis posteriores
    const detectedRegion = this.detectRegion(messageText);

    // Flujo de prioridades
    // 1. PRIORIDAD ABSOLUTA: Consultas de Datos Estructurales (Conteos y Listas)
    // Se ejecuta primero porque handleProviderSearch a veces intercepta estas consultas erróneamente
    if (await this.handleStructuralDataQuery(ctx, messageText, detectedRegion))
      return;

    if (await this.handleChartQuery(ctx, messageText)) return;
    if (await this.handleGreeting(ctx, messageText)) return;

    if (await this.handleProviderSearch(ctx, messageText, detectedRegion))
      return;
    if (await this.handleYopalQuery(ctx, messageText)) return;
    if (await this.handlePrediction(ctx, messageText)) return;
    if (await this.handleAirQualityQuery(ctx, messageText, detectedRegion))
      return;

    // 1. PRIORIDAD: ESTADÍSTICAS Y COMPARATIVAS (StatsService)
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

    // 2. PRIORIDAD: ANÁLISIS DE RIESGO E INCIDENCIA DETALLADA
    if (await this.handleSexualHealthQuery(ctx, messageText)) return;
    if (await this.handleRiskAnalysis(ctx, messageText, detectedRegion)) return;
    if (await this.handleSaludPublica(ctx, messageText, detectedRegion)) return;

    // 3. PRIORIDAD: MANEJO GENERAL (IA con contexto)
    await this.handleGeneralQuery(ctx, messageText, contextData);
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

  private async handleGreeting(ctx: Context, text: string): Promise<boolean> {
    const userId = ctx.from?.id;
    const isGreeting =
      /^(hola|buenos dias|buenas tardes|buenas noches|saludos|hi|hello|\/start)/i.test(
        text.trim(),
      );
    console.log(
      `DEBUG: handleGreeting - userId=${userId}, text='${text}', isGreeting=${isGreeting}`,
    );

    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      console.log(`DEBUG: handleGreeting - Greeting new user`);
      await this.sendPersonalizedGreeting(ctx);
      return true;
    } else if (isGreeting) {
      console.log(`DEBUG: handleGreeting - Greeting existing user`);
      // ... resto del mensaje
      const firstName = ctx.from?.first_name || 'usuario';
      await ctx.reply(
        `¡Hola, ${firstName}! 👋 Soy Salud IA, tu asistente de salud respaldado por datos oficiales.

    Puedo ayudarte con búsquedas de servicios, estadísticas SIVIGILA, análisis de riesgo (integrando vacunación y ambiente), predicciones, calidad del aire, salud mental y sexual, y protocolos de emergencia.

    Ejemplos rápidos:
    - "Compara dengue en Cali vs Palmira"
    - "Predecir riesgo de dengue en Valle del Cauca"
    - "Hospitales con urgencias 24 horas en Yopal"
    - "Cobertura de vacunación BCG en Antioquia"

    ¿Qué necesitas hoy?`,
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
    )
      .toString()
      .replace(/Ã‘/g, 'Ñ')
      .replace(/Ã“/g, 'Ó')
      .replace(/Ã/g, 'Í');

    const address = (
      provider.direccion ||
      provider.direcci_n ||
      'Dirección no disponible'
    )
      .toString()
      .replace(/Â°/g, '°')
      .replace(/NÂº/g, 'N°')
      .replace(/Ã“/g, 'Ó');

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

    let result = `🏥 *${this.escapeMarkdown(name)}*\n`;
    result += `📍 ${this.escapeMarkdown(address)}\n`;
    if (city) {
      result += `📌 ${this.escapeMarkdown(city)}\n`;
    }
    result += `📞 ${this.escapeMarkdown(phone)}`;
    if (extra) {
      result += `\nℹ️ ${this.escapeMarkdown(extra)}`;
    }
    result += `\n*Fuente:* ${this.escapeMarkdown(source)}`;
    return result;
  }

  private isProviderLocationQuery(text: string): boolean {
    const norm = text.toLowerCase();
    return /(?:donde\s+(?:queda|esta|est[áa])|d[oó]nde\s+queda|d[oó]nde\s+est[áa]|ubicaci[oó]n|direcci[oó]n|direccion|ubicado|ubicada|localizaci[oó]n|busca(?:r)?\s.*(?:hospital|cl[ií]nica|clinica|eps|centro|sede|prestador|servicio)|(?:hospital|cl[ií]nica|clinica|centro|sede|prestador|servicio)es?\b|c[oó]digo\s+(?:de\s+)?(?:habilitaci[oó]n|prestador))/.test(
      norm,
    );
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
      `DEBUG: handleStructuralDataQuery - norm="${norm}", region="${detectedRegion}"`,
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
          if (userId) this.userState.delete(userId);
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
          if (userId) this.userState.delete(userId);
          const summary = this.boyacaHealthService.getKnowledgeSummary();
          await ctx.reply(
            `🏢 **Boyacá:** ${summary}\n\n💡 *Tip: Para ver prestadores específicos, busca por nombre de municipio o código.*`,
          );
          return true;
        }
        if (region.includes('antioquia')) {
          if (userId) this.userState.delete(userId);
          const summary = this.antioquiaHealthService.getKnowledgeSummary();
          await ctx.reply(`🏢 **Antioquia:** ${summary}`);
          return true;
        }
      }
    }

    if (handled) {
      if (userId) this.userState.delete(userId);
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

    console.log(
      `DEBUG: searchProvidersAcrossServices - query="${query}", ` +
        `CaliId=${caliMatches.length}, CaliSearch=${caliSearchMatches.length}, ` +
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
    const userId = ctx.from?.id;
    const pending = userId ? this.userState.get(userId) : null;

    if (!isLocationQuery && pending?.intent !== 'provider_search') return false;

    // BLOQUEO DE EMERGENCIA: Si por alguna razón llegó aquí pidiendo "todos"
    const norm = normalizeString(text);
    if (
      norm.includes('todos') ||
      norm.includes('todo') ||
      norm.includes('complet')
    ) {
      await ctx.reply(
        '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").',
      );
      if (userId) this.userState.delete(userId);
      return true;
    }

    if (!detectedRegion && norm.split(' ').length < 3) {
      await ctx.reply(
        '🏢 ¿En qué **municipio o departamento** deseas buscar servicios de salud?',
      );
      if (userId) this.userState.set(userId, { intent: 'provider_search' });
      return true;
    }

    const region = detectedRegion?.toLowerCase() || '';

    // Prefer region-specific searches
    if (region.includes('cali') || region.includes('valle')) {
      const caliMatches = this.caliHealthService.searchProviders(text);
      if (caliMatches.length > 0) {
        const count =
          this.caliHealthService.getUniqueProvidersByCenter(caliMatches).length;
        const response = caliMatches
          .slice(0, 3)
          .map((provider) => this.formatProviderResult(provider, 'Cali'))
          .join('\n\n');
        if (userId) this.userState.delete(userId);
        await this.sendLongMessage(
          ctx,
          `📊 He encontrado **${count}** hospitales, clínicas o prestadores de servicios de salud en **Cali**. Ingresa el NIT o el nombre de la institución para hacer una búsqueda precisa.\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }

    if (region.includes('boyac')) {
      const boyacaMatches = this.boyacaHealthService.findByIdentifier(text);
      if (boyacaMatches.length > 0) {
        const count = boyacaMatches.length;
        const response = boyacaMatches
          .slice(0, 3)
          .map((provider) => this.formatProviderResult(provider, 'Boyacá'))
          .join('\n\n');
        if (userId) this.userState.delete(userId);
        await this.sendLongMessage(
          ctx,
          ` He encontrado **${count}** hospitales, clínicas o prestadores de servicios de salud en **Boyacá**. Ingresa el NIT o el nombre de la institución para hacer una búsqueda precisa.\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }

    if (region.includes('antioquia')) {
      const antioquiaMatches = this.antioquiaHealthService.searchProviders(
        text,
        500,
      );
      if (antioquiaMatches.length > 0) {
        const count = antioquiaMatches.length;
        const response = antioquiaMatches
          .slice(0, 3)
          .map((provider) => this.formatProviderResult(provider, 'Antioquia'))
          .join('\n\n');
        if (userId) this.userState.delete(userId);
        await this.sendLongMessage(
          ctx,
          `📊 He encontrado **${count}** hospitales, clínicas o prestadores de servicios de salud en **Antioquia**. Ingresa el NIT o el nombre de la institución para hacer una búsqueda precisa.\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }

    if (region.includes('yopal')) {
      const yopalMatches = this.yopalHealthService.searchProviders(text);
      if (yopalMatches.length > 0) {
        const count = yopalMatches.length;
        const response = yopalMatches
          .slice(0, 5)
          .map((provider) => this.formatProviderResult(provider, 'Yopal'))
          .join('\n\n');
        if (userId) this.userState.delete(userId);
        await this.sendLongMessage(
          ctx,
          `📊 He encontrado **${count}** hospitales, clínicas o prestadores de servicios de salud en **Yopal**. Ingresa el NIT o el nombre de la institución para hacer una búsqueda precisa.\n\n${response}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }

    const allMatches = await this.searchProvidersAcrossServices(text);
    if (allMatches.length === 0) return false;

    const uniqueMatches = new Map<string, { source: string; provider: any }>();
    for (const item of allMatches) {
      const key = `${item.source}|${item.provider.sede || item.provider.nombre_de_sede || item.provider.nombreprestador || item.provider.entidad_2 || item.provider.razon_social || ''}`;
      if (!uniqueMatches.has(key)) uniqueMatches.set(key, item);
    }

    const totalFound = uniqueMatches.size;
    if (userId) this.userState.delete(userId);
    const response = Array.from(uniqueMatches.values())
      .slice(0, 5)
      .map((item) => this.formatProviderResult(item.provider, item.source))
      .join('\n\n');

    const regionName = detectedRegion ? ` en **${detectedRegion}**` : '';
    await this.sendLongMessage(
      ctx,
      `📊 He encontrado **${totalFound}** servicios de salud${regionName}. Ingresa el NIT o el nombre de la institución para hacer una búsqueda precisa.\n\n${response}`,
      { parse_mode: 'Markdown' },
    );
    return true;
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
      if (userId) this.userState.delete(userId);
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

      if (userId) this.userState.delete(userId);
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
      if (userId) this.userState.delete(userId);
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
      if (userId) this.userState.delete(userId);
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
        await this.executeHealthEventAnalysis(
          ctx,
          pending.data.event,
          detectedRegion,
        );
        if (userId) this.userState.delete(userId);
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
    try {
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
    } catch (e) {
      respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
    }

    await this.sendLongMessage(ctx, respuestaFinal);
  }
}

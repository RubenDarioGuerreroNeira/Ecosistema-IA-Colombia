import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SaludAnaliticaService } from './salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService, Intencion } from './sexual-health.service';
import { EMERGENCY_PROTOCOLS } from './emergency-protocols';

@Update()
export class BotUpdate {
  constructor(
    private readonly genkitService: GenkitService,
    private readonly userService: UserService,
    private readonly statsService: StatsService,
    private readonly boyacaHealthService: BoyacaHealthService,
    private readonly caliHealthService: CaliHealthService,
    private readonly yopalHealthService: YopalHealthService,
    private readonly saludPublicaService: SaludPublicaService,
    private readonly saludAnaliticaService: SaludAnaliticaService,
    private readonly healthStatsService: HealthStatsService,
    private readonly healthDataService: HealthDataService,
    private readonly sexualHealthService: SexualHealthService,
  ) {}

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private async sendPersonalizedGreeting(ctx: Context) {
    const firstName = ctx.from?.first_name || 'usuario';
    const greeting = this.getTimeGreeting();
    const welcomeMessage = `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud respaldado por datos oficiales de salud pública de Colombia.

Estoy aquí para darte una experiencia clara, cercana y segura en cada consulta. Puedes contar conmigo para encontrar servicios, interpretar cifras y acompañarte en tus decisiones de bienestar.

✨ **Puedo ayudarte con:**
- Buscar hospitales, clínicas, centros de salud y prestadores por ciudad o región.
- Localizar servicios médicos y unidades de atención con información actualizada.
- Revisar estadísticas reales y tendencias de salud pública.
- Comparar enfermedades, grupos de edad, género y zonas geográficas.
- Explorar salud mental, riesgos y factores que afectan a tu comunidad.
- Entender datos complejos con explicaciones fáciles y respetuosas.
- **Acceder a guías de salud sexual y reproductiva**, incluyendo rutas de atención, derechos y prevención.
- **Análisis automático de riesgos en salud**, incluyendo indicadores de vacunación para una respuesta más completa.
- **Predicción de tendencias epidemiológicas**, proyectando comportamientos futuros basados en datos históricos.

🔎 **Ejemplos de preguntas que puedes hacerme:**
- *"¿Dónde queda el Hospital Primitivo Iglesias?"*
- *"¿Qué son los Derechos Reproductivos?"*
- *"¿Cuántos casos de dengue hay?"*
- *"predecir casos tuberculosis"* (¡Prueba nuestra nueva función predictiva!)
- *"¿Qué servicios de salud sexual hay en [ciudad]?"*

💬 Estoy listo para escucharte y apoyarte paso a paso. 
**¿Qué quisieras explorar hoy?**`;

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

Estoy respaldado por datos oficiales de salud pública de Colombia y estoy aquí para apoyarte con:

🏢 **Búsqueda de Servicios:**
- "Hospitales en [Municipio]"
- "Centros de salud en [Región]"
- "Prestadores de salud en [Ciudad]"

📝 **Salud Mental y Riesgo:**
- Perfiles de riesgo por diagnóstico.
- Comparativas de trastornos (ej. "ansiedad vs depresión").
- Ideas para entender qué situaciones afectan más a diferentes grupos.

🔬 **Análisis de Salud Pública (SIVIGILA):**
- **Consultas directas:** "¿Cuántos casos de [enfermedad] hay?"
- **Análisis de género:** "Compara hombres con mujeres en [enfermedad]" o "¿qué evento afecta más a mujeres?"
- **Rankings:** "Top 10 eventos", "Ranking completo", "Eventos raros".
- **Filtros avanzados:** "Eventos infecciosos", "Eventos entre 20 y 100 casos", "Violencia en zona rural".
- **Categorías:** "Eventos infecciosos en niños".

💬 *Tip: Soy muy flexible con el lenguaje. ¡Escribe tu consulta de forma natural y yo me encargo de buscar la mejor respuesta para ti!*`,
      { parse_mode: 'Markdown' },
    );
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

    const userId = ctx.from?.id;
    const messageText = (ctx.message as any).text;

    // Identificar si el mensaje es un saludo
    const isGreeting =
      /^(hola|buenos dias|buenas tardes|buenas noches|saludos|hi|hello)/i.test(
        messageText.trim(),
      );

    // If it's a new user (not in persistent storage), greet them first
    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      await this.sendPersonalizedGreeting(ctx);
      return;
    } else if (isGreeting) {
      const firstName = ctx.from?.first_name || 'usuario';
      await ctx.reply(
        `¡Hola, ${firstName}! 👋 Soy Salud IA, tu asistente de salud respaldado por datos oficiales. Puedo ayudarte con servicios, estadísticas y salud mental. ¿Qué te gustaría preguntar hoy?`,
      );
      return;
    }

    // Detectar si la consulta parece ser una pregunta de lenguaje natural o análisis.
    const regions = [
      'cali', 'boyacá', 'boyaca', 'antioquia', 'yopal', 'valle',
      'capresoca', 'coomeva', 'medimas', 'sanitas', 'nueva eps', 'coosalud'
    ];
    const containsRegion = regions.some((r) =>
      messageText.toLowerCase().includes(r),
    );

    // Ajustar la lógica: detectar si es pregunta analítica
    const isAnalyticalQuery =
      /^(qu[eé]|cu[aá]l|cu[aá]ntos|c[oó]mo|por qu[eé]|qui[eé]nes|hay|dime|cu[aá]les|enfermedad|salud|impacto|estadistica|incidencia|joven|niño|adulto|mayor)/i.test(
        messageText.trim().toLowerCase(),
      ) || messageText.split(/\s+/).length > 5;

    const isSearchIntent =
      /(en que ciudad esta|donde queda|donde esta|buscar|prestador|hospital|clinica|centro de salud)/i.test(
        messageText.toLowerCase(),
      );

    console.log(
      `DEBUG: messageText=${messageText}, containsRegion=${containsRegion}, isAnalyticalQuery=${isAnalyticalQuery}`,
    );

    // PRIORIDAD 1: YOPAL (Dataset especializado con bypass)
    try {
      const lcQuery = messageText.toLowerCase();
      // Si menciona Yopal o alguna de sus entidades principales
      if (lcQuery.includes('yopal') || 
          ['capresoca', 'coomeva', 'horo', 'orinoquia'].some(e => lcQuery.includes(e))) {
        const { content, found } =
          await this.yopalHealthService.answerNaturalQuestion(messageText);

        if (found) {
          await this.sendLongMessage(ctx, content, {
            parse_mode: 'Markdown',
          });
          return;
        }
      }
    } catch (err) {
      console.error('Yopal bypass failed', err);
    }

    // PRIORIDAD 2: TEST PREDICTIVO
    if (messageText.toLowerCase().startsWith('predecir casos')) {
        const eventName = messageText.toLowerCase().replace('predecir casos', '').trim();
        
        if (!eventName) {
            await this.sendLongMessage(ctx, "Por favor, especifica un evento. Ejemplo: 'predecir casos dengue'");
            return;
        }

        const resultado = this.saludPublicaService.procesarPregunta(eventName);
        if (!resultado.evento) {
            await this.sendLongMessage(ctx, "No encontré ese evento para predecir.");
            return;
        }

        const temporalData = await this.healthDataService.getTemporalSeries(resultado.evento.nombre_del_evento);
        const cases = temporalData.map(d => d.cases);
        const prediccion = this.healthStatsService.predictNextValue(cases);

        await this.sendLongMessage(ctx, `📊 **Predicción para ${resultado.evento.nombre_del_evento}:**
Basado en datos históricos de los últimos 6 meses: ${cases.join(', ')}
El próximo valor proyectado es: **${prediccion}** casos.`);
        return;
    }

    // PRIORIDAD 3: SALUD PÚBLICA (SIVIGILA)
    try {
      const resultado = this.saludPublicaService.procesarPregunta(messageText);
      
      if (resultado.encontrado) {
        let respuestaFinal = '';
        
        // Si el resultado trae un evento, lo formateamos y añadimos el análisis
        if (resultado.evento) {
            const { contenido } = this.saludPublicaService._formatearRespuesta({ evento: resultado.evento }, 'detalle');
            respuestaFinal = contenido;
            
            // Añadir el análisis de riesgo (asíncrono)
            const analisis = await this.saludAnaliticaService.analizarRiesgoEvento(resultado.evento.nombre_del_evento);
            respuestaFinal += `\n\n${analisis}`;
        } else if (resultado.contenido) {
            respuestaFinal = resultado.contenido;
        }
        
        await this.sendLongMessage(ctx, respuestaFinal);
        return;
      }
    } catch (err) {
      console.error('Salud Publica routing failed', err);
    }

    // RAG: Gather context through the StatsService (data-driven summaries)
    const contextData = await this.statsService.getSummary(messageText);

    // Automatización de Bypass: Si la respuesta proviene de un servicio de datos y tiene un formato definido,
    // la entregamos directamente al usuario, evitando alucinaciones de la IA.
    const bypassMarkers = [
      '--- ANÁLISIS',
      '--- RANKING',
      '--- DISTRIBUCIÓN',
      '--- ANÁLISIS GLOBAL',
      '--- SALUD MENTAL',
      '--- PERFIL DE RIESGO',
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

    const chartUrl: string | undefined = undefined;

    if (chartUrl) {
      await ctx.replyWithPhoto(
        { url: chartUrl as string },
        { caption: '📊 Análisis visual de datos reales' },
      );
    }

    let augmentedPrompt = messageText;
    const respuestaProfesionalNoInformacion = `Lo siento, no tengo información sobre ese tema en mi base de datos actual. 
    
    Mi especialidad es la salud pública en Colombia. Puedo ayudarte con:
    1. 🏢 Buscar hospitales, clínicas y prestadores de servicios de salud en diversas ciudades.
    2. 🔬 Consultar estadísticas oficiales (SIVIGILA) y análisis de riesgo de enfermedades.
    3. 🧠 Recibir orientación sobre salud mental y perfiles de riesgo.
    4. 🛡️ Acceder a protocolos de emergencia.
    5. ❤️ Obtener guías sobre salud sexual y reproductiva.

    ¿Te gustaría consultar alguna de estas áreas?`;

    if (contextData) {
      augmentedPrompt = `
### CONTEXTO DE DATOS REALES (COLOMBIA) ###
${contextData}
### FIN DEL CONTEXTO ###

INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. 
Si el contexto no contiene información relevante para responder la consulta, responde EXACTAMENTE con este mensaje: "${respuestaProfesionalNoInformacion}"
Si el contexto contiene estadísticas, limítate a analizarlas y presentarlas. NO generes información que no esté presente en el contexto.

Consulta: ${messageText}
      `;
    } else {
        augmentedPrompt = `Consulta: ${messageText}

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
}

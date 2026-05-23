import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly genkitService: GenkitService,
    private readonly userService: UserService,
    private readonly statsService: StatsService,
    private readonly boyacaHealthService: BoyacaHealthService,
    private readonly caliHealthService: CaliHealthService,
    private readonly yopalHealthService: YopalHealthService,
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
    const welcomeMessage = `${greeting}, ${firstName}. 👋 Soy tu asistente de Salud IA. Cuento con datos reales de salud pública en Colombia para guiarte en la prevención de enfermedades, brindarte información sobre salud sexual y reproductiva, y apoyarte en tu bienestar de salud mental. 

  Mis capacidades incluyen:
  - Búsqueda de centros de salud y prestadores en Antioquia (incluyendo Valle de Aburrá), Boyacá ,Cali, Yopal.
  - Análisis estadístico de salud mental: prevalencia por edad, ciclos de vida, comparativas directas y perfiles de riesgo por diagnóstico.
  - Rankings de incidencia de enfermedades.

  Ejemplos: 
  - "¿Cuál es la enfermedad mental que más afecta a los jóvenes?"
  - "ansiedad vs depresion"
  - "centros de salud en Itagüí"
  - "prestadores en Yopal"

  Mi objetivo es ayudarte a prevenir riesgos y promover una vida más sana. ¿En qué puedo ayudarte hoy?`;

    await ctx.reply(welcomeMessage);

    if (ctx.from?.id) {
      await this.userService.markAsGreeted(ctx.from.id);
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    // Explicitly reset session greeting when /start is called
    await this.sendPersonalizedGreeting(ctx);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(
      'Puedes preguntarme sobre enfermedades transmisibles, salud sexual y reproductiva, salud mental, o reportar síntomas. También puedes buscar centros de salud o prestadores de servicios en Antioquia, por ejemplo: "centros de salud en Itagüí" o "prestadores en Valle de Aburrá".',
    );
  }

  private async sendLongMessage(ctx: Context, text: string) {
    const MAX_LENGTH = 4000; // Slightly under the 4096 limit for safety
    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text);
      return;
    }

    let currentPosition = 0;
    while (currentPosition < text.length) {
      let endPosition = currentPosition + MAX_LENGTH;

      // Try to split at the last newline to avoid cutting sentences
      if (endPosition < text.length) {
        const lastNewline = text.lastIndexOf('\n', endPosition);
        if (lastNewline > currentPosition) {
          endPosition = lastNewline;
        }
      }

      await ctx.reply(text.substring(currentPosition, endPosition));
      currentPosition = endPosition;
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const userId = ctx.from?.id;
    const messageText = (ctx.message as any).text;

    // If it's a new user (not in persistent storage), greet them first
    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      await this.sendPersonalizedGreeting(ctx);
    }

    // Detectar si la consulta parece ser una pregunta de lenguaje natural o análisis.
    // Esto evita que "cual es la enfermedad mental" dispare una búsqueda de hospital por la palabra "mental".
    const regions = ['cali', 'boyacá', 'boyaca', 'antioquia', 'yopal', 'valle'];
    const containsRegion = regions.some(r => messageText.toLowerCase().includes(r));
    console.log(`DEBUG: messageText=${messageText}, containsRegion=${containsRegion}`);
    
    const isAnalyticalQuery =
      (/^(qu[eé]|cu[aá]l|cu[aá]ntos|c[oó]mo|por qu[eé]|qui[eé]nes|hay|dime|cu[aá]les|enfermedad|salud|impacto|estadistica|incidencia|joven|niño|adulto|mayor)/i.test(
        messageText.trim().toLowerCase(),
      ) || messageText.split(/\s+/).length > 5) && !containsRegion;

    console.log(`DEBUG: isAnalyticalQuery=${isAnalyticalQuery}`);

    // Solo intentar búsqueda directa de prestadores si NO es una consulta analítica.
    try {
      if (isAnalyticalQuery)
        throw new Error('Skip direct lookup: Analytical query detected');

      // Revisión de prestadores en Cali
      try {
        const lcQuery = (messageText || '').toLowerCase();
        if (/\bcali\b/.test(lcQuery) || lcQuery.includes('santiago de cali')) {
          const caliResults = this.caliHealthService.searchProviders(messageText || '');
          if (caliResults && caliResults.length > 0) {
            const slice = caliResults.slice(0, 5); // Mostrar 5 registros reales
            const lines = slice.map((p) => {
              const nombre = p.sede || p.servicio || 'N/A';
              const servicio = p.servicio || 'N/A';
              const grupo = p.grupo || 'N/A';
              const direccion = p.direccion || 'N/A';
              const ciudad = p.ciudad || 'N/A';
              
              return `🏢 Entidad: ${nombre}\n🏥 Servicio: ${servicio} (${grupo})\n📍 Dirección: ${direccion}\n🏙️ Ciudad: ${ciudad}`;
            });
            
            const count = caliResults.length;
            const footer = count > slice.length 
              ? `\n\nHe encontrado un total de ${count} registros en Cali. Si buscas un centro específico, intenta indicando el nombre o un dato puntual del lugar para refinar tu búsqueda.`
              : `\n\nHe encontrado un total de ${count} registros en Cali.`;

            await this.sendLongMessage(
              ctx,
              `🏥 Servicios de Salud en Cali:\n\n${lines.join('\n\n')}${footer}`,
            );
            return;
          }
        }
      } catch (err) {
        console.error('Cali search routing failed', err);
      }
      // If the user explicitly mentions Yopal, prioritize the Yopal dataset and bypass RAG
      try {
        const lcQuery = (messageText || '').toLowerCase();
        if (lcQuery.includes('yopal')) {
          const direct = await this.yopalHealthService.searchProviders(''); // Obtener todos si es necesario
          const lines = direct.slice(0, 10).map((p) => {
            const nombre = p.entidad_2 || 'Nombre no disponible';
            const gerente = p.gerente || 'N/A';
            const direccion = p.direccion || 'N/A';
            const telefono = p.telefono || 'N/A';
            const email = p.correo_electronico || 'N/A';
            return `🏢 Entidad: ${nombre}\n👤 Gerente: ${gerente}\n📍 Dirección: ${direccion}\n📞 Teléfono: ${telefono}\n📧 Email: ${email}`;
          });
          
          if (lines.length > 0) {
             await this.sendLongMessage(ctx, `🏥 Servicios de Salud en Yopal (Casanare):\n\n${lines.join('\n\n')}`);
             return;
          }
        }
      } catch (err) {
        console.error('Yopal bypass failed', err);
      }
    } catch (err) {
      // Si falla la búsqueda directa, continuar con el flujo normal
      // (no interrumpimos la experiencia del usuario)
      // eslint-disable-next-line no-console
      console.error('Direct provider lookup failed', err);
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

    const chartUrl = undefined;

    if (chartUrl) {
      await ctx.replyWithPhoto(
        { url: chartUrl },
        { caption: '📊 Análisis visual de datos reales' },
      );
    }

    let augmentedPrompt = messageText;
    if (contextData) {
      augmentedPrompt = `
### CONTEXTO DE DATOS REALES (COLOMBIA) ###
${contextData}
### FIN DEL CONTEXTO ###

INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. 
Si el contexto contiene estadísticas, limítate a analizarlas y presentarlas. NO generes información que no esté presente en el contexto.

Consulta: ${messageText}
      `;
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

import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly genkitService: GenkitService,
    private readonly userService: UserService,
    private readonly statsService: StatsService,
    private readonly caliHealthService: CaliHealthService,
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
    const welcomeMessage = `${greeting}, ${firstName}. 👋 Soy tu asistente de Salud IA. Cuento con datos reales de salud pública en Colombia para guiarte en la prevención de enfermedades (como el Dengue y la Varicela), brindarte información sobre salud sexual y reproductiva, y apoyarte en tu bienestar de salud mental. Además, puedo buscar información sobre centros de salud y prestadores de servicios en Antioquia (por municipio o "Valle de Aburrá"), en Boyacá (por municipio, nombre de sede o código de prestador) y en Yopal (por nombre, teléfono, gerente o dirección).

  Ejemplos: "centros de salud en Itagüí", "centros de salud en Tunja", "prestadores en Yopal" o "codigo 123456".

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

    // Priorizar búsquedas directas por identificador (código, nombre o sede)
    try {
      // Revisión rápida para prestadores en Cali (ej.: "HOSPITAL PRIMITIVO IGLESIAS")
      try {
        const caliMatches = this.caliHealthService.findByIdentifier(
          messageText || '',
        );
        if (caliMatches && caliMatches.length > 0) {
          const slice = caliMatches.slice(0, 10);
          const lines = slice.map((p, idx) => {
            const nombre = p.sede || p.servicio || 'N/A';
            const grupo = p.grupo || 'N/A';
            const direccion = p.direccion || 'N/A';
            const departamento = p.departamento || 'N/A';
            const ciudad = p.ciudad || 'N/A';
            return `#${idx + 1} ${nombre}\nGrupo: ${grupo}\nServicio: ${p.servicio || 'N/A'}\nDirección: ${direccion}\nDepartamento: ${departamento}\nCiudad: ${ciudad}`;
          });
          const exampleHint = this.caliHealthService.getExampleSearchHints();
          const morePrompt =
            caliMatches.length > slice.length
              ? `\n\nSi desea conocer la info de algún centro específico en Cali, digite algún campo que sea puntual para búsqueda en mi base de datos?${
                  exampleHint ? ' ' + exampleHint : ''
                }`
              : '';
          await this.sendLongMessage(
            ctx,
            `He encontrado ${caliMatches.length} coincidencia(s) en Cali. Mostrando ${slice.length}:\n\n${lines.join('\n\n')}${morePrompt}`,
          );
          return;
        }
      } catch (err) {
        // ignore cali search errors and fallback to statsService lookup
        // eslint-disable-next-line no-console
        console.error('Cali provider lookup failed', err);
      }
      // If the user explicitly mentions Cali, prioritize the Cali dataset
      try {
        const lcQuery = (messageText || '').toLowerCase();
        if (/\bcali\b/.test(lcQuery) || lcQuery.includes('santiago de cali')) {
          const caliResults = this.caliHealthService.searchProviders(
            messageText || '',
          );
          if (caliResults && caliResults.length > 0) {
            const uniqueCenters =
              this.caliHealthService.getUniqueProvidersByCenter(caliResults);
            const slice = uniqueCenters.slice(0, 10);
            const lines = slice.map((p, idx) => {
              const nombre = p.sede || p.servicio || 'N/A';
              const municipio = p.ciudad || 'N/A';
              const direccion = p.direccion || 'N/A';
              return `#${idx + 1}\nNombre sede: ${nombre}\nMunicipio: ${municipio}\nDirección: ${direccion}\nTeléfono: ${p.telefono || 'N/A'}\nEmail: ${p.extension || 'N/A'}\nNivel: ${p.complejidad || 'N/A'}\nCoordenadas: ${p.geolocalizacion || 'N/A'}`;
            });
            const exampleHint = this.caliHealthService.getExampleSearchHints();
            const morePrompt =
              uniqueCenters.length > slice.length
                ? `\n\nSi desea conocer la info de algún centro específico en Cali, digite algún campo que sea puntual para búsqueda en mi base de datos?${
                    exampleHint ? ' ' + exampleHint : ''
                  }`
                : '';
            await this.sendLongMessage(
              ctx,
              `He encontrado ${caliResults.length} coincidencia(s) en Cali, agrupadas en ${uniqueCenters.length} centros diferentes. Mostrando ${slice.length} primero(s):\n\n${lines.join('\n\n')}${morePrompt}`,
            );
            return;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Cali search routing failed', err);
      }
      const direct =
        await this.statsService.lookupProviderByIdentifier(messageText);
      if (direct) {
        await this.sendLongMessage(ctx, direct);
        return;
      }
    } catch (err) {
      // Si falla la búsqueda directa, continuar con el flujo normal
      // (no interrumpimos la experiencia del usuario)
      // eslint-disable-next-line no-console
      console.error('Direct provider lookup failed', err);
    }

    // RAG: Gather context through the StatsService (data-driven summaries)
    const contextData = await this.statsService.getSummary(messageText);
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

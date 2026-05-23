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
    const welcomeMessage = `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente inteligente con datos reales de salud pública en Colombia.

Mi propósito es apoyarte en la prevención de riesgos y promover tu bienestar integral a través de estas funcionalidades:

📍 **Búsqueda de Centros de Salud:** Encuentra información detallada (ubicación, servicios, contactos) de prestadores en **Antioquia, Boyacá, Cali y Yopal**.
🧠 **Análisis de Salud Mental:** Obtén estadísticas precisas sobre prevalencia, ciclos de vida y perfiles de riesgo.
📊 **Reportes de Salud Pública:** Consulta rankings de incidencia de enfermedades y temas clave en salud sexual y reproductiva.

**¿Cómo puedo ayudarte hoy?**
*   *"¿Dónde queda el Hospital Primitivo Iglesias?"*
*   *"Prestadores de salud en Yopal"*
*   *"Ansiedad vs. depresión"*
*   *"Enfermedades que más afectan a los jóvenes"*`;

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

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
    
    // Ajustar la lógica: detectar si es pregunta analítica PERO permitir búsqueda directa si parece referirse a un centro específico.
    const isAnalyticalQuery =
      (/^(qu[eé]|cu[aá]l|cu[aá]ntos|c[oó]mo|por qu[eé]|qui[eé]nes|hay|dime|cu[aá]les|enfermedad|salud|impacto|estadistica|incidencia|joven|niño|adulto|mayor)/i.test(
        messageText.trim().toLowerCase(),
      ) || messageText.split(/\s+/).length > 5);

    // Si el usuario pregunta "¿dónde está X?", o busca un hospital, queremos búsqueda directa.
    // Sobrescribimos isAnalyticalQuery si detectamos intención de búsqueda de entidad.
    const isSearchIntent = /(en que ciudad esta|donde queda|donde esta|buscar|prestador|hospital|clinica|centro de salud)/i.test(messageText.toLowerCase());

    console.log(`DEBUG: isAnalyticalQuery=${isAnalyticalQuery}, isSearchIntent=${isSearchIntent}`);

    // Solo intentar búsqueda directa de prestadores si NO es puramente analítica o si tiene intención clara de búsqueda.
    try {
      if (isAnalyticalQuery && !isSearchIntent)
        throw new Error('Skip direct lookup: Analytical query detected');

      // Revisión de prestadores en Cali
      try {
        const lcQuery = (messageText || '').toLowerCase();
        
        // Intentamos buscar siempre, ya que el servicio de Cali puede devolver resultados relevantes
        const caliResults = this.caliHealthService.searchProviders(messageText || '');
        
        if (caliResults && caliResults.length > 0) {
            // Si hay resultados, priorizamos la respuesta directa
            const unique = this.caliHealthService.getUniqueProvidersByCenter(caliResults);
            
            // Si el usuario preguntó por ubicación o busca una entidad, respondemos con toda la información
            if (lcQuery.includes('ciudad') || lcQuery.includes('donde esta') || lcQuery.includes('ubicado') || isSearchIntent) {
              const entity = unique[0];
              const response = `🏥 *Información del Centro:*
🏢 Nombre: ${entity.sede || 'N/A'}
🏙️ Ciudad: ${entity.ciudad || 'N/A'}
📍 Dirección: ${entity.direccion || 'N/A'}
💡 Complejidad: ${entity.complejidad || 'N/A'}
🛠️ Grupo de Servicio: ${entity.grupo || 'N/A'}
📞 Teléfono: ${entity.telefono || 'N/A'} ${entity.extension ? `(Ext: ${entity.extension})` : ''}
              `;
              await this.sendLongMessage(ctx, response);
              return;
            }

            // Si no fue una pregunta de ubicación, listar brevemente los encontrados
            const slice = caliResults.slice(0, 3);
            const lines = slice.map((p) => `🏢 ${p.sede} - 📍 ${p.ciudad} (${p.direccion})`);
            await this.sendLongMessage(ctx, `🏥 He encontrado los siguientes centros:\n\n${lines.join('\n')}`);
            return;
        }
      } catch (err) {
        console.error('Cali search routing failed', err);
      }

      // If the user explicitly mentions Yopal, prioritize the Yopal dataset and bypass RAG
      try {
        const lcQuery = (messageText || '').toLowerCase();
        if (lcQuery.includes('yopal')) {
          // 1. Intentar búsqueda puntual (si el usuario dio un nombre)
          const direct = await this.statsService.lookupProviderByIdentifier(messageText);
          if (direct && !direct.includes('No encontré información específica')) {
             await this.sendLongMessage(ctx, direct);
             return;
          }

          // 2. Si no es búsqueda puntual, listar servicios (formato visual)
          const allProviders = await this.yopalHealthService.searchProviders('');
          const lines = allProviders.slice(0, 10).map((p) => {
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

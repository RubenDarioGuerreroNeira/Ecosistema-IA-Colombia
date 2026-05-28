import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { SaludPublicaService } from './salud-publica.service';
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

🔎 **Ejemplos de preguntas que puedes hacerme:**
- *"¿Dónde queda el Hospital Primitivo Iglesias?"*
- *"¿Qué son los Derechos Reproductivos?"*
- *"¿Qué hacer si sufrí una violación?"*
- *"¿Qué preguntas hacerle al médico si tengo cáncer de próstata?"*
- *"¿Cuántos casos de dengue hay?"*
- *"¿Cuáles son los eventos con mayor incidencia en Antioquia?"*
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
    // Esto evita que "cual es la enfermedad mental" dispare una búsqueda de hospital por la palabra "mental".
    const regions = ['cali', 'boyacá', 'boyaca', 'antioquia', 'yopal', 'valle'];
    const containsRegion = regions.some((r) =>
      messageText.toLowerCase().includes(r),
    );
    console.log(
      `DEBUG: messageText=${messageText}, containsRegion=${containsRegion}`,
    );

    // Ajustar la lógica: detectar si es pregunta analítica PERO permitir búsqueda directa si parece referirse a un centro específico.
    const isAnalyticalQuery =
      /^(qu[eé]|cu[aá]l|cu[aá]ntos|c[oó]mo|por qu[eé]|qui[eé]nes|hay|dime|cu[aá]les|enfermedad|salud|impacto|estadistica|incidencia|joven|niño|adulto|mayor)/i.test(
        messageText.trim().toLowerCase(),
      ) || messageText.split(/\s+/).length > 5;

    // Si el usuario pregunta "¿dónde está X?", o busca un hospital, queremos búsqueda directa.
    // Sobrescribimos isAnalyticalQuery si detectamos intención de búsqueda de entidad.
    const isSearchIntent =
      /(en que ciudad esta|donde queda|donde esta|buscar|prestador|hospital|clinica|centro de salud)/i.test(
        messageText.toLowerCase(),
      );

    console.log(
      `DEBUG: isAnalyticalQuery=${isAnalyticalQuery}, isSearchIntent=${isSearchIntent}`,
    );

    // Prioridad: Salud Sexual (Dataset específico)
    const intent = this.sexualHealthService.classifyIntent(messageText);
    
    // Check specific emergency protocols
    const normalizedText = this.sexualHealthService['normalizeText'](messageText);
    for (const key in EMERGENCY_PROTOCOLS) {
        if (EMERGENCY_PROTOCOLS[key].keywords.some(k => normalizedText.includes(k))) {
            await ctx.reply(EMERGENCY_PROTOCOLS[key].response, { parse_mode: 'Markdown' });
            return;
        }
    }

    if (intent === Intencion.EMERGENCIA) {
        await ctx.reply('🚨 **¡Atención! Estás ante una situación de emergencia.**\n\nPor favor, busca atención médica inmediata en la sala de urgencias más cercana, llama a la línea de emergencias (155) o acude a la policía. Tu seguridad y salud son la prioridad.');
        return;
    }

    const sexualMatches = await this.sexualHealthService.searchByKeyword(messageText);
    if (sexualMatches && sexualMatches.length > 0) {
      // Si la coincidencia es muy débil, mejor hacer fallback
      if (sexualMatches[0].id === 999 && sexualMatches[0].palabras_claves.includes('condón')) {
        await ctx.reply('Lo siento, no tengo información sobre precios de productos. Te sugiero consultar en una farmacia local.');
        return;
      }
      
      const bestMatch = sexualMatches[0];
      await ctx.reply(`💡 *Respuesta encontrada sobre Salud Sexual:*\n\n*Pregunta:* ${bestMatch.pregunta}\n*Respuesta:* ${bestMatch.respuesta}`, { parse_mode: 'Markdown' });
      return;
    } 
    
    // NEW LOGIC FOR PRICE-RELATED FALLBACKS
    const qNorm = this.sexualHealthService['normalizeText'](messageText);
    if (qNorm.includes('precio') && qNorm.includes('condon')) {
        await ctx.reply('Lo siento, no tengo información sobre precios de productos. Te sugiero consultar en una farmacia local.');
        return;
    }
    // END NEW LOGIC

    else { // This is the generic fallback
        await ctx.reply('Lo siento, no cuento con información específica en mi base de datos sobre esa consulta. Como asistente de salud, priorizo datos oficiales y es posible que no tenga detalles sobre precios, geolocalización en tiempo real o temas médicos fuera de mi alcance. ¿Tienes alguna otra duda de salud pública o sexualidad en la que te pueda ayudar?');
        return;
    }

    // Nueva integración de Salud Pública
    const { contenido, encontrado } =
      this.saludPublicaService.procesarPregunta(messageText);
    if (encontrado) {
      await this.sendLongMessage(ctx, contenido);
      return;
    }

    // Solo intentar búsqueda directa de prestadores si NO es puramente analítica o si tiene intención clara de búsqueda.
    try {
      if (isAnalyticalQuery && !isSearchIntent)
        throw new Error('Skip direct lookup: Analytical query detected');

      // Revisión de prestadores en Cali
      try {
        const lcQuery = (messageText || '').toLowerCase();

        // Intentamos buscar siempre, ya que el servicio de Cali puede devolver resultados relevantes
        const caliResults = this.caliHealthService.searchProviders(
          messageText || '',
        );

        if (caliResults && caliResults.length > 0) {
          // Si hay resultados, priorizamos la respuesta directa
          const unique =
            this.caliHealthService.getUniqueProvidersByCenter(caliResults);

          // Si el usuario preguntó por ubicación o busca una entidad, respondemos con toda la información
          if (
            lcQuery.includes('ciudad') ||
            lcQuery.includes('donde esta') ||
            lcQuery.includes('ubicado') ||
            isSearchIntent
          ) {
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
          const lines = slice.map(
            (p) => `🏢 ${p.sede} - 📍 ${p.ciudad} (${p.direccion})`,
          );
          await this.sendLongMessage(
            ctx,
            `🏥 He encontrado los siguientes centros:\n\n${lines.join('\n')}`,
          );
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
          const directCandidate =
            await this.statsService.lookupProviderByIdentifier(messageText);
          if (directCandidate && typeof directCandidate === 'string') {
            if (!directCandidate!.includes('No encontré información específica')) {
              await this.sendLongMessage(ctx, directCandidate!);
              return;
            }
          }

          // 2. Si no es búsqueda puntual, listar servicios (formato visual)
          const allProviders =
            await this.yopalHealthService.searchProviders('');
          const lines = allProviders.slice(0, 10).map((p) => {
            const nombre = p.entidad_2 || 'Nombre no disponible';
            const gerente = p.gerente || 'N/A';
            const direccion = p.direccion || 'N/A';
            const telefono = p.telefono || 'N/A';
            const email = p.correo_electronico || 'N/A';
            return `🏢 Entidad: ${nombre}\n👤 Gerente: ${gerente}\n📍 Dirección: ${direccion}\n📞 Teléfono: ${telefono}\n📧 Email: ${email}`;
          });

          if (lines.length > 0) {
            await this.sendLongMessage(
              ctx,
              `🏥 Servicios de Salud en Yopal (Casanare):\n\n${lines.join('\n\n')}`,
            );
            return;
          }
        }
      } catch (err) {
        console.error('Yopal bypass failed', err);
      }
    } catch (err) {
      // Si falla la búsqueda directa, continuar con el flujo normal
      // (no interrumpimos la experiencia del usuario)

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

    const chartUrl: string | undefined = undefined;

    if (chartUrl) {
      await ctx.replyWithPhoto(
        { url: chartUrl as string },
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

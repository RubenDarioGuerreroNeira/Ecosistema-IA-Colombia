import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService } from './sexual-health.service';
import { MentalHealthService } from './mental-health.service';
import { UserService } from './user.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly genkitService: GenkitService,
    private readonly healthDataService: HealthDataService,
    private readonly sexualHealthService: SexualHealthService,
    private readonly mentalHealthService: MentalHealthService,
    private readonly userService: UserService,
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
    const welcomeMessage = `${greeting}, ${firstName}. 👋 Soy tu asistente de Salud IA. Cuento con datos reales de salud pública en Colombia para guiarte en la prevención de enfermedades (como el Dengue y la Varicela), brindarte información sobre salud sexual y reproductiva, y apoyarte en tu bienestar de salud mental. Mi objetivo es ayudarte a prevenir riesgos y promover una vida más sana. ¿En qué puedo ayudarte hoy?`;
    
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
    await ctx.reply('Puedes preguntarme sobre enfermedades transmisibles, salud sexual y reproductiva, salud mental, o reportar síntomas.');
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
    const userId = ctx.from?.id;
    const message = (ctx.message as any).text;

    // If it's a new user (not in persistent storage), greet them first
    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      await this.sendPersonalizedGreeting(ctx);
    }

    // RAG: Gather context from multiple sources
    let contextData = '';
    
    // 1. Check for Health Events (XML 1)
    const events = await this.healthDataService.getAllEvents();
    const matchedEventName = events.find(event => message.toLowerCase().includes(event.toLowerCase()));
    if (matchedEventName) {
      const stats = await this.healthDataService.getStatsForEvent(matchedEventName);
      if (stats) {
        contextData += `
--- DATOS REALES DE EVENTOS DE SALUD ---
Evento: ${stats.nombre_del_evento}
Total: ${stats.total_de_eventos}
Urbano: ${stats.urbano}, Rural: ${stats.rural}
Distribución por Edad: Primera Infancia(${stats.primera_infancia}), Infancia(${stats.infancia}), Adolescencia(${stats.adolescencia}), Juventud(${stats.juventud}), Adulto Joven(${stats.adulto_j_ven}), Adulto Mayor(${stats.adulto_mayor})
`;
      }
    }

    // 2. Check for Sexual Health QA (XML 2)
    const sexualHealthMatches = await this.sexualHealthService.findRelatedQA(message);
    if (sexualHealthMatches) {
      const qaContext = sexualHealthMatches.map(qa => `P: ${qa.pregunta}\nR: ${qa.respuesta}`).join('\n\n');
      contextData += `
--- DATOS DE SALUD SEXUAL Y REPRODUCTIVA ---
${qaContext}
`;
    }

    // 3. Check for Mental Health Stats (XML 3)
    const mentalHealthStats = await this.mentalHealthService.getStatsForDiagnosis(message);
    if (mentalHealthStats) {
      contextData += `
--- DATOS DE SALUD MENTAL (CIE-10) ---
Diagnóstico: ${mentalHealthStats.diagnostico_ingreso}
Código: ${mentalHealthStats.codigo_dx_ingreso}
Total Casos: ${mentalHealthStats.total}
Distribución por Edad: Menor 1(${mentalHealthStats.menor_a_1}), 1-4(${mentalHealthStats.de_1_a_4}), 5-9(${mentalHealthStats.de_5_a_9}), 10-14(${mentalHealthStats.de_10_a_14}), 15-19(${mentalHealthStats.de_15_a_19}), 20-49(${mentalHealthStats.de_20_a_49}), 50-64(${mentalHealthStats.de_50_a_64}), 65+(${mentalHealthStats._65_y_mas})
Año de registro: ${mentalHealthStats.a_o_diagn_stico}
`;
    }

    let augmentedPrompt = message;
    if (contextData) {
      augmentedPrompt = `
        Consulta del usuario: ${message}
        
        ${contextData}
        
        Por favor, utiliza la información de contexto proporcionada arriba para dar una respuesta precisa, profesional y empática. Si los datos no están presentes o son insuficientes, usa tu conocimiento general como experto en salud pública.
      `;
    }

    const response = await this.genkitService.generateResponse(augmentedPrompt);
    await this.sendLongMessage(ctx, response);
  }
}

import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';

@Update()
export class BotUpdate {
  // In-memory store to track users who have already been greeted in their current session
  private greetedUsers = new Map<number, boolean>();

  constructor(private readonly genkitService: GenkitService) {}

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private async sendPersonalizedGreeting(ctx: Context) {
    const firstName = ctx.from?.first_name || 'usuario';
    const greeting = this.getTimeGreeting();
    const welcomeMessage = `${greeting}, ${firstName}. 👋 Soy tu asistente de Salud IA para el Concurso Colombia. Estoy aquí para informarte sobre brotes de enfermedades y salud pública.`;
    
    await ctx.reply(welcomeMessage);
    
    if (ctx.from?.id) {
      this.greetedUsers.set(ctx.from.id, true);
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    // Explicitly reset session greeting when /start is called
    await this.sendPersonalizedGreeting(ctx);
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply('Puedes preguntarme sobre enfermedades transmisibles o reportar síntomas.');
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

    // If it's a new session (user not in map), greet them first
    if (userId && !this.greetedUsers.get(userId)) {
      await this.sendPersonalizedGreeting(ctx);
    }

    const response = await this.genkitService.generateResponse(message);
    await this.sendLongMessage(ctx, response);
  }
}

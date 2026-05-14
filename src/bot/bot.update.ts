import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';

@Update()
export class BotUpdate {
  constructor(private readonly genkitService: GenkitService) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('¡Hola! Soy tu asistente de Salud IA para el Concurso Colombia. Estoy aquí para informarte sobre brotes de enfermedades y salud pública.');
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply('Puedes preguntarme sobre enfermedades transmisibles o reportar síntomas.');
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const message = (ctx.message as any).text;
    const response = await this.genkitService.generateResponse(message);
    await ctx.reply(response);
  }
}

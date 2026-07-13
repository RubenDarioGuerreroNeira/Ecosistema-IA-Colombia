import { Catch, ExceptionFilter, ArgumentsHost, Logger } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Catch()
export class TelegramExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TelegramExceptionFilter.name);

  async catch(exception: any, host: ArgumentsHost) {
    const telegrafHost = TelegrafArgumentsHost.create(host);
    const ctx = telegrafHost.getContext<Context>();
    
    this.logger.error(`Error no controlado en el bot: ${exception.message}`, exception.stack);
    
    try {
        await ctx.reply('⚠️ Ocurrió un error inesperado al procesar tu solicitud. Por favor, intenta de nuevo más tarde.');
    } catch (replyError) {
        this.logger.error('No se pudo enviar el mensaje de error al usuario:', replyError);
    }
  }
}

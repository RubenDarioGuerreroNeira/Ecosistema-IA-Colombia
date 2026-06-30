import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import * as Joi from 'joi';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        TELEGRAM_BOT_TOKEN: Joi.string().required(),
        OPENROUTER_API_KEY: Joi.string().required(),
        OPENROUTER_MODEL: Joi.string().default(
          'nvidia/nemotron-3-super-120b-a12b:free',
        ),
        OPENROUTER_BASE_URL: Joi.string().default(
          'https://openrouter.ai/api/v1',
        ),
        PORT: Joi.number().default(3000),
        TELEGRAM_PROXY_URL: Joi.string().optional().allow(''),
        TELEGRAM_API_TIMEOUT: Joi.number().default(30000),
      }),
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('TELEGRAM_BOT_TOKEN')!;
        const proxyUrl = configService.get<string>('TELEGRAM_PROXY_URL');
        const timeout = configService.get<number>('TELEGRAM_API_TIMEOUT')!;

        const telegrafConfig: any = {
          token,
          handlerTimeout: timeout,
        };

        // Si se configuró un proxy, usarlo para la conexión a Telegram
        if (proxyUrl) {
          telegrafConfig.telegram = {
            agent: new HttpsProxyAgent(proxyUrl),
          };
        }

        return telegrafConfig;
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

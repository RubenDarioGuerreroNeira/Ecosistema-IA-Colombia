import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';

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
      }),
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN')!,
      }),
      inject: [ConfigService],
    }),
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

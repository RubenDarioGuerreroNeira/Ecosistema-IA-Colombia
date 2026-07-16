import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  console.log(`🚀 Starting Salud IA Bot on port ${port}...`);
  await app.listen(port);
  console.log(`✅ Salud IA Bot is running on port ${port}`);
}
bootstrap();

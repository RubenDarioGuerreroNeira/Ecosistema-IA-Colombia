import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * Servicio que encapsula la generación de respuestas usando la API de OpenRouter.
 * Se utiliza la variable de entorno `OPENROUTER_API_KEY` para la autenticación.
 * El modelo por defecto es Meta‑Llama 3.1 70B Instruct, pero puede ajustarse mediante la variable `OPENROUTER_MODEL`.
 *
 * Why: el proyecto declaraba uso de Gemini (googleAI) pero el usuario desea usar su propia clave de OpenRouter.
 * Cambiamos la implementación para evitar dependencias de Google y aprovechar el cliente OpenAI que ya está incluido.
 */
@Injectable()
export class GenkitService {
  private readonly logger = new Logger(GenkitService.name);
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? 'test',
    baseURL: 'https://openrouter.ai/api/v1',
  });

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateResponse(prompt: string): Promise<string> {
    const MAX_RETRIES = 3;
    let lastError: any;
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
        });
        return response.choices[0].message.content ?? '';
      } catch (error: any) {
        lastError = error;
        const isTransient = error?.status === 429 || error?.status === 503;
        if (isTransient && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `OpenRouter transient error (${error.status || error.code}). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
          continue;
        }
        this.logger.error(`OpenRouter API failed after ${attempt} retries: ${error.message}`);
        throw error;
      }
    }
    throw lastError;
  }
}

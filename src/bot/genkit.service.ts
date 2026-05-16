import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GenkitService {
  private readonly logger = new Logger(GenkitService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly basePrompt = `Actúa como un asistente experto en salud pública para Colombia.
Analiza la siguiente consulta y responde basándote en la prevención de enfermedades.

DIRECTRICES DE RESPUESTA:
1. Responde siempre en español. No uses inglés ni otro idioma.
2. Sé detallado pero conciso. Evita redundancias innecesarias.
3. Utiliza una estructura clara con viñetas o puntos para facilitar la lectura en Telegram.
4. IMPORTANTE: Utiliza siempre una gramática correcta y natural. Al referirte al país, usa siempre el género femenino (ej. "una Colombia más sana", "la construcción de una Colombia"), evitando errores como "un Colombia".

Consulta: `;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const baseURL = this.configService.get<string>('OPENROUTER_BASE_URL');
    this.model =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      'nvidia/nemotron-3-super-120b-a12b:free';

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateResponse(prompt: string): Promise<string> {
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const apiResponse = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${this.basePrompt}${prompt}`,
            },
          ],
          max_tokens: 1200,
        });

        const content = apiResponse.choices?.[0]?.message?.content;
        return content?.trim() ?? '';
      } catch (error: any) {
        lastError = error;

        const isTransientError =
          error.status === 'UNAVAILABLE' ||
          error.code === 503 ||
          error.message?.includes('503');

        if (isTransientError && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `OpenRouter API transient error (${error.status || error.code}). ` +
              `Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
          continue;
        }

        this.logger.error(
          `OpenRouter API failed after ${attempt} retries: ${error.message}`,
        );
        throw error;
      }
    }

    throw lastError;
  }
}

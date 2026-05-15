import { Injectable, Logger } from '@nestjs/common';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

@Injectable()
export class GenkitService {
  private readonly logger = new Logger(GenkitService.name);
  private ai = genkit({
    plugins: [googleAI()],
  });

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateResponse(prompt: string): Promise<string> {
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.ai.generate({
          model: googleAI.model('gemini-2.5-flash'),
          prompt: `Actúa como un asistente experto en salud pública para Colombia. 
          Analiza la siguiente consulta y responde basándote en la prevención de enfermedades. 
          
          DIRECTRICES DE RESPUESTA:
          1. Sé detallado pero conciso. Evita redundancias innecesarias.
          2. Utiliza una estructura clara con viñetas o puntos para facilitar la lectura en Telegram.
          3. IMPORTANTE: Utiliza siempre una gramática correcta y natural. Al referirte al país, usa siempre el género femenino (ej. "una Colombia más sana", "la construcción de una Colombia"), evitando errores como "un Colombia".
          
          Consulta: ${prompt}`,
        });
        return response.text;
      } catch (error: any) {
        lastError = error;
        
        // Check if the error is transient (503 Service Unavailable or UNAVAILABLE status)
        const isTransientError = 
          error.status === 'UNAVAILABLE' || 
          error.code === 503 || 
          error.message?.includes('503');

        if (isTransientError && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          this.logger.warn(
            `Gemini API transient error (${error.status || error.code}). ` +
            `Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await this.sleep(delay);
          continue;
        }

        // If it's not a transient error or we've exhausted retries, throw it
        this.logger.error(`Gemini API failed after ${attempt} retries: ${error.message}`);
        throw error;
      }
    }

    throw lastError;
  }
}

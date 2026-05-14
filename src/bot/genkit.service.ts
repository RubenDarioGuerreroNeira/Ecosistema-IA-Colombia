import { Injectable } from '@nestjs/common';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

@Injectable()
export class GenkitService {
  private ai = genkit({
    plugins: [googleAI()],
  });

  async generateResponse(prompt: string): Promise<string> {
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
  }
}

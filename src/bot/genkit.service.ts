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
      Analiza la siguiente consulta y responde basándote en la prevención de enfermedades: ${prompt}`,
    });
    return response.text;
  }
}

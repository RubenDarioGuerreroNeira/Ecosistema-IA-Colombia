import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class GraphicsQuestionsService {
  constructor() { }

  getAvailableQuestions(): string {
    return `📊 **Capacidades de Generación de Gráficos:**

Puedo generar visualizaciones dinámicas sobre diversos temas de salud en Colombia:

🍃 **Calidad del aire**
• "Graficar calidad del aire en Cali"
• "Visualizar indicadores de aire en Bogotá"

🏥 **Servicios de salud en Cali**
• "Gráfico de servicios de salud en Cali"
• "Distribución de clínicas y hospitales en Cali"

🧠 **Salud mental**
• "Gráfico de los diagnósticos de salud mental más frecuentes"
• "Top 6 trastornos mentales en Colombia"

🔬 **Salud pública (SIVIGILA)**
• "Top eventos de salud pública en Colombia"
• "Gráfico de dengue por sexo"
• "Gráfico de Zika en zona rural vs urbana"
• "Tendencia de tuberculosis en los últimos 6 meses"

💉 **Vacunación**
• "Graficar vacunas en Antioquia"
• "Visualizar cobertura de vacunación en Santander"

¿Qué información deseas visualizar hoy?`;
  }

  async processGraphicsQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    // Solo devolver la lista de capacidades si el usuario pregunta EXPLÍCITAMENTE
    // qué gráficos puede hacer, no cuando menciona "grafico" + algo específico
    const explicitQuery =
      norm.includes('que graficos') ||
      norm.includes('que graficas') ||
      norm.includes('que puedes graficar') ||
      norm.includes('que tipo de graficos') ||
      (norm.includes('ayuda') && norm.includes('grafico'));

    if (explicitQuery) {
      return this.getAvailableQuestions();
    }

    return null;
  }
}
import { Injectable } from '@nestjs/common';
import { normalizeString } from '../../shared/health-utils';
import { ChartQueryService } from '../chart/chart-query.service';

@Injectable()
export class GraphicsQuestionsService {
  constructor(
    private readonly chartQueryService: ChartQueryService
  ) { }

  getAvailableQuestions(): string {
    return `📊 **Capacidades de Generación de Gráficos:**

Puedo generar visualizaciones dinámicas sobre diversos temas de salud en Colombia:
-------------------------------------------------------------------------
🍃 **Calidad del Aire**
-------------------------------------------------------------------------
• "Graficar calidad del aire en Cali"
• "Visualizar indicadores de aire en Bogotá"
-------------------------------------------------------------------------
🏥 **Servicios de Salud en Cali**
-------------------------------------------------------------------------
• "Gráfico de Servicios de salud en Cali"
• "Distribución de clínicas y hospitales en Cali"
-------------------------------------------------------------------------
🧠 **Salud Mental**
-------------------------------------------------------------------------
  "Te puedo mostrar:"

• "Gráfico de los diagnósticos de salud mental más frecuentes"
• "Top 6 trastornos mentales en Colombia"
-------------------------------------------------------------------------
📍 **Distribución por sexo/zona/tendencia para eventos específicos**
-------------------------------------------------------------------------
  "Puedes pedirme": 

  "Grafico de distribucion por zona de los siguientes eventos":
  ['tuberculosis', 'dengue', 'zika', 'malaria', 'sarampion', 
  'hepatitis', 'rabia'];   
  "Ejemplo: "¿Puedes mostrarme el grafico de distribucion 
   por zona de la malaria?""

-------------------------------------------------------------------------
🔬 **Salud Pública (SIVIGILA)**
-------------------------------------------------------------------------  
"Puedes pedirme":

 • "Gráfico de Top eventos de salud pública en Colombia"  
 • "Gráfico de distribución por sexo de los sigueintes eventos":['tuberculosis', 'dengue', 'zika', 'malaria', 'sarampion','hepatitis', 'rabia']; "
  "¿Puedes mostrarme el grafico de distribucion por sexo de la tuberculosis?"
   -------------------------------------------------------------------------
📉 **Tendencias en los ultimos 6 meses**
   -------------------------------------------------------------------------
- "Ejemplos: 
  ¿Puedes mostrarme el grafico de tendencia de la tuberculosis en los últimos 6 meses?
  ¿Puedes mostrarme el grafico de tendencia del dengue en los últimos 6 meses?
  ¿Puedes mostrarme el grafico de tendencia de la zika en los últimos 6 meses?
  ¿Puedes mostrarme el grafico de tendencia de la malaria en los últimos 6 meses?
-------------------------------------------------------------------------
💉 **Vacunación**
-------------------------------------------------------------------------
• "¿De que departamentos puedes generar gráficos de la  información de vacunación?" 
  (Te mostrare el listado de departamentos)
• "¿De cuál deseas ver la cobertura? (Ej: "Puedes Graficar vacunas en Santander") "

¿Qué información deseas visualizar hoy?`;
  }

  async processGraphicsQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    // Consulta explícita de capacidades (qué gráficos puede hacer)
    const explicitQuery =
      norm.includes('que graficos') ||
      norm.includes('que graficas') ||
      norm.includes('que puedes graficar') ||
      norm.includes('que tipo de graficos') ||
      norm.includes('que tipo de graficas') ||
      norm.includes('que tipo de graficos puedes hacer') ||
      norm.includes('que tipo de graficas puedes hacer') ||
      norm.includes('que graficos puedes hacer') ||
      norm.includes('que graficas puedes hacer') ||

      (norm.includes('ayuda') && norm.includes('grafico'));

    if (explicitQuery) {
      return this.getAvailableQuestions();
    }

    // Si la consulta contiene "grafico"/"grafica"/"visualizar", no devolver nada aquí.
    // handleChartQuery en bot.update.ts se encargará de llamar a processChartQuery
    // y enviar la foto correctamente con ctx.replyWithPhoto
    if (norm.includes('grafico') || norm.includes('grafica') || norm.includes('graficos') || norm.includes('graficas') || norm.includes('visualizar') || norm.includes('mostrar grafico')) {
      return null;
    }
    return null;
  }

}
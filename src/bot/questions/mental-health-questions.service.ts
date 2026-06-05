import { Injectable } from '@nestjs/common';
import { MentalHealthService, MentalHealthEvent } from '../mental-health.service';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class MentalHealthQuestionsService {
  constructor(private readonly mentalHealthService: MentalHealthService) { }

  getAvailableQuestions(): string {
    return `🧠 **Capacidades sobre Salud Mental:**

Puedo ayudarte a resolver las siguientes consultas:

1. 🔍 **Buscar diagnóstico:** "¿Cuántos casos hay de depresión?"
2. 📊 **Top diagnósticos:** "¿Cuáles son los diagnósticos más frecuentes?"
3. ⚖️ **Comparar:** "Compara depresión vs ansiedad"
4. 📈 **Perfil de riesgo:** "¿Cuál es el perfil de riesgo de depresión?"
5. 👶 **Por ciclo de vida:**
   - "Diagnósticos más frecuentes en niños"
   - "Diagnósticos más comunes en adolescentes"
   - "Diagnósticos frecuentes en adultos"
   - "Diagnósticos en mayores"
6. 🌐 **Distribución general:** "¿Cómo es la distribución de edades en salud mental?"
7. ℹ️ **Resumen:** "¿Qué información tienes sobre salud mental?"

¿Sobre qué tema de salud mental te gustaría consultar?`;
  }

  /**
   * Procesa una consulta de texto y retorna una respuesta formateada.
   */
  async processMentalHealthQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    if (norm.includes('distribucion de edades') || norm.includes('distribucion general')) {
      return this.handleAgeDistribution();
    }

    if (norm.includes('diagnosticos mas frecuentes') || norm.includes('top diagnosticos')) {
      return this.handleTopDiagnoses();
    }

    if (norm.includes('compara') || norm.includes(' vs ')) {
      return this.handleComparison(text);
    }

    if (norm.includes('perfil de riesgo')) {
      return this.handleRiskProfile(text);
    }

    if (norm.includes('ninos') || norm.includes('adolescentes') || norm.includes('adultos') || norm.includes('mayores')) {
      return this.handleLifeCycle(text);
    }

    // Por defecto, intentar buscar estadísticas de un diagnóstico
    return this.handleDiagnosisStats(text);
  }

  private async handleAgeDistribution(): Promise<string> {
    const dist = await this.mentalHealthService.getAgeDistribution();
    return `🌐 **Distribución Nacional de Casos por Edad:**

👶 **Niños (0-9):** ${(dist.menor_a_1 + dist.de_1_a_4 + dist.de_5_a_9).toLocaleString()}
🧒 **Adolescentes (10-19):** ${(dist.de_10_a_14 + dist.de_15_a_19).toLocaleString()}
🧑 **Adultos (20-64):** ${(dist.de_20_a_49 + dist.de_50_a_64).toLocaleString()}
👴 **Mayores (65+):** ${dist._65_y_mas.toLocaleString()}

📈 **Total Global Registrado:** ${dist.total_global.toLocaleString()} casos.`;
  }

  private async handleTopDiagnoses(): Promise<string> {
    const top = await this.mentalHealthService.getTopDiagnoses(5);
    let resp = `📊 **Top 5 Diagnósticos más frecuentes:**\n\n`;
    top.forEach((e, i) => {
      resp += `${i + 1}. **${e.diagnostico_ingreso}**: ${e.total.toLocaleString()} casos\n`;
    });
    return resp;
  }

  private async handleComparison(text: string): Promise<string | null> {
    const parts = text.split(/compara| vs /i).filter(p => p.trim().length > 0);
    if (parts.length < 2) return "Para comparar, usa el formato: 'Compara [diagnóstico 1] vs [diagnóstico 2]'";

    const comp = await this.mentalHealthService.getComparisonBetweenDiagnoses(parts[0], parts[1]);
    if (!comp) return "No pude encontrar uno o ambos diagnósticos para comparar. Intenta ser más específico.";

    return `⚖️ **Comparativa de Salud Mental:**

🔹 **${comp.d1.diagnostico_ingreso}**
Total: ${comp.d1.total.toLocaleString()} casos

🔸 **${comp.d2.diagnostico_ingreso}**
Total: ${comp.d2.total.toLocaleString()} casos

*Diferencia:* ${Math.abs(comp.d1.total - comp.d2.total).toLocaleString()} casos.`;
  }

  private async handleRiskProfile(text: string): Promise<string | null> {
    const diagName = text.replace(/perfil de riesgo|de|del/gi, '').trim();
    const profile = await this.mentalHealthService.getRiskProfileByDiagnosis(diagName);
    if (!profile) return "No encontré el diagnóstico para generar el perfil de riesgo.";

    return `📈 **Perfil de Riesgo: ${profile.diagnostico}**

La población más afectada según el ciclo de vida es:

👶 **Niños:** ${profile.distribucion.niños.toLocaleString()}
🧒 **Adolescentes:** ${profile.distribucion.adolescentes.toLocaleString()}
🧑 **Adultos:** ${profile.distribucion.adultos.toLocaleString()}
👴 **Mayores:** ${profile.distribucion.mayores.toLocaleString()}

*Total casos analizados:* ${profile.total.toLocaleString()}`;
  }

  private async handleLifeCycle(text: string): Promise<string | null> {
    const norm = normalizeString(text);
    let cycle = '';
    if (norm.includes('ninos')) cycle = 'niños';
    else if (norm.includes('adolescentes')) cycle = 'adolescentes';
    else if (norm.includes('adultos')) cycle = 'adultos';
    else if (norm.includes('mayores')) cycle = 'mayores';

    if (!cycle) return null;

    const top = await this.mentalHealthService.getTopByLifeCycle(cycle, 5);
    let resp = `👶 **Top 5 Diagnósticos en ${cycle}:**\n\n`;
    top.forEach((e, i) => {
      resp += `${i + 1}. **${e.diagnostico_ingreso}**: ${e.total_en_ciclo.toLocaleString()} casos en este grupo\n`;
    });
    return resp;
  }

  private async handleDiagnosisStats(text: string): Promise<string | null> {
    const event = await this.mentalHealthService.getStatsForDiagnosis(text);
    if (!event) return null;

    return `🔍 **Resultado de Búsqueda:**

📌 **Diagnóstico:** ${event.diagnostico_ingreso}
🆔 **Código:** ${event.codigo_dx_ingreso}
📊 **Total de casos:** ${event.total.toLocaleString()}

¿Deseas ver el perfil de riesgo o compararlo con otro diagnóstico?`;
  }

  /**
   * Sugiere diagnósticos basados en una búsqueda parcial (Autocompletado).
   */
  async suggestDiagnoses(partial: string): Promise<string[]> {
    const matches = await this.mentalHealthService.searchDiagnoses(partial);
    return matches.slice(0, 5).map(m => m.diagnostico_ingreso);
  }
}

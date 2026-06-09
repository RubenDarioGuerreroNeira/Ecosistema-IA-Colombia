import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { MentalHealthService, MentalHealthEvent, MentalHealthEventWithTotal } from '../mental-health/mental-health.service';
import { normalizeString } from '../../shared/health-utils';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GENERIC_RISK_LIST = `🧠 **Salud Mental (CIE-10):**
- Episodios depresivos (graves, moderados)
- Trastornos de ansiedad (mixtos, fóbicos)
- Trastorno Afectivo Bipolar
- Esquizofrenia y trastornos psicóticos
- Consumo de sustancias psicoactivas (SPA)

🔬 **Salud Pública (SIVIGILA):**
• _Enfermedades Transmisibles:_ Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Varicela, Hepatitis A, B y C
• _Eventos de Violencia:_ Violencia de género e intrafamiliar, agresiones por animales (rabia)
• _Otros:_ Desnutrición aguda, intento de suicidio, defectos congénitos, intoxicaciones, accidentes ofídicos

❤️ **Salud Sexual y Reproductiva:**
- Prevención y derechos en VIH/SIDA
- Sífilis (incluyendo gestacional y congénita)
- Cáncer de cuello uterino y mama (VPH)
- Métodos anticonceptivos y derechos reproductivos`;

const CYCLE_KEYWORDS = [
  { keys: ['adolescente', 'adolescentes'], cycle: 'adolescentes' },
  { keys: ['jovenes', 'joven'], cycle: 'jovenes' },
  { keys: ['mayores', 'mayor'], cycle: 'mayores' },
  { keys: ['ninos', 'nino', 'nena'], cycle: 'niños' },
  { keys: ['adultos', 'adulto'], cycle: 'adultos' },
];

interface RiskProfile {
  diagnostico: string;
  total: number;
  distribucion: Record<string, number>;
}

interface MentalHealthComparison {
  d1: { diagnostico_ingreso: string; total: number };
  d2: { diagnostico_ingreso: string; total: number };
}

interface AgeDistribution {
  menor_a_1: number;
  de_1_a_4: number;
  de_5_a_9: number;
  de_10_a_14: number;
  de_15_a_19: number;
  de_20_a_49: number;
  de_50_a_64: number;
  _65_y_mas: number;
  total_global: number;
}

@Injectable()
export class MentalHealthQuestionsService {
  constructor(private readonly mentalHealthService: MentalHealthService) { }

  getAvailableQuestions(): string {
    return `🧠 **Capacidades sobre Salud Mental:**

Puedo ayudarte a resolver las siguientes consultas:

1. 🔍 **Buscar diagnóstico:** "¿Cuántos casos hay de depresión?"
2. 📊 **Top diagnósticos:** "¿Cuáles son los diagnósticos más frecuentes?"
3. ⚖️ **Comparar:** "Compara depresión vs ansiedad"
4. 📈 **Perfil de riesgo:** "¿Cuál es el perfil de riesgo de depresión?" o "Riesgo de ansiedad"
5. 👶 **Por ciclo de vida:**
   - "Diagnósticos más frecuentes en niños"
   - "Diagnósticos más comunes en adolescentes"
   - "Diagnósticos frecuentes en adultos"
   - "Diagnósticos en mayores"
6. 🌐 **Distribución por edad:** "¿Cómo es la distribución de edades en salud mental?"
7. 📋 **Resultados detallados por diagnóstico:**
   - "¿Cuántos casos hay de depresión?" (te mostraré código CIE-10, total y opciones)
   - Buscaré incluso con palabras parciales
8. 🔎 **Autocompletado de diagnósticos:** "Busca diagnósticos que contengan 'dep'"
9. 🗂️ **Listar todos los diagnósticos:** "Lista todos los diagnósticos de salud mental" o "Catálogo CIE-10"
10. ℹ️ **Ayuda general:** "¿Qué información tienes sobre salud mental?"

**Ejemplos rápidos:**
- "¿Cuántos casos de ansiedad hay?"
- "Compara depresión vs trastorno bipolar"
- "Perfil de riesgo de esquizofrenia"
- "Diagnósticos frecuentes en adolescentes"
- "Distribución de edades"
- "Lista todos los diagnósticos"

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

  async handleAgeDistribution(): Promise<string> {
    const dist = await this.mentalHealthService.getAgeDistribution();
    return `🌐 **Distribución Nacional de Casos por Edad:**

👶 **Niños (0-9):** ${(dist.menor_a_1 + dist.de_1_a_4 + dist.de_5_a_9).toLocaleString()}
🧒 **Adolescentes (10-19):** ${(dist.de_10_a_14 + dist.de_15_a_19).toLocaleString()}
🧑 **Adultos (20-64):** ${(dist.de_20_a_49 + dist.de_50_a_64).toLocaleString()}
👴 **Mayores (65+):** ${dist._65_y_mas.toLocaleString()}

📈 **Total Global Registrado:** ${dist.total_global.toLocaleString()} casos.`;
  }

  async handleTopDiagnoses(): Promise<string> {
    const top = await this.mentalHealthService.getTopDiagnoses(5);
    let resp = `📊 **Top 5 Diagnósticos más frecuentes:**\n\n`;
    top.forEach((e, i) => {
      resp += `${i + 1}. **${e.diagnostico_ingreso}**: ${e.total.toLocaleString()} casos\n`;
    });
    return resp;
  }

  async handleComparison(text: string): Promise<string | null> {
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

  async handleRiskProfile(text: string): Promise<string | null> {
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

  async handleLifeCycle(text: string): Promise<string | null> {
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

  async handleDiagnosisStats(text: string): Promise<string | null> {
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

  // ─── Nuevos métodos movidos desde BotUpdate ──────────────────────────────────
  async handleMentalHealthQuery(ctx: Context, text: string): Promise<boolean> {
    const norm = normalizeString(text);

    const isMentalHealth =
      norm.includes('salud mental') ||
      norm.includes('psicologia') ||
      norm.includes('psiquiatria') ||
      norm.includes('depresion') ||
      norm.includes('ansiedad') ||
      norm.includes('trastorno') ||
      norm.includes('esquizo') ||
      norm.includes('bipol') ||
      norm.includes('demencia') ||
      norm.includes('delirio') ||
      norm.includes('psicosis') ||
      norm.includes('mania') ||
      norm.includes('agorafobia') ||
      norm.includes('retraso') ||
      norm.includes('spa') ||
      (norm.includes('diagnostico') && norm.includes('mental'));

    const isRiskProfileQuery =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    const isLifeCycleQuery =
      (norm.includes('ninos') ||
        norm.includes('nino') ||
        norm.includes('adolescente') ||
        norm.includes('jovenes') ||
        norm.includes('joven') ||
        norm.includes('adultos') ||
        norm.includes('adulto') ||
        norm.includes('mayores') ||
        norm.includes('mayor')) &&
      (norm.includes('diagnostico') ||
        norm.includes('frecuente') ||
        norm.includes('comunes') ||
        norm.includes('mental') ||
        norm.includes('salud'));

    if (!isMentalHealth && !isLifeCycleQuery && !isRiskProfileQuery) {
      return false;
    }

    const hasRiskKeyword =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    const isGenericRiskQuery =
      hasRiskKeyword &&
      !norm.includes('depres') &&
      !norm.includes('ansied') &&
      !norm.includes('trastorn') &&
      !norm.includes('esquizo') &&
      !norm.includes('bipol') &&
      !norm.includes('spa') &&
      !norm.includes('dengue') &&
      !norm.includes('zika') &&
      !norm.includes('chikun') &&
      !norm.includes('malaria') &&
      !norm.includes('tuberculosis') &&
      !norm.includes('vih') &&
      !norm.includes('sifilis') &&
      !norm.includes('cancer') &&
      !norm.includes('anticoncep');

    if (isGenericRiskQuery) {
      await ctx.reply(
        '❓ No detecté de qué patología deseas conocer el perfil de riesgo.\n\n' +
        'Por favor, especifica la enfermedad. Aquí tienes las áreas que manejo:\n\n' +
        GENERIC_RISK_LIST +
        '\n\n**Ejemplo:** "¿Cuál es el perfil de riesgo de depresión?" o "Riesgo de dengue"',
        { parse_mode: 'Markdown' },
      );
      return true;
    }

    const explicitDiagnosis = await this.mentalHealthService.getStatsForDiagnosis(text);

    if (await this.handleMentalHealthCapabilitiesQuery(ctx, norm)) return true;
    if (await this.handleMentalHealthTopDiagnoses(ctx, norm)) return true;
    if (await this.handleMentalHealthAgeDistribution(ctx, norm)) return true;
    if (await this.handleMentalHealthLifeCycleQuery(ctx, norm, text)) return true;
    if (await this.handleMentalHealthRiskProfile(ctx, norm, text, explicitDiagnosis)) return true;
    if (await this.handleMentalHealthComparison(ctx, norm, text)) return true;
    if (await this.handleMentalHealthStats(ctx, text)) return true;

    return false;
  }

  async handleMentalHealthCapabilitiesQuery(ctx: Context, norm: string): Promise<boolean> {
    if (
      norm.includes('que informacion tienes sobre salud mental') ||
      norm.includes('que información tienes sobre salud mental') ||
      norm.includes('cuales preguntas puedes responder sobre salud mental') ||
      norm.includes('salud mental') ||
      norm.includes('mental') ||
      norm.includes('ayuda sobre salud mental')
    ) {
      await ctx.reply(this.getAvailableQuestions(), {
        parse_mode: 'Markdown',
      });
      return true;
    }
    return false;
  }

  async handleMentalHealthTopDiagnoses(ctx: Context, norm: string): Promise<boolean> {
    if (
      norm.includes('frecuente') ||
      norm.includes('top') ||
      norm.includes('mas comunes')
    ) {
      const top = await this.mentalHealthService.getTopDiagnoses(5);
      const lines = top.map(
        (d: MentalHealthEvent, i: number) => `${i + 1}. **${d.diagnostico_ingreso}**: ${d.total} casos`,
      );
      await ctx.reply(
        `🧠 **Top diagnósticos de salud mental:**\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }
    return false;
  }

  async handleMentalHealthAgeDistribution(ctx: Context, norm: string): Promise<boolean> {
    if (norm.includes('distribucion') && norm.includes('edad')) {
      const dist = await this.mentalHealthService.getAgeDistribution();
      const lines = [
        `👤 Menor a 1 año: ${dist.menor_a_1}`,
        `👶 1-4 años: ${dist.de_1_a_4}`,
        `🧒 5-9 años: ${dist.de_5_a_9}`,
        `🧑 10-14 años: ${dist.de_10_a_14}`,
        `🧑 15-19 años: ${dist.de_15_a_19}`,
        `👨 20-49 años: ${dist.de_20_a_49}`,
        `🧔 50-64 años: ${dist.de_50_a_64}`,
        `👴 65+ años: ${dist._65_y_mas}`,
      ];
      await ctx.reply(
        `📊 **Distribución por edad en salud mental:**\n\n${lines.join('\n')}\n\n📈 Total: ${dist.total_global} casos`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }
    return false;
  }

  async handleMentalHealthLifeCycleQuery(ctx: Context, norm: string, text: string): Promise<boolean> {
    for (const { keys, cycle } of CYCLE_KEYWORDS) {
      const hasCycle = keys.some((k) => norm.includes(k));
      if (
        hasCycle &&
        (norm.includes('diagnostico') ||
          norm.includes('frecuente') ||
          norm.includes('comunes'))
      ) {
        const top = await this.mentalHealthService.getTopByLifeCycle(cycle, 3);
        if (top.length > 0) {
          const lines = top.map(
            (d: MentalHealthEventWithTotal) => `- **${d.diagnostico_ingreso}**: ${d.total_en_ciclo} casos`,
          );
          await ctx.reply(
            `🧠 **Diagnósticos más frecuentes en ${cycle}:**\n\n${lines.join('\n')}`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }
    }
    return false;
  }

  async handleMentalHealthRiskProfile(
    ctx: Context,
    norm: string,
    text: string,
    explicitDiagnosis?: MentalHealthEvent | null,
  ): Promise<boolean> {
    if (
      (norm.includes('perfil') || norm.includes('factor')) &&
      norm.includes('riesgo')
    ) {
      let diagName =
        explicitDiagnosis?.diagnostico_ingreso ||
        text
          .replace(/[¿?]/g, '')
          .replace(/(perfil|factor) de riesgo (de |del )?/i, '')
          .replace(/en salud mental/i, '')
          .replace(/cu[áa]l\s+es\s+el/i, '')
          .replace(/^\s*(el|la|los|las)\s+/i, '')
          .trim();

      diagName = diagName.replace(/perfil de riesgo/gi, '').trim();

      if (!diagName || diagName.length < 3) return false;

      const profile = await this.mentalHealthService.getRiskProfileByDiagnosis(diagName);
      if (profile) {
        const lines = Object.entries(profile.distribucion).map(
          ([cycle, count]) => `- ${cycle}: ${count}`,
        );
        await ctx.reply(
          `🧠 **Perfil de riesgo: ${profile.diagnostico}**\n\nTotal: ${profile.total} casos\n\n**Distribución por ciclo de vida:**\n${lines.join('\n')}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      } else {
        await ctx.reply(
          `⚠️ No encontré datos específicos sobre el factor o perfil de riesgo para "${diagName}" en mis registros de salud mental.`,
        );
        return true;
      }
    }
    return false;
  }

  async handleMentalHealthComparison(ctx: Context, norm: string, text: string): Promise<boolean> {
    if (norm.includes('compara') && norm.includes(' vs ')) {
      const parts = text.split(/\s+vs\s+/i);
      if (parts.length === 2) {
        const d1Name = parts[0].replace(/compara\s*/i, '').trim();
        const d2Name = parts[1].trim();
        const comp = await this.mentalHealthService.getComparisonBetweenDiagnoses(
          d1Name,
          d2Name,
        );
        if (comp) {
          await ctx.reply(
            `⚖️ **Comparativa:**\n\n**${comp.d1.diagnostico_ingreso}:** ${comp.d1.total} casos\n**${comp.d2.diagnostico_ingreso}:** ${comp.d2.total} casos`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }
    }
    return false;
  }

  async handleMentalHealthStats(ctx: Context, text: string): Promise<boolean> {
    const cleanSearch = text
      .replace(/cuantos? casos hay de?/i, '')
      .replace(/casos de?/i, '')
      .replace(/\?/g, '')
      .trim();

    if (cleanSearch.length > 3) {
      const stats = await this.mentalHealthService.getStatsForDiagnosis(cleanSearch);
      if (stats) {
        await ctx.reply(
          `🧠 **${stats.diagnostico_ingreso}**\n\n` +
          `📊 **Total:** ${stats.total} casos\n` +
          `🆔 **Código:** ${stats.codigo_dx_ingreso}\n` +
          `📅 **Año:** ${stats.a_o_diagn_stico}`,
          { parse_mode: 'Markdown' },
        );
        return true;
      }
    }
    return false;
  }
}
import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { MentalHealthService, MentalHealthEvent, MentalHealthEventWithTotal } from '../mental-health/mental-health.service';
import { normalizeString } from '../../shared/health-utils';

// ─── Constants ─────────────────────────────────────────────────────────────────
export const GENERIC_RISK_LIST = `🧠 **Salud Mental (CIE-10):**
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

export const CYCLE_KEYWORDS = [
  { keys: ['adolescente', 'adolescentes'], cycle: 'adolescentes' },
  { keys: ['jovenes', 'joven'], cycle: 'jovenes' },
  { keys: ['mayores', 'mayor'], cycle: 'mayores' },
  { keys: ['ninos', 'nino', 'nena'], cycle: 'niños' },
  { keys: ['adultos', 'adulto'], cycle: 'adultos' },
];

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
11. 📋 **Listar todas las enfermedades:** "¿De qué enfermedades mentales tienes información?" o "Lista todas las enfermedades"

**Ejemplos rápidos:**
- "¿Cuántos casos de ansiedad hay?"
- "¿Cuántos casos hay de trastorno afectivo bipolar?"
- "Compara depresión vs trastorno bipolar"
- "Perfil de riesgo de esquizofrenia"
- "Diagnósticos frecuentes en adolescentes"
- "Distribución de edades"
- "Lista todos los diagnósticos"
- "Listado de enfermedades mentales de las cuales tienes conocimientos"
 ó 
 - "De que enfermedades mentales tienes conocimientos" (te muestro el listado)

¿Sobre qué tema de salud mental te gustaría consultar?`;
  }

  // ─── Métodos principales usados desde BotUpdate ──────────────────────────────
  async handleMentalHealthQuery(ctx: Context, text: string): Promise<boolean> {
    const norm = normalizeString(text);

    // Si la consulta contiene "grafico", dejar que pase a handleChartQuery
    if (norm.includes('grafico') || norm.includes('grafica') || norm.includes('graficos') || norm.includes('graficas') || norm.includes('visualizar')) {
      return false;
    }


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
      (norm.includes('diagnostico') && norm.includes('mental')) ||
      (norm.includes('enfermedade') && norm.includes('mental'));

    const isRiskProfileQuery =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    // Solo detectar ciclo de vida si la consulta NO menciona "eventos" (que es de salud pública)
    const isLifeCycleQuery =
      !norm.includes('eventos') &&
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

    // pregunta para mostrar lista de todas las enfermedades mentales
    const isListAllQuery =
      norm.includes('listado') ||
      norm.includes('lista todos los diagnosticos') ||
      norm.includes('listar') ||
      norm.includes('catalogo') ||
      norm.includes('todas las enfermedades') ||
      norm.includes('de que enfermedades') ||
      norm.includes('que enfermedades') ||
      norm.includes('enfermedades mentales') ||
      (norm.includes('enfermedade') && norm.includes('mental'));

    // Listar enfermedades debe ir ANTES de capabilities, porque capabilities mata con "mental"/"salud mental"
    if (isListAllQuery && isMentalHealth) {
      return await this.handleMentalHealthListAll(ctx);
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
    // Solo responder capacidades si la consulta es EXPLÍCITAMENTE sobre ayuda/información general
    const isHelpQuery =
      norm.includes('que informacion') ||
      norm.includes('que información') ||
      norm.includes('que sabes') ||
      norm.includes('que puedes') ||
      norm.includes('ayuda') ||
      norm.includes('cuales preguntas') ||
      norm.includes('capacidades');

    if (isHelpQuery && (norm.includes('salud mental') || norm.includes('mental'))) {
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
    // Si la consulta menciona "eventos", es de salud pública, NO de salud mental
    if (norm.includes('eventos')) return false;

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

  /**
   * Lista todas las enfermedades mentales disponibles (Catálogo CIE-10).
   */
  async handleMentalHealthListAll(ctx: Context): Promise<boolean> {
    const diagnoses = await this.mentalHealthService.getAllDiagnoses();
    if (diagnoses.length === 0) {
      await ctx.reply('No encontré registros de diagnósticos de salud mental en mi base de datos.');
      return true;
    }

    const intro = `🧠 **Catálogo de Diagnósticos de Salud Mental (CIE-10)**
Tengo información sobre **${diagnoses.length}** enfermedades y trastornos mentales:\n\n`;

    // Agrupar por letra inicial para mejor legibilidad
    const grouped = new Map<string, string[]>();
    for (const diag of diagnoses) {
      const firstLetter = diag.charAt(0).toUpperCase();
      if (!grouped.has(firstLetter)) grouped.set(firstLetter, []);
      grouped.get(firstLetter)!.push(diag);
    }

    const lines: string[] = [];
    for (const [letter, items] of grouped) {
      lines.push(`**${letter}:** ${items.join(', ')}`);
    }

    // Limpiar líneas demasiado largas o con caracteres inválidos para Markdown/Telegram
    const sanitized = lines.map(l => l.replace(/[^\x00-\x7F]/g, '').substring(0, 200));

    const footer = `\n¿Sobre cuál de estos diagnósticos te gustaría consultar?`;

    // Enviar intro
    await ctx.reply(intro, { parse_mode: 'Markdown' });

    // Enviar chunks del listado
    let chunk = '';
    const CHUNK_MAX = 3000;
    for (const line of sanitized) {
      // Si una línea individual supera el límite, enviarla sola truncada
      if (line.length + 2 > CHUNK_MAX) {
        if (chunk.trim()) {
          await ctx.reply(chunk, { parse_mode: 'Markdown' });
          chunk = '';
        }
        await ctx.reply(line.substring(0, CHUNK_MAX - 2), { parse_mode: 'Markdown' });
        continue;
      }

      if (chunk.length + line.length + 2 > CHUNK_MAX) {
        if (chunk.trim()) {
          await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
        chunk = '';
      }
      chunk += line + '\n\n';
    }

    if (chunk.trim()) {
      await ctx.reply(chunk, { parse_mode: 'Markdown' });
    }

    // Enviar footer solo si hay contenido previo
    await ctx.reply(footer, { parse_mode: 'Markdown' });

    return true;
  }
}

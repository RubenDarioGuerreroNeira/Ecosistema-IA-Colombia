import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import {
  MentalHealthService,
  MentalHealthEvent,
  MentalHealthEventWithTotal,
} from '../mental-health/mental-health.service';
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

  /**
   * ============================================================================
   * MÉTODO: getAvailableQuestions
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "¿Qué información tienes sobre salud mental?"
   *   - "¿Qué sabes de salud mental?"
   *   - "¿Qué puedes hacer?"
   *   - "Ayuda" (en contexto de salud mental)
   *   - "¿Cuáles preguntas puedo hacer?"
   *   - "Capacidades"
   *
   * Descripción: Devuelve un mensaje con el listado completo de todas las
   * capacidades y ejemplos de preguntas que el bot puede responder sobre
   * salud mental.
   * ============================================================================
   */
  getAvailableQuestions(): string {
    return `🧠 **Capacidades sobre Salud Mental:**

Puedo ayudarte a resolver las siguientes consultas:

1. 🔍 **Buscar diagnóstico:** 
"¿Cuántos casos hay de depresión?"

2. 📊 **Top diagnósticos:** "
¿Cuáles son los diagnósticos más frecuentes?"

3. ⚖️ **Comparar:** 
"Compara depresión vs ansiedad"


4. 👶 **Por ciclo de vida:**
   - "Diagnósticos más frecuentes en niños"
   - "Diagnósticos más comunes en adolescentes"
   - "Diagnósticos frecuentes en adultos"
   - "Diagnósticos en mayores"

5 🌐 **Distribución por edad:** 
"¿Cómo es la distribución de edades en salud mental?"

6 📋 **Resultados detallados por diagnóstico:**
   - "¿Cuántos casos hay de depresión?" (te mostraré código CIE-10, total y opciones)
   - Buscaré incluso con palabras parciales

7. 🔎 **Autocompletado de diagnósticos:** 
"Busca diagnósticos que contengan 'dep'"

8. 🗂️ **Listar todos los diagnósticos:** 
"Lista todos los diagnósticos de salud mental" o "Catálogo CIE-10"

9. ℹ️ **Ayuda general:** 
"¿Qué información tienes sobre salud mental?"

10. 📋 **Listar todas las enfermedades:
** "¿De qué enfermedades mentales tienes información?" o "Lista todas las enfermedades"

**Ejemplos rápidos:**
- "¿Cuántos casos de ansiedad hay?"
- "¿Cuántos casos hay de trastorno afectivo bipolar?"
- "Compara depresión vs trastorno bipolar"

- "Diagnósticos frecuentes en adolescentes"
- "Distribución por edad en salud mental"

¿Sobre qué tema de salud mental te gustaría consultar?`;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  MÉTODO PRINCIPAL - DISPATCHER
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * ============================================================================
   * MÉTODO: handleMentalHealthQuery
   * ============================================================================
   * ¿Qué preguntas responde?
   *   Es el método principal de entrada (dispatcher). Detecta si la consulta
   *   del usuario es de salud mental y la redirige al handler especializado
   *   correspondiente.
   *
   *   Detecta estos tipos de consulta:
   *   - Salud mental general (depresión, ansiedad, trastorno, etc.)
   *   - Perfil/factor de riesgo
   *   - Ciclo de vida (niños, adolescentes, adultos, mayores)
   *   - Listado de enfermedades / catálogo
   *   - Gráficos (los deja pasar a otro handler)
   *
   * Flujo de derivación (orden de evaluación):
   *   1. handleMentalHealthCapabilitiesQuery  → ayuda/capacidades
   *   2. handleMentalHealthTopDiagnoses       → top general (sin ciclo de vida)
   *   3. handleMentalHealthAgeDistribution    → distribución por edad
   *   4. handleMentalHealthLifeCycleQuery     → por ciclo de vida
   *   5. handleMentalHealthAutocomplete       → búsqueda parcial de diagnósticos
   *   6. handleMentalHealthRiskProfile        → perfil de riesgo
   *   7. handleMentalHealthComparison         → comparativa vs
   *   8. handleMentalHealthStats              → estadísticas de un diagnóstico
   * ============================================================================
   */
  async handleMentalHealthQuery(ctx: Context, text: string): Promise<boolean> {
    const norm = normalizeString(text);

    // ── Si la consulta contiene "grafico", dejar que pase a handleChartQuery ──
    if (
      norm.includes('grafico') ||
      norm.includes('grafica') ||
      norm.includes('graficos') ||
      norm.includes('graficas') ||
      norm.includes('visualizar')
    ) {
      return false;
    }

    // ── Detección de consulta de salud mental ──
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
      norm.includes('catalogo') || // "Catálogo CIE-10"
      norm.includes('diagnosticos') || // "Lista todos los diagnósticos", "diagnósticos más frecuentes"
      (norm.includes('diagnostico') && norm.includes('mental')) ||
      (norm.includes('enfermedade') && norm.includes('mental'));

    // ── Detección de consulta de perfil/factor de riesgo ──
    const isRiskProfileQuery =
      (norm.includes('perfil') && norm.includes('riesgo')) ||
      (norm.includes('factor') && norm.includes('riesgo'));

    // ── Detección de consulta por ciclo de vida ──
    // Solo si la consulta NO menciona "eventos" (que es de salud pública)
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

    // ── Si no es ninguna consulta reconocida, salir ──
    if (!isMentalHealth && !isLifeCycleQuery && !isRiskProfileQuery) {
      return false;
    }

    // ── Detección de perfil de riesgo genérico (sin patología específica) ──
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

    // ── Detección de consulta de listado completo de enfermedades ──
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

    // Listar enfermedades debe ir ANTES de capabilities,
    // porque capabilities mata con "mental"/"salud mental"
    if (isListAllQuery && isMentalHealth) {
      return await this.handleMentalHealthListAll(ctx);
    }

    // ── Detección temprana de diagnóstico explícito ──
    const explicitDiagnosis =
      await this.mentalHealthService.getStatsForDiagnosis(text);

    // ── Cadena de handlers (orden prioritario) ──
    if (await this.handleMentalHealthCapabilitiesQuery(ctx, norm)) return true;
    if (await this.handleMentalHealthTopDiagnoses(ctx, norm)) return true;
    if (await this.handleMentalHealthAgeDistribution(ctx, norm)) return true;
    if (await this.handleMentalHealthLifeCycleQuery(ctx, norm, text))
      return true;
    if (await this.handleMentalHealthAutocomplete(ctx, norm)) return true;
    if (
      await this.handleMentalHealthRiskProfile(
        ctx,
        norm,
        text,
        explicitDiagnosis,
      )
    )
      return true;
    if (await this.handleMentalHealthComparison(ctx, norm, text)) return true;
    if (await this.handleMentalHealthStats(ctx, text)) return true;

    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  HANDLERS ESPECIALIZADOS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthCapabilitiesQuery
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "¿Qué información tienes sobre salud mental?"
   *   - "¿Qué sabes de salud mental?"
   *   - "¿Qué puedes hacer en salud mental?"
   *   - "Ayuda salud mental"
   *   - "¿Cuáles preguntas puedo hacer sobre salud mental?"
   *   - "Capacidades salud mental"
   *
   * Comportamiento: Muestra el mensaje de getAvailableQuestions() con la
   * lista completa de capacidades y ejemplos.
   * ============================================================================
   */
  async handleMentalHealthCapabilitiesQuery(
    ctx: Context,
    norm: string,
  ): Promise<boolean> {
    const isHelpQuery =
      norm.includes('que informacion') ||
      norm.includes('que información') ||
      norm.includes('que sabes') ||
      norm.includes('que puedes') ||
      norm.includes('ayuda') ||
      norm.includes('cuales preguntas') ||
      norm.includes('capacidades');

    if (
      isHelpQuery &&
      (norm.includes('salud mental') || norm.includes('mental'))
    ) {
      await ctx.reply(this.getAvailableQuestions(), {
        parse_mode: 'Markdown',
      });
      return true;
    }
    return false;
  }

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthTopDiagnoses
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "¿Cuáles son los diagnósticos más frecuentes?"
   *   - "Top diagnósticos de salud mental"
   *   - "Diagnósticos más comunes"
   *
   * NOTA: NO responde si la consulta menciona un ciclo de vida
   * (niños, adolescentes, adultos, mayores). Esas se derivan a
   * handleMentalHealthLifeCycleQuery.
   *
   * Comportamiento: Obtiene los 5 diagnósticos con mayor total de casos
   * a nivel global y los muestra numerados.
   * ============================================================================
   */
  async handleMentalHealthTopDiagnoses(
    ctx: Context,
    norm: string,
  ): Promise<boolean> {
    // Si la consulta menciona un ciclo de vida, dejar pasar al handler
    // especializado handleMentalHealthLifeCycleQuery
    const hasLifeCycle =
      norm.includes('ninos') ||
      norm.includes('nino') ||
      norm.includes('adolescente') ||
      norm.includes('jovenes') ||
      norm.includes('joven') ||
      norm.includes('adultos') ||
      norm.includes('adulto') ||
      norm.includes('mayores') ||
      norm.includes('mayor');

    if (
      !hasLifeCycle &&
      (norm.includes('frecuente') ||
        norm.includes('top') ||
        norm.includes('mas comunes'))
    ) {
      const top = await this.mentalHealthService.getTopDiagnoses(5);
      const lines = top.map(
        (d: MentalHealthEvent, i: number) =>
          `${i + 1}. **${d.diagnostico_ingreso}**: ${d.total} casos`,
      );
      await ctx.reply(
        `🧠 **Top diagnósticos de salud mental:**\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }
    return false;
  }

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthAgeDistribution
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "¿Cómo es la distribución de edades en salud mental?"
   *   - "Distribución por edad"
   *
   * Comportamiento: Muestra el total de casos acumulados en cada rango
   * etario (menor a 1 año, 1-4, 5-9, 10-14, 15-19, 20-49, 50-64, 65+)
   * y el total global.
   * ============================================================================
   */
  async handleMentalHealthAgeDistribution(
    ctx: Context,
    norm: string,
  ): Promise<boolean> {
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
        `📊 **Distribución por edad en salud mental:**\n\n${lines.join(
          '\n',
        )}\n\n📈 Total: ${dist.total_global} casos`,
        { parse_mode: 'Markdown' },
      );
      return true;
    }
    return false;
  }

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthLifeCycleQuery
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "Diagnósticos más frecuentes en niños"
   *   - "Diagnósticos más comunes en adolescentes"
   *   - "Diagnósticos frecuentes en jóvenes"
   *   - "Diagnósticos frecuentes en adultos"
   *   - "Diagnósticos en mayores"
   *   - Cualquier variante que combine {niños|adolescentes|jóvenes|adultos|mayores}
   *     con {diagnóstico|frecuente|comunes}
   *
   * NOTA: No responde si la consulta menciona "eventos" (es de salud pública).
   *
   * Comportamiento: Detecta el ciclo de vida mediante CYCLE_KEYWORDS,
   * consulta getTopByLifeCycle(cycle, 3) que suma los rangos de edad
   * correspondientes y devuelve el top 3 de diagnósticos para ese ciclo.
   *
   * Mapeo de rangos de edad por ciclo:
   *   niños:       menor_a_1 + de_1_a_4 + de_5_a_9
   *   adolescentes: de_10_a_14 + de_15_a_19
   *   jóvenes:     de_15_a_19 + de_20_a_49
   *   adultos:     de_20_a_49 + de_50_a_64
   *   mayores:     _65_y_mas
   * ============================================================================
   */
  async handleMentalHealthLifeCycleQuery(
    ctx: Context,
    norm: string,
    text: string,
  ): Promise<boolean> {
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
            (d: MentalHealthEventWithTotal) =>
              `- **${d.diagnostico_ingreso}**: ${d.total_en_ciclo} casos`,
          );
          await ctx.reply(
            `🧠 **Diagnósticos más frecuentes en ${cycle}:**\n\n${lines.join(
              '\n',
            )}`,
            { parse_mode: 'Markdown' },
          );
          return true;
        }
      }
    }
    return false;
  }

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthAutocomplete
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "Busca diagnósticos que contengan 'dep'"
   *   - "Busca diagnósticos con 'ansiedad'"
   *   - "Diagnósticos que contengan 'esquizo'"
   *   - Cualquier frase que incluya "busca" + "diagnosticos" + "contengan"
   *
   * Comportamiento: Extrae el término de búsqueda (lo que está entre
   * comillas simples o después de "contengan"), consulta
   * mentalHealthService.searchDiagnoses(termino) que hace una búsqueda
   * parcial en todos los diagnósticos, y muestra los resultados
   * numerados con su total de casos.
   * ============================================================================
   */
  async handleMentalHealthAutocomplete(
    ctx: Context,
    norm: string,
  ): Promise<boolean> {
    // Detectar patrón: "busca diagnósticos que contengan 'X'"
    // o "busca diagnosticos con X"
    const isAutocompleteQuery =
      norm.includes('busca') &&
      norm.includes('diagnostico') &&
      (norm.includes('contengan') || norm.includes('con '));

    if (!isAutocompleteQuery) return false;

    // Extraer el término de búsqueda
    let searchTerm = '';

    // Intentar extraer texto entre comillas simples: 'dep'
    const singleQuoteMatch = norm.match(/'([^']+)'/);
    if (singleQuoteMatch) {
      searchTerm = singleQuoteMatch[1].trim();
    }

    // Si no hay comillas, extraer después de "contengan" o "con"
    if (!searchTerm) {
      const afterContengan = norm.split('contengan').pop()?.trim();
      if (afterContengan) {
        searchTerm = afterContengan;
      } else {
        const afterCon = norm.split('con ').pop()?.trim();
        if (afterCon && afterCon.length < 30) {
          searchTerm = afterCon;
        }
      }
    }

    if (!searchTerm || searchTerm.length < 2) return false;

    const results =
      await this.mentalHealthService.searchDiagnoses(searchTerm);

    if (results.length === 0) {
      await ctx.reply(
        `🔎 No encontré ningún diagnóstico que contenga "${searchTerm}" en mis registros de salud mental.`,
      );
      return true;
    }

    const lines = results.map(
      (d, i) =>
        `${i + 1}. **${d.diagnostico_ingreso}** (${d.codigo_dx_ingreso}) — ${d.total} casos`,
    );

    await ctx.reply(
      `🔎 **Diagnósticos que contienen "${searchTerm}":**\n\n${lines.join(
        '\n',
      )}`,
      { parse_mode: 'Markdown' },
    );
    return true;
  }

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthRiskProfile
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "Perfil de riesgo de depresión"
   *   - "Factor de riesgo de esquizofrenia"
   *   - "¿Cuál es el perfil de riesgo de ansiedad?"
   *   - "Riesgo de trastorno bipolar"
   *
   * Comportamiento: Extrae el nombre del diagnóstico de la consulta,
   * consulta getRiskProfileByDiagnosis() que devuelve la distribución
   * del diagnóstico por ciclo de vida (niños, adolescentes, jóvenes,
   * adultos, mayores) y muestra el total de casos.
   * ============================================================================
   */
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

      const profile =
        await this.mentalHealthService.getRiskProfileByDiagnosis(diagName);
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

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthComparison
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "Compara depresión vs ansiedad"
   *   - "Compara trastorno bipolar vs depresión"
   *   - Cualquier frase con "compara" y " vs "
   *
   * Comportamiento: Divide la consulta por " vs ", extrae los dos
   * nombres de diagnóstico, consulta getComparisonBetweenDiagnoses()
   * y muestra el total de casos de cada uno.
   * ============================================================================
   */
  async handleMentalHealthComparison(
    ctx: Context,
    norm: string,
    text: string,
  ): Promise<boolean> {
    if (norm.includes('compara') && norm.includes(' vs ')) {
      const parts = text.split(/\s+vs\s+/i);
      if (parts.length === 2) {
        const d1Name = parts[0].replace(/compara\s*/i, '').trim();
        const d2Name = parts[1].trim();
        const comp =
          await this.mentalHealthService.getComparisonBetweenDiagnoses(
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

  /**
   * ============================================================================
   * HANDLER: handleMentalHealthStats
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "¿Cuántos casos hay de depresión?"
   *   - "¿Cuántos casos de ansiedad?"
   *   - "Casos de trastorno afectivo bipolar"
   *   - Cualquier frase que contenga un nombre de diagnóstico después
   *     de "casos de" o "casos hay de"
   *
   * Comportamiento: Limpia la consulta eliminando "cuantos casos hay de",
   * "casos de", signos de interrogación, y busca el diagnóstico resultante
   * con getStatsForDiagnosis(). Muestra nombre, total, código CIE-10 y año.
   * ============================================================================
   */
  async handleMentalHealthStats(ctx: Context, text: string): Promise<boolean> {
    const cleanSearch = text
      .replace(/cuantos? casos hay de?/i, '')
      .replace(/casos de?/i, '')
      .replace(/\?/g, '')
      .trim();

    if (cleanSearch.length > 3) {
      const stats = await this.mentalHealthService.getStatsForDiagnosis(
        cleanSearch,
      );
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
   * ============================================================================
   * HANDLER: handleMentalHealthListAll
   * ============================================================================
   * ¿Qué preguntas responde?
   *   - "Lista todos los diagnósticos de salud mental"
   *   - "Catálogo CIE-10"
   *   - "Listado de enfermedades mentales"
   *   - "¿De qué enfermedades mentales tienes información?"
   *   - "Lista todas las enfermedades"
   *   - "Listar diagnósticos"
   *   - "Todas las enfermedades mentales"
   *
   * Comportamiento: Obtiene todos los diagnósticos con getAllDiagnoses(),
   * los agrupa por letra inicial, y los envía en chunks de máximo 3000
   * caracteres para respetar el límite de Telegram. Muestra el total
   * de diagnósticos disponibles.
   * ============================================================================
   */
  async handleMentalHealthListAll(ctx: Context): Promise<boolean> {
    const diagnoses = await this.mentalHealthService.getAllDiagnoses();
    if (diagnoses.length === 0) {
      await ctx.reply(
        'No encontré registros de diagnósticos de salud mental en mi base de datos.',
      );
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

    // Limpiar líneas demasiado largas o con caracteres inválidos
    const sanitized = lines.map((l) =>
      l.replace(/[^\x00-\x7F]/g, '').substring(0, 200),
    );

    const footer = `\n¿Sobre cuál de estos diagnósticos te gustaría consultar?`;

    // Enviar intro
    await ctx.reply(intro, { parse_mode: 'Markdown' });

    // Enviar chunks del listado
    let chunk = '';
    const CHUNK_MAX = 3000;
    for (const line of sanitized) {
      if (line.length + 2 > CHUNK_MAX) {
        if (chunk.trim()) {
          await ctx.reply(chunk, { parse_mode: 'Markdown' });
          chunk = '';
        }
        await ctx.reply(line.substring(0, CHUNK_MAX - 2), {
          parse_mode: 'Markdown',
        });
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

    await ctx.reply(footer, { parse_mode: 'Markdown' });

    return true;
  }
}
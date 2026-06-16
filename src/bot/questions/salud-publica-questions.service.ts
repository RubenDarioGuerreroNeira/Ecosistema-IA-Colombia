import { Injectable } from '@nestjs/common';
import { SaludPublicaService } from '../public-health/salud-publica.service';
import { normalizeString } from '../../shared/health-utils';

import { CaliHealthService } from '../cali/cali-health.service';
import { BoyacaHealthService } from '../boyaca/boyaca-health.service';
import { YopalHealthService } from '../yopal/yopal-health.service';
import { AntioquiaHealthService } from '../antioquia/antioquia-health.service';

export interface ServiceQueryResult {
  handled: boolean;
  response?: string;
  needsLocation?: boolean;
  intent?: string;
}

@Injectable()
export class SaludPublicaQuestionsService {
  constructor(
    private readonly saludPublicaService: SaludPublicaService,
    private readonly caliHealthService: CaliHealthService,
    private readonly boyacaHealthService: BoyacaHealthService,
    private readonly yopalHealthService: YopalHealthService,
    private readonly antioquiaHealthService: AntioquiaHealthService,
  ) { }

  // ============================================================
  // LISTADO DE PREGUNTAS DISPONIBLES
  // ============================================================
  getAvailableQuestions(): string {
    return `💊 **Preguntas que puedo responder sobre Datos de Salud Pública:**

📊 **Generales:**
• "Puedes mostrarme el ranking de eventos de salud en colombia"
• "Dame un resumen de salud pública"
• "¿Qué enfermedad es más rural?" / "¿Cuál es la más urbana?"
• "Comparar dengue vs zika"
• "Proporción global por sexo"
• "Eventos con mayor brecha de género"
• "¿Qué evento es el más urbano en Colombia?"
  "¿Cual es el evento más rural en Colombia?" 
• "Top 5 eventos más urbanos" (muestra la gráfica de barras)
• "¿Cuales son los eventos más rurales?" (muestra los 5 eventos de salud con mayor proporción rural)
• "¿Cuales son los eventos más urbanos?" (muestra los 5 eventos de salud con mayor proporción urbana)

👥 **Por grupo etario:**
• "Eventos más comunes en niños"
• "Eventos más frecuentes en adultos mayores"
• "¿Qué eventos afectan más a los adolescentes?" (ranking)

📂 **Por categoría:**
• "Eventos infecciosos más comunes"
• "Eventos maternos frecuentes"
• "Eventos de salud que más afectan a las mujeres" 
• "Eventos más reportados"  *** VOY AQUI***
• "¿cual es el evento mas rural en Colombia?" 

🔍 **Consulta específica:**
• "¿Qué me dices del dengue?" (resumen detallado)

¿Sobre qué tema te gustaría consultar?`;
  }

  // Moved from ProviderQuestionsService
  getAvailableProviderQuestions(): string {
    return `🏥 **Búsqueda de Prestadores y Servicios de Salud**

Puedo ayudarte a buscar hospitales, clínicas, EPS y centros de salud en varias regiones de Colombia.

📍 **Regiones disponibles:**
• **Cali / Valle del Cauca**
• **Boyacá** (todos los municipios)
• **Antioquia** (incluyendo Medellín)
• **Yopal** (Casanare)

💡 **Ejemplos:**
• *"¿Dónde queda el Hospital Primitivo Iglesias en Cali?"*
• *"Hospitales en Tunja"*
• *"Lista de municipios de Boyacá con centros de salud"*
• *"¿Cuántos hospitales hay en Antioquia?"*
• *"Buscar CAPRESOCA en Yopal"*

¿Qué servicio de salud necesitas encontrar?`;
  }

  // ============================================================
  // PROCESADOR PRINCIPAL (intenciones ampliadas)
  // ============================================================
  async processPublicHealthQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    // Consulta de capacidades
    if (
      norm.includes('que info') ||
      norm.includes('que sabes') ||
      norm.includes('que informacion') ||
      norm.includes('que preguntas') ||
      norm.includes('que datos') ||
      norm.includes('que consultas') ||
      norm.includes('que me puedes') ||
      (norm.includes('salud publica') && norm.includes('info')) ||
      (norm.includes('salud publica') && norm.includes('informacion'))
    ) {
      return this.getAvailableQuestions();
    }

    // === NUEVA SECCIÓN: Top eventos (DEBE ir DESPUÉS de los filtros específicos) ===
    if (
      norm.includes('top eventos') ||
      norm.includes('eventos mas reportados') ||
      (norm.includes('eventos mas frecuentes') && !norm.includes('ninos') && !norm.includes('adolescentes') && !norm.includes('adultos') && !norm.includes('mayores')) ||
      norm.includes('eventos con mas casos') ||
      norm.includes('puedes mostrarme el ranking de eventos de salud en colombia') ||
      norm.includes('ranking de eventos')
    ) {
      return this.handleTopEvents(7);
    }
    // Resumen general
    if (norm.includes('resumen') || norm.includes('estadisticas generales') || (norm.includes('panorama') && norm.includes('general'))) {
      return this.handleGeneralSummary();
    }
    // === RANKING de eventos más rurales (DEBE ir ANTES que el singular) ===
    if (
      (norm.includes('top') && norm.includes('rural')) ||
      norm.includes('eventos mas rurales') ||
      norm.includes('los mas rurales') ||
      norm.includes('cuales son los eventos mas rurales') ||
      norm.includes('ranking de eventos rurales')
    ) {
      return this.handleTopRuralEvents(5);
    }

    // === RANKING de eventos más urbanos (DEBE ir ANTES que el singular) ===
    if (
      norm.includes('eventos mas urbanos') ||
      norm.includes('los mas urbanos') ||
      norm.includes('cuales son los eventos mas urbanos') ||
      norm.includes('ranking de eventos urbanos')
    ) {
      return this.handleTopUrbanEvents(5);
    }


    // Evento más rural (único) - solo para consultas SINGULARES
    if (
      norm.includes('cual es el evento mas rural') ||
      norm.includes('enfermedad mas rural') ||
      norm.includes('mayor concentracion rural') ||
      (norm.includes('mas rural') && !norm.includes('eventos') && !norm.includes('los') && !norm.includes('top'))
    ) {
      return this.handleRuralEvent();
    }

    // Evento más urbano (único) - solo para consultas SINGULARES
    if (
      norm.includes('cual es el evento mas urbano') ||
      norm.includes('enfermedad mas urbana') ||
      norm.includes('mayor concentracion urbano') ||
      (norm.includes('mas urbano') && !norm.includes('eventos') && !norm.includes('los') && !norm.includes('top'))
    ) {
      return this.handleUrbanEvent();
    }

    // Comparación entre eventos
    if (norm.includes('compara') || norm.includes(' vs ')) {
      return this.handleComparison(text);
    }

    // Proporción global por sexo
    if (norm.includes('proporcion') && norm.includes('sexo')) {
      return this.handleGenderProportion();
    }

    // Brecha de género
    if (norm.includes('brecha') && norm.includes('genero')) {
      return this.handleGenderGap();
    }

    // Eventos que más afecta a las mujeres
    if (norm.includes('eventos que mas afectan a las mujeres') || (norm.includes('eventos') && norm.includes('afectan') && norm.includes('mujeres'))) {
      return this.handleTopEventosMujeres()
    }

    // Eventos por ciclo de vida Niños (ranking)
    if (norm.includes('eventos mas frecuentes en ninos') || norm.includes('nino') || norm.includes('ninos')) {
      return this.handleEventosFreqNiños(text);
    }

    // === RANKING de eventos de salud Adoslescentes 
    if (norm.includes('eventos mas frecuentes en adolescentes') || norm.includes('adolescente') || norm.includes('adolescentes')) {
      return this.handleEventosFreqAdolescentes(text);
    }

    // Eventos por ciclo de vida Adultos Mayores
    if (norm.includes('adultos') || norm.includes('adulto') ||
      norm.includes('adultos mayores') || norm.includes('adulto mayor') || norm.includes('ancianos')) {
      return this.handleRankingAdultosMayores(text);
    }

    // Top eventos por categoría
    if (norm.includes('categoria') || norm.includes('infecciosos') || norm.includes('mental') ||
      norm.includes('materno') || norm.includes('violencia')) {
      return this.handleTopByCategory(text);
    }

    // Listar categorías disponibles
    if (norm.includes('categorias') && (norm.includes('que') || norm.includes('cuales'))) {
      return this.handleListCategories();
    }

    // Resumen detallado de un evento específico
    if (norm.match(/(?:que me dices del|informacion de|detalles de|resumen de)\s+([a-z\s]+)/i)) {
      return this.handleEventDetails(text);
    }
    return null;
  }


  // CASOS QUE MAS AFECTAN A LOS ADULTOS MAYORES (ranking)
  private async handleRankingAdultosMayores(text: string): Promise<string> {
    const allEvents = await this.saludPublicaService.listarEventosCompletos();
    const eventsWithGroup = allEvents.map(e => ({
      nombre: e.nombre_del_evento,
      casosEnGrupo: e.adulto_mayor as number,
      totalCasos: e.total_de_eventos,
    }))
      .filter(e => e.casosEnGrupo > 0)
      .sort((a, b) => b.casosEnGrupo - a.casosEnGrupo)
      .slice(0, 5);

    if (eventsWithGroup.length === 0) {
      return 'No se encontraron datos de eventos para el grupo de adultos mayores.';
    }

    const topList = eventsWithGroup.map((e, idx) => {
      const pct = e.totalCasos > 0 ? ((e.casosEnGrupo / e.totalCasos) * 100).toFixed(1) : 0;
      return `${idx + 1}. **${e.nombre}**: ${e.casosEnGrupo.toLocaleString()} casos (${pct}% del total de ese evento)`;
    }).join('\n');
    return `👴 **Eventos más frecuentes en Adultos Mayores (Top 5):**
    ${topList}
    ℹ️ *Se muestran los eventos con mayor número absoluto de casos en este grupo etario.*`;
  }



  // top 5 eventos
  private async handleTopEvents(n: number = 5): Promise<string> {
    const eventos = await this.saludPublicaService.topEventos(n);
    if (eventos.length === 0) return 'No se encontraron eventos.';

    const list = eventos.map((e, i) => {
      const pctTotal = (e.total_de_eventos / eventos.reduce((sum, ev) => sum + ev.total_de_eventos, 0)) * 100;
      return `${i + 1}. **${e.nombre_del_evento}**: ${e.total_de_eventos.toLocaleString()} casos (${pctTotal.toFixed(1)}% del top ${n})`;
    }).join('\n');

    return `🏆 **Top ${n} eventos más reportados en salud pública (Colombia):**

    ${list}
    ℹ️ *Datos consolidados de SIVIGILA.*`;
  }

  // EVENTOS DE SALUD QUE MAS AFECTAN A A LAS MUJERES 
  private async handleTopEventosMujeres(): Promise<string> {
    const eventos = await this.saludPublicaService.eventosMasAfectanMujeres(5);
    if (eventos.length === 0) return 'No se encontraron eventos que afecten más a las mujeres.';
    const list = eventos.map((e, i) => {
      const pctFem = e.total_de_eventos ? ((e.femenino / e.total_de_eventos) * 100).toFixed(1) : 0;
      //const pctMasc = e.total_de_eventos ? ((e.masculino / e.total_de_eventos) * 100).toFixed(1) : 0;
      return `${i + 1}. **${e.nombre_del_evento}**: ${e.femenino.toLocaleString()} casos `;
    }).join('\n');
    return `👩‍👩‍👧‍👧 **Top 
5 eventos que más afectan a las mujeres:**
${list}
ℹ️ *Ordenados por número absoluto de casos de salud que más afectan a nuestras mujeres colombianas*`;
  }



  // MAYORES CASOS 
  private async handleGeneralSummary(): Promise<string> {
    const resumen = await this.saludPublicaService.obtenerResumenGeneral();
    const top = resumen.topEventos
      .map((e, i) => `${i + 1}. **${e.nombre_del_evento}**: ${e.total_de_eventos.toLocaleString()} casos (${((e.total_de_eventos / resumen.totalCasos) * 100).toFixed(1)}% del total)`)
      .join('\n');

    const porCategoria = resumen.casosCategoria
      .map(c => `- **${c.categoria}**: ${c.casos.toLocaleString()} casos (${((c.casos / resumen.totalCasos) * 100).toFixed(1)}%)`)
      .join('\n');

    return `📊 **Resumen de Salud Pública (Colombia)**

📈 **Total de casos acumulados:** ${resumen.totalCasos.toLocaleString()}
✅ **Eventos registrados:** ${resumen.totalEventos}
📭 **Eventos con cero casos:** ${resumen.eventosConCeroCasos}

🏆 **Top 3 eventos con más casos:**
${top}

📂 **Casos por categoría:**
${porCategoria}

ℹ️ *Datos consolidados de SIVIGILA (2026)*`;
  }


  // EVENTOS CON MAYOR CONCENTRACION RURAL
  private async handleRuralEvent(): Promise<string> {
    const evento = await this.saludPublicaService.eventoMasRural();
    if (!evento) return 'No se encontraron datos.';
    const pctRural = ((evento.rural / evento.total_de_eventos) * 100).toFixed(1);
    const pctUrbano = ((evento.urbano / evento.total_de_eventos) * 100).toFixed(1);
    return `🌾 **Evento con mayor concentración rural:**

**${evento.nombre_del_evento}**
- Casos rurales: ${evento.rural.toLocaleString()} (${pctRural}%)
- Casos urbanos: ${evento.urbano.toLocaleString()} (${pctUrbano}%)
- Total de casos: ${evento.total_de_eventos.toLocaleString()}

📌 *Este evento tiene la proporción más alta de casos en zona rural.*`;
  }


  // EVENTO CON MAYOR CONCENTRACION URBANA
  private async handleUrbanEvent(): Promise<string> {
    const evento = await this.saludPublicaService.eventoMasUrbano();
    if (!evento) return 'No se encontraron datos.';
    const pctUrbano = ((evento.urbano / evento.total_de_eventos) * 100).toFixed(1);
    const pctRural = ((evento.rural / evento.total_de_eventos) * 100).toFixed(1);
    return `🏙️ **Evento con mayor concentración urbana:**

**${evento.nombre_del_evento}**
- Casos urbanos: ${evento.urbano.toLocaleString()} (${pctUrbano}%)
- Casos rurales: ${evento.rural.toLocaleString()} (${pctRural}%)
- Total de casos: ${evento.total_de_eventos.toLocaleString()}

📌 *Este evento tiene la proporción más alta de casos en zona urbana.*`;
  }

  private async handleComparison(text: string): Promise<string | null> {
    const parts = text.split(/compara| vs /i).filter(p => p.trim().length > 0);
    if (parts.length < 2) return "Para comparar, usa el formato: 'Compara dengue vs zika'";

    const comp = await this.saludPublicaService.compararEventos(parts[0].trim(), parts[1].trim());
    if (!comp.eventoA || !comp.eventoB) return "No pude encontrar uno de los eventos.";

    const casosA = comp.eventoA.total_de_eventos;
    const casosB = comp.eventoB.total_de_eventos;
    const diff = Math.abs(casosA - casosB);
    const mayor = casosA > casosB ? comp.eventoA : comp.eventoB;
    const menor = casosA > casosB ? comp.eventoB : comp.eventoA;
    const pctDiff = ((diff / mayor.total_de_eventos) * 100).toFixed(1);

    return `⚖️ **Comparativa de Salud Pública:**

🔹 **${comp.eventoA.nombre_del_evento}**: ${casosA.toLocaleString()} casos
🔸 **${comp.eventoB.nombre_del_evento}**: ${casosB.toLocaleString()} casos

📊 **${mayor.nombre_del_evento}** tiene **${diff.toLocaleString()}** casos más que **${menor.nombre_del_evento}** (un ${pctDiff}% más).

ℹ️ *Diferencia absoluta y relativa calculada sobre el evento con mayor incidencia.*`;
  }



  // PROPORCION POR GENEROS 
  private async handleGenderProportion(): Promise<string> {
    const prop = await this.saludPublicaService.proporcionSexoGlobal();
    return `👥 **Distribución Global por Sexo en Salud Pública**

👩 **Mujeres:** ${prop.pctFem.toFixed(1)}% (${prop.femenino.toLocaleString()} casos)
👨 **Hombres:** ${prop.pctMasc.toFixed(1)}% (${prop.masculino.toLocaleString()} casos)

📊 **Total de casos considerados:** ${prop.total.toLocaleString()}

ℹ️ *Estos porcentajes corresponden a la suma de todos los eventos de salud pública registrados.*`;
  }

  private async handleGenderGap(): Promise<string> {
    const eventos = await this.saludPublicaService.eventosMayorBrechaSexo(5);
    if (eventos.length === 0) return 'No se encontraron eventos con brecha de género significativa.';

    const list = eventos.map(e => {
      const diff = Math.abs(e.femenino - e.masculino);
      const totalSexo = e.femenino + e.masculino;
      const pctFem = totalSexo ? ((e.femenino / totalSexo) * 100).toFixed(1) : 0;
      const pctMasc = totalSexo ? ((e.masculino / totalSexo) * 100).toFixed(1) : 0;
      return `- **${e.nombre_del_evento}**: 🟢 Mujeres ${e.femenino.toLocaleString()} (${pctFem}%) | 🔵 Hombres ${e.masculino.toLocaleString()} (${pctMasc}%) → Brecha absoluta: ${diff.toLocaleString()}`;
    }).join('\n');

    return `⚖️ **Eventos con mayor brecha de género (Top 5):**

${list}

ℹ️ *La brecha se calcula como la diferencia absoluta entre casos femeninos y masculinos.*`;
  }


  // Eventos frecuenetes en Niños (ranking)
  private async handleEventosFreqNiños(text: string): Promise<string> {
    const norm = normalizeString(text);
    let grupo: keyof Pick<any, 'infancia' | 'niños' | 'primera_infancia'> = 'infancia';
    let label = 'Niños (5-9 años)';

    if (norm.includes('niños') || norm.includes('niño') || norm.includes('primera infancia')) {
      grupo = 'infancia';
      label = 'Niños (5-9 años)';
    }

    const allEvents = await this.saludPublicaService.listarEventosCompletos();
    const eventsWithGroup = allEvents
      .map(e => ({
        nombre: e.nombre_del_evento,
        casosEnGrupo: e[grupo] as number,
        totalCasos: e.total_de_eventos,
      }))
      .filter(e => e.casosEnGrupo > 0)
      .sort((a, b) => b.casosEnGrupo - a.casosEnGrupo)
      .slice(0, 5);

    if (eventsWithGroup.length === 0) {
      return `No se encontraron datos de eventos para el grupo de ${label.toLowerCase()}.`;
    }

    const topList = eventsWithGroup.map((e, idx) => {
      const pct = e.totalCasos > 0 ? ((e.casosEnGrupo / e.totalCasos) * 100).toFixed(1) : 0;
      return `${idx + 1}. **${e.nombre}**: ${e.casosEnGrupo.toLocaleString()} casos (${pct}% del total de ese evento)`;
    }).join('\n');

    return `🧒 **Eventos más frecuentes en ${label} (Top 5):**

${topList}

ℹ️ *Se muestran los eventos con mayor número absoluto de casos en este grupo etario.*`;
  }



  // RANKING DE EVENTOS DE ADOLESCENTES
  private async handleEventosFreqAdolescentes(text: string): Promise<string> {
    const norm = normalizeString(text);
    let grupo: keyof Pick<any, 'adolescencia' | 'adolescentes'> = 'adolescencia';
    let label = 'Adolescentes (10-14 años)';
    if (norm.includes('adolescentes') || norm.includes('adolescente')) {
      grupo = 'adolescencia';
      label = 'Adolescentes (10-14 años)';
    }

    const allEvents = await this.saludPublicaService.listarEventosCompletos();
    const eventsWithGroup = allEvents
      .map(e => ({
        nombre: e.nombre_del_evento,
        casosEnGrupo: e[grupo] as number,
        totalCasos: e.total_de_eventos,
      }))
      .filter(e => e.casosEnGrupo > 0)
      .sort((a, b) => b.casosEnGrupo - a.casosEnGrupo)
      .slice(0, 5);

    if (eventsWithGroup.length === 0) {
      return `No se encontraron datos de eventos para el grupo de ${label.toLowerCase()}.`;
    }

    const topList = eventsWithGroup.map((e, idx) => {
      const pct = e.totalCasos > 0 ? ((e.casosEnGrupo / e.totalCasos) * 100).toFixed(1) : 0;
      return `${idx + 1}. **${e.nombre}**: ${e.casosEnGrupo.toLocaleString()} casos (${pct}% del total de ese evento)`;
    }).join('\n');

    return `🧒 **Eventos más frecuentes en ${label} (Top 5):**

${topList}

ℹ️ *Se muestran los eventos con mayor número absoluto de casos en este grupo etario.*`;
  }




  // ============================================================
  // NUEVOS POR SECTORES
  // ============================================================

  /**
   * Ranking de eventos más rurales (mayor porcentaje rural)
   */
  private async handleTopRuralEvents(n: number = 5): Promise<string> {
    const events = await this.saludPublicaService.listarEventosCompletos();
    const withPct = events
      .filter(e => e.total_de_eventos > 0)
      .map(e => ({
        nombre: e.nombre_del_evento,
        rural: e.rural,
        urbano: e.urbano,
        total: e.total_de_eventos,
        pctRural: (e.rural / e.total_de_eventos) * 100,
      }))
      .sort((a, b) => b.pctRural - a.pctRural)
      .slice(0, n);

    if (withPct.length === 0) return 'No se encontraron eventos rurales.';

    const list = withPct.map((e, i) => {
      return `${i + 1}. **${e.nombre}** - ${e.pctRural.toFixed(1)}% rural (${e.rural.toLocaleString()} casos rurales de ${e.total.toLocaleString()} totales)`;
    }).join('\n');

    return `🌾 **Top ${n} eventos con mayor concentración rural:**

${list}

📌 *Ordenados por porcentaje de casos en zona rural.*`;
  }

  /**
   * Ranking de eventos más urbanos (mayor porcentaje urbano)
   */
  private async handleTopUrbanEvents(n: number = 5): Promise<string> {
    const events = await this.saludPublicaService.listarEventosCompletos();
    const withPct = events
      .filter(e => e.total_de_eventos > 0)
      .map(e => ({
        nombre: e.nombre_del_evento,
        urbano: e.urbano,
        rural: e.rural,
        total: e.total_de_eventos,
        pctUrbano: (e.urbano / e.total_de_eventos) * 100,
      }))
      .sort((a, b) => b.pctUrbano - a.pctUrbano)
      .slice(0, n);

    if (withPct.length === 0) return 'No se encontraron eventos urbanos.';

    const list = withPct.map((e, i) => {
      return `${i + 1}. **${e.nombre}** - ${e.pctUrbano.toFixed(1)}% urbano (${e.urbano.toLocaleString()} casos urbanos de ${e.total.toLocaleString()} totales)`;
    }).join('\n');

    return `🏙️ **Top ${n} eventos con mayor concentración urbana:**

${list}

📌 *Ordenados por porcentaje de casos en zona urbana.*`;
  }

  /**
   * Top eventos por categoría (infecciosos, mental, materno, violencia)
   */
  private async handleTopByCategory(text: string): Promise<string> {
    const norm = normalizeString(text);
    let categoria = '';
    if (norm.includes('infecciosos')) categoria = 'infecciosos';
    else if (norm.includes('mental')) categoria = 'mental';
    else if (norm.includes('materno')) categoria = 'materno';
    else if (norm.includes('violencia')) categoria = 'violencia';
    else return 'Por favor, especifica una categoría: infecciosos, mental, materno o violencia.';

    const eventos = await this.saludPublicaService.eventosPorCategoria(categoria);
    if (eventos.length === 0) return `No se encontraron eventos en la categoría "${categoria}".`;

    const top = eventos
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, 5);

    const list = top.map((e, i) => {
      return `${i + 1}. **${e.nombre_del_evento}**: ${e.total_de_eventos.toLocaleString()} casos`;
    }).join('\n');

    // Mapeo de nombres legibles
    const nombres = { infecciosos: 'Infecciosas', mental: 'Salud Mental', materno: 'Materno-Infantil', violencia: 'Violencia' };
    const titulo = nombres[categoria] || categoria;

    return `🩺 **Top 5 eventos de ${titulo} en Colombia:**

${list}

ℹ️ *Eventos con mayor número de casos reportados.*`;
  }

  /**
   * Listar categorías disponibles
   */
  private async handleListCategories(): Promise<string> {
    return `📂 **Categorías de eventos de salud pública disponibles:**

- **Infecciosos**: Enfermedades transmisibles (dengue, zika, malaria, tuberculosis, etc.)
- **Mental**: Trastornos mentales y consumo de SPA
- **Materno**: Problemas relacionados con embarazo, parto y neonatales
- **Violencia**: Eventos de violencia, accidentes, agresiones

Para ver los más frecuentes de una categoría, pregunta: "Eventos infecciosos más comunes".`;
  }

  /**
   * Resumen detallado de un evento específico (distribución por edad, sexo, zona)
   */
  private async handleEventDetails(text: string): Promise<string | null> {
    const match = text.match(/(?:que me dices del|informacion de|detalles de|resumen de)\s+([a-z\s]+)/i);
    if (!match) return null;
    const nombreEvento = match[1].trim();
    const evento = await this.saludPublicaService.obtenerEventoUnico(nombreEvento);
    if (!evento) return `No encontré información sobre "${nombreEvento}".`;

    // Distribución por edad
    const edad = [
      `👶 0-4 años: ${evento.primera_infancia.toLocaleString()}`,
      `🧒 5-9 años: ${evento.infancia.toLocaleString()}`,
      `🧑 10-14 años: ${evento.adolescencia.toLocaleString()}`,
      `🧑 15-19 años: ${evento.juventud.toLocaleString()}`,
      `👨 20-49 años: ${evento.adulto_j_ven.toLocaleString()}`,
      `👴 50+ años: ${evento.adulto_mayor.toLocaleString()}`,
    ].filter(l => !l.endsWith('0'));

    const pctMujer = evento.total_de_eventos ? ((evento.femenino / evento.total_de_eventos) * 100).toFixed(1) : 0;
    const pctHombre = evento.total_de_eventos ? ((evento.masculino / evento.total_de_eventos) * 100).toFixed(1) : 0;

    return `📋 **Resumen de ${evento.nombre_del_evento}:**

👥 **Total de casos:** ${evento.total_de_eventos.toLocaleString()}

📍 **Distribución geográfica:**
- Urbano: ${evento.urbano.toLocaleString()} (${((evento.urbano / evento.total_de_eventos) * 100).toFixed(1)}%)
- Rural: ${evento.rural.toLocaleString()} (${((evento.rural / evento.total_de_eventos) * 100).toFixed(1)}%)

⚧️ **Por sexo:**
- Mujeres: ${evento.femenino.toLocaleString()} (${pctMujer}%)
- Hombres: ${evento.masculino.toLocaleString()} (${pctHombre}%)

👶 **Por edad:**
${edad.join('\n')}

ℹ️ *Datos nacionales consolidados.*`;
  }

  // ============================================================
  // MÉTODOS PARA BÚSQUEDA DE PRESTADORES (sin cambios)
  // ============================================================
  async processProviderCapabilitiesQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);
    if (
      norm.includes('que info me puedes dar sobre salud publica') ||
      norm.includes('que busquedas de prestadores') ||
      norm.includes('que centros de salud puedo buscar') ||
      norm.includes('que busquedas de salud')
    ) {
      return this.getAvailableQuestions();
    }
    return null;
  }

  isProviderLocationQuery(text: string): boolean {
    const norm = text.toLowerCase();
    return /(?:donde\s+(?:queda|esta|est[áa])|d[oó]nde\s+queda|d[oó]nde\s+est[áa]|ubicaci[oó]n|direcci[oó]n|direccion|ubicado|ubicada|localizaci[oó]n|busca(?:r)?\s.*(?:hospital|cl[ií]nica|eps|centro|sede|prestador|servicio)|(?:hospital(?:es)?|cl[ií]nica[s]?|centro[s]?|sede[s]?|prestador(?:es)?|servicio[s]?|eps)\b|c[oó]digo\s+(?:de\s+)?(?:habilitaci[oó]n|prestador))/.test(norm);
  }

  isNearbyLocationQuery(text: string): boolean {
    const norm = text.toLowerCase();
    return /(?:\bcerca\b|\bcercano\b|\bcercana\b|\bmás cercano\b|\bmas cercano\b|\bm[áa]s cerca\b|\ba mi alrededor\b|\bpr[óo]ximo\b|\bpr[óo]xima\b|\bmi ubicaci[oó]n\b|\bcerca de m[ií]\b)/.test(norm);
  }

  isStructuralQuery(text: string): boolean {
    const norm = normalizeString(text);
    const isCountQuery = /cuantos?\s+(?:hospitales|centros|prestadores)/.test(norm);
    const isListQuery = ((norm.includes('lista') || norm.includes('muestreme') || norm.includes('cuales') || norm.includes('ver')) &&
      (norm.includes('municipios') || norm.includes('pueblos') || norm.includes('ciudades') || norm.includes('prestadores')));
    return isCountQuery || isListQuery;
  }

  async handleStructuralDataQuery(text: string, detectedRegion?: string): Promise<ServiceQueryResult> {
    const norm = normalizeString(text);
    const isCountQuery = /cuantos?\s+(?:hospitales|centros|prestadores)/.test(norm);
    const isListQuery = this.isStructuralQuery(text) && !isCountQuery;

    if (!isCountQuery && !isListQuery) {
      return { handled: false };
    }

    const isBroadSearch = norm.includes('todos') || norm.includes('todo') || norm.includes('complet');
    const involvesProviders = norm.includes('prestador') || norm.includes('hospital') || norm.includes('centro');

    if (isBroadSearch && involvesProviders) {
      return {
        handled: true,
        response: '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").',
      };
    }

    if (!detectedRegion) {
      return {
        handled: true,
        needsLocation: true,
        response: isCountQuery
          ? '📊 ¿De qué **municipio o departamento** deseas saber el conteo de servicios de salud?'
          : '📍 ¿De qué **municipio o departamento** deseas ver la lista de municipios o prestadores?',
        intent: isCountQuery ? 'count_providers' : 'list_structural',
      };
    }

    const region = detectedRegion.toLowerCase();
    if (isCountQuery) {
      if (region.includes('boyac')) {
        const count = this.boyacaHealthService.getHospitalCount();
        return { handled: true, response: `📊 En **Boyacá** he encontrado **${count}** hospitales y centros de salud registrados.` };
      } else if (region.includes('antioquia')) {
        const count = this.antioquiaHealthService.searchProviders('hospital', 1000).length;
        return { handled: true, response: `📊 En **Antioquia** he encontrado aproximadamente **${count}** hospitales registrados.` };
      } else if (region.includes('yopal')) {
        return { handled: true, response: `📊 En **Yopal** tengo registros de diversos prestadores de salud.` };
      }
    }

    if (isListQuery) {
      if (norm.includes('municipio') || norm.includes('pueblo') || norm.includes('ciudad')) {
        let municipios: string[] = [];
        let regionName = '';
        if (region.includes('antioquia')) {
          municipios = this.antioquiaHealthService.getMunicipios();
          regionName = 'Antioquia';
        } else if (region.includes('boyac')) {
          municipios = this.boyacaHealthService.getMunicipios();
          regionName = 'Boyacá';
        }
        if (municipios.length > 0) {
          const list = municipios.slice(0, 50).join(', ');
          const total = municipios.length;
          return {
            handled: true,
            response: `📍 **Municipios disponibles en ${regionName} (${total}):**\n\n${list}${total > 50 ? '... y más.' : ''}\n\n💡 *Tip: Puedes buscar prestadores escribiendo el nombre de cualquiera de estos municipios.*`
          };
        }
      }

      if (norm.includes('prestador')) {
        if (region.includes('boyac')) {
          const summary = this.boyacaHealthService.getKnowledgeSummary();
          return { handled: true, response: `🏢 **Boyacá:** ${summary}\n\n💡 *Tip: Para ver prestadores específicos, busca por nombre de municipio o código.*` };
        }
        if (region.includes('antioquia')) {
          const summary = this.antioquiaHealthService.getKnowledgeSummary();
          return { handled: true, response: `🏢 **Antioquia:** ${summary}` };
        }
      }
    }

    return { handled: false };
  }

  async handleProviderSearchQuery(text: string, detectedRegion?: string): Promise<ServiceQueryResult> {
    if (this.isNearbyLocationQuery(text)) {
      return {
        handled: true,
        needsLocation: true,
        intent: 'provider_search_location',
        response: '📍 por ahora te puedo ayudar a buscar prestadores de servicios de salud en Yopal, en un radio de 5Km cercanos, por favor comparte tu ubicación usando el botón de ubicación de Telegram.'
      };
    }

    const norm = normalizeString(text);
    if (norm.includes('todos') || norm.includes('todo') || norm.includes('complet')) {
      return {
        handled: true,
        response: '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").'
      };
    }

    let searchTerm = text;
    if (detectedRegion) {
      searchTerm = text.replace(new RegExp(detectedRegion, 'gi'), '').trim();
      if (searchTerm.length < 3) searchTerm = text;
    }

    if (!detectedRegion) {
      const allMatches = await this.buscarPrestadores(text, undefined, searchTerm);
      if (allMatches.length > 0) {
        const uniqueMatches = this.aggregateProviderResults(allMatches);
        const response = uniqueMatches.slice(0, 5).map((item) => this.formatProviderResult(item.provider, item.source)).join('\n\n');
        return { handled: true, response: `🔍 He encontrado estos resultados en mi base de datos:\n\n${response}` };
      }
      if (norm.split(' ').length < 3) {
        return {
          handled: true,
          response: '🏢 ¿En qué **municipio o departamento** deseas buscar servicios de salud?',
          intent: 'provider_search'
        };
      }
    }

    const regionStr = detectedRegion?.toLowerCase() || '';
    if (regionStr.includes('cali') || regionStr.includes('valle')) return await this.buscarEnRegion('cali', searchTerm);
    if (regionStr.includes('boyac')) return await this.buscarEnRegion('boyaca', searchTerm);
    if (regionStr.includes('medell')) return await this.buscarEnRegion('medellin', searchTerm);
    if (regionStr.includes('antioquia')) return await this.buscarEnRegion('antioquia', searchTerm);
    if (regionStr.includes('yopal')) return await this.buscarEnRegion('yopal', searchTerm);

    const finalMatches = await this.buscarPrestadores(text, detectedRegion, searchTerm);
    if (finalMatches.length > 0) {
      const uniqueMatches = this.aggregateProviderResults(finalMatches);
      const response = uniqueMatches.slice(0, 5).map(item => this.formatProviderResult(item.provider, item.source)).join('\n\n');
      const regionName = detectedRegion ? ` para **${detectedRegion}**` : '';
      return { handled: true, response: `🔍 Resultados encontrados${regionName}:\n\n${response}` };
    }

    return { handled: false };
  }

  async buscarPrestadores(query: string, region: string | undefined, searchTerm: string): Promise<Array<{ source: string; provider: any }>> {
    const results: Array<{ source: string; provider: any }> = [];

    const caliMatches = this.caliHealthService.findByIdentifier(searchTerm);
    const caliSearchMatches = this.caliHealthService.searchProviders(searchTerm);
    const boyacaMatches = this.boyacaHealthService.findByIdentifier(searchTerm);
    const boyacaSearchMatches = this.boyacaHealthService.searchProviders(searchTerm);
    const antioquiaMatches = this.antioquiaHealthService.searchProviders(searchTerm, 10);
    const yopalMatches = this.yopalHealthService.findByIdentifier?.(searchTerm) || [];
    const yopalSearchMatches = this.yopalHealthService.searchProviders(searchTerm);

    const pushUnique = (service: string, providers: any[], keyFn: (provider: any) => string) => {
      for (const provider of providers) {
        const key = `${service}|${keyFn(provider)}`;
        if (!results.some(item => item.source === service && keyFn(item.provider) === keyFn(provider))) {
          results.push({ source: service, provider });
        }
      }
    };

    if (caliMatches && caliMatches.length > 0) pushUnique('Cali', caliMatches, p => p.sede || p.servicio || p.direccion || '');
    if (caliSearchMatches && caliSearchMatches.length > 0) pushUnique('Cali', caliSearchMatches, p => p.sede || p.servicio || p.direccion || '');
    if (boyacaMatches && boyacaMatches.length > 0) pushUnique('Boyacá', boyacaMatches, p => p.nombre_de_sede || p.razon_social || p.direccion || '');
    if (boyacaSearchMatches && boyacaSearchMatches.length > 0) pushUnique('Boyacá', boyacaSearchMatches, p => p.nombre_de_sede || p.razon_social || p.direccion || '');
    if (antioquiaMatches && antioquiaMatches.length > 0) pushUnique('Antioquia', antioquiaMatches, p => p.nombreprestador || p.nombre_sede || p.nit || '');
    if (yopalMatches && yopalMatches.length > 0) pushUnique('Yopal', yopalMatches, p => p.entidad_2 || p.servicio || p.direccion || '');
    if (yopalSearchMatches && yopalSearchMatches.length > 0) pushUnique('Yopal', yopalSearchMatches, p => p.entidad_2 || p.servicio || p.direccion || '');

    return results;
  }

  formatProviderResult(provider: any, source: string): string {
    const escapeMarkdown = (text: string): string => {
      return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    };
    const cleanEncoding = (text: string | undefined): string => {
      if (!text) return '';
      return text
        .replace(/Ã‘/g, 'Ñ')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã“/g, 'Ó')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã/g, 'Í')
        .replace(/Ã­/g, 'í')
        .replace(/Ã‰/g, 'É')
        .replace(/Ã©/g, 'é')
        .replace(/Ãš/g, 'Ú')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã/g, 'Á')
        .replace(/Ã¡/g, 'á')
        .replace(/Â°/g, '°')
        .replace(/NÂº/g, 'N°');
    };

    const name = (
      provider.sede || provider.nombre_de_sede || provider.nombreprestador || provider.entidad_2 || provider.razon_social || 'Centro de salud'
    ).toString();
    const address = (provider.direccion || provider.direcci_n || 'Dirección no disponible').toString();
    const phone = (provider.telefono || provider.tel_fono || 'Teléfono no disponible').toString();
    const city = provider.ciudad || provider.municipio || provider.departamento || provider.nombre_centro_poblado || '';
    const extra = provider.servicio || provider.grupo || provider.claseprestador || provider.caracter || '';

    let result = `🏥 *${escapeMarkdown(cleanEncoding(name))}*\n`;
    result += `📍 ${escapeMarkdown(cleanEncoding(address))}\n`;
    if (city) result += `📌 ${escapeMarkdown(cleanEncoding(city.toString()))}\n`;
    result += `📞 ${escapeMarkdown(phone)}`;
    if (extra) result += `\nℹ️ ${escapeMarkdown(extra)}`;
    result += `\n*Fuente:* ${escapeMarkdown(source)}`;
    return result;
  }

  aggregateProviderResults(allMatches: Array<{ source: string; provider: any }>): Array<{ source: string; provider: any }> {
    const uniqueMatches = new Map<string, { source: string; provider: any }>();
    for (const item of allMatches) {
      const p = item.provider;
      const key = `${item.source}|${p.sede || p.nombre_de_sede || p.nombreprestador || p.entidad_2 || p.razon_social || p.direccion || ''}`;
      if (!uniqueMatches.has(key)) uniqueMatches.set(key, item);
    }
    return Array.from(uniqueMatches.values());
  }

  async buscarEnRegion(serviceType: 'cali' | 'boyaca' | 'antioquia' | 'medellin' | 'yopal', searchTerm: string): Promise<ServiceQueryResult> {
    let providers: any[] = [];
    let regionName = '';

    switch (serviceType) {
      case 'cali':
        providers = this.caliHealthService.searchProviders(searchTerm);
        regionName = 'Cali';
        break;
      case 'boyaca':
        providers = this.boyacaHealthService.findByIdentifier(searchTerm);
        regionName = 'Boyacá';
        break;
      case 'medellin':
        providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
        regionName = 'Medellín (Antioquia)';
        break;
      case 'antioquia':
        providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
        regionName = 'Antioquia';
        break;
      case 'yopal':
        providers = this.yopalHealthService.searchProviders(searchTerm);
        regionName = 'Yopal';
        break;
    }

    if (providers.length > 0) {
      const response = providers.slice(0, 5).map(p => this.formatProviderResult(p, regionName)).join('\n\n');
      return { handled: true, response: `📍 Resultados encontrados en **${regionName}**:\n\n${response}` };
    }

    return { handled: false, response: `⚠️ No encontré resultados de servicios de salud en **${regionName}**.` };
  }
}



// import { Injectable } from '@nestjs/common';
// import { SaludPublicaService } from '../public-health/salud-publica.service';
// import { normalizeString } from '../../shared/health-utils';

// import { CaliHealthService } from '../cali/cali-health.service';
// import { BoyacaHealthService } from '../boyaca/boyaca-health.service';
// import { YopalHealthService } from '../yopal/yopal-health.service';
// import { AntioquiaHealthService } from '../antioquia/antioquia-health.service';

// export interface ServiceQueryResult {
//   handled: boolean;
//   response?: string;
//   needsLocation?: boolean;
//   intent?: string;
// }

// @Injectable()
// export class SaludPublicaQuestionsService {
//   constructor(
//     private readonly saludPublicaService: SaludPublicaService,
//     private readonly caliHealthService: CaliHealthService,
//     private readonly boyacaHealthService: BoyacaHealthService,
//     private readonly yopalHealthService: YopalHealthService,
//     private readonly antioquiaHealthService: AntioquiaHealthService,
//   ) { }

//   getAvailableQuestions(): string {
//     return `💊 **Preguntas que puedo responder sobre Datos de Salud Pública:**

// Puedo ayudarte a resolver las siguientes consultas:

// • "Dame un resumen de salud pública"
// • "¿Qué enfermedad es más rural o urbana?"
// • "Comparar dengue vs zika"
// • "¿Qué enfermedad afecta más a los adolescentes?"
// • "Proporción global por sexo"
// • "Eventos con mayor brecha de género"
// • "¿Qué eventos son más frecuentes en adultos jóvenes?"

// ¿Sobre qué tema de salud pública te gustaría consultar?`;
//   }

//   // Moved from ProviderQuestionsService
//   getAvailableProviderQuestions(): string {
//     return `🏥 **Búsqueda de Prestadores y Servicios de Salud**

// Puedo ayudarte a buscar hospitales, clínicas, EPS y centros de salud en varias regiones de Colombia.

// 📍 **Regiones disponibles:**
// • **Cali / Valle del Cauca**
// • **Boyacá** (todos los municipios)
// • **Antioquia** (incluyendo Medellín)
// • **Yopal** (Casanare)

// 💡 **Ejemplos:**
// • *"¿Dónde queda el Hospital Primitivo Iglesias en Cali?"*
// • *"Hospitales en Tunja"*
// • *"Lista de municipios de Boyacá con centros de salud"*
// • *"¿Cuántos hospitales hay en Antioquia?"*
// • *"Buscar CAPRESOCA en Yopal"*

// ¿Qué servicio de salud necesitas encontrar?`;
//   }

//   /**
//    * Procesa una consulta de texto y retorna una respuesta formateada.
//    */
//   async processPublicHealthQuery(text: string): Promise<string | null> {
//     const norm = normalizeString(text);

//     if (
//       norm.includes('que info') ||
//       norm.includes('que sabes') ||
//       norm.includes('que informacion') ||
//       norm.includes('que preguntas') ||
//       norm.includes('que datos') ||
//       norm.includes('que consultas') ||
//       norm.includes('que me puedes') ||
//       (norm.includes('salud publica') && norm.includes('info')) ||
//       (norm.includes('salud publica') && norm.includes('informacion'))
//     ) {
//       return this.getAvailableQuestions();
//     }

//     if (norm.includes('resumen') || norm.includes('estadisticas generales')) {
//       return this.handleGeneralSummary();
//     }

//     if (norm.includes('mas rural') || norm.includes('mayor concentracion rural')) {
//       return this.handleRuralEvent();
//     }

//     if (norm.includes('mas urbano') || norm.includes('mayor concentracion urbano')) {
//       return this.handleUrbanEvent();
//     }

//     if (norm.includes('compara') || norm.includes(' vs ')) {
//       return this.handleComparison(text);
//     }

//     if (norm.includes('proporcion') && norm.includes('sexo')) {
//       return this.handleGenderProportion();
//     }

//     if (norm.includes('brecha') && norm.includes('genero')) {
//       return this.handleGenderGap();
//     }

//     if (norm.includes('niños') || norm.includes('adolescentes') || norm.includes('adultos') || norm.includes('mayores')) {
//       return this.handleLifeCycle(text);
//     }

//     return null;
//   }

//   // ============================================================
//   // MÉTODOS MEJORADOS
//   // ============================================================

//   private async handleGeneralSummary(): Promise<string> {
//     const resumen = await this.saludPublicaService.obtenerResumenGeneral();
//     const top = resumen.topEventos
//       .map((e, i) => `${i + 1}. **${e.nombre_del_evento}**: ${e.total_de_eventos.toLocaleString()} casos (${((e.total_de_eventos / resumen.totalCasos) * 100).toFixed(1)}% del total)`)
//       .join('\n');

//     const porCategoria = resumen.casosCategoria
//       .map(c => `- **${c.categoria}**: ${c.casos.toLocaleString()} casos (${((c.casos / resumen.totalCasos) * 100).toFixed(1)}%)`)
//       .join('\n');

//     return `📊 **Resumen de Salud Pública (Colombia)**

// 📈 **Total de casos acumulados:** ${resumen.totalCasos.toLocaleString()}
// ✅ **Eventos registrados:** ${resumen.totalEventos}
// 📭 **Eventos con cero casos:** ${resumen.eventosConCeroCasos}

// 🏆 **Top 3 eventos con más casos:**
// ${top}

// 📂 **Casos por categoría:**
// ${porCategoria}

// ℹ️ *Datos consolidados de SIVIGILA (2026)*`;
//   }

//   private async handleRuralEvent(): Promise<string> {
//     const evento = await this.saludPublicaService.eventoMasRural();
//     if (!evento) return 'No se encontraron datos.';
//     const pctRural = ((evento.rural / evento.total_de_eventos) * 100).toFixed(1);
//     const pctUrbano = ((evento.urbano / evento.total_de_eventos) * 100).toFixed(1);
//     return `🌾 **Evento con mayor concentración rural:**

// **${evento.nombre_del_evento}**
// - Casos rurales: ${evento.rural.toLocaleString()} (${pctRural}%)
// - Casos urbanos: ${evento.urbano.toLocaleString()} (${pctUrbano}%)
// - Total de casos: ${evento.total_de_eventos.toLocaleString()}

// 📌 *Este evento tiene la proporción más alta de casos en zona rural.*`;
//   }

//   private async handleUrbanEvent(): Promise<string> {
//     const evento = await this.saludPublicaService.eventoMasUrbano();
//     if (!evento) return 'No se encontraron datos.';
//     const pctUrbano = ((evento.urbano / evento.total_de_eventos) * 100).toFixed(1);
//     const pctRural = ((evento.rural / evento.total_de_eventos) * 100).toFixed(1);
//     return `🏙️ **Evento con mayor concentración urbana:**

// **${evento.nombre_del_evento}**
// - Casos urbanos: ${evento.urbano.toLocaleString()} (${pctUrbano}%)
// - Casos rurales: ${evento.rural.toLocaleString()} (${pctRural}%)
// - Total de casos: ${evento.total_de_eventos.toLocaleString()}

// 📌 *Este evento tiene la proporción más alta de casos en zona urbana.*`;
//   }

//   private async handleComparison(text: string): Promise<string | null> {
//     const parts = text.split(/compara| vs /i).filter(p => p.trim().length > 0);
//     if (parts.length < 2) return "Para comparar, usa el formato: 'Compara dengue vs zika'";

//     const comp = await this.saludPublicaService.compararEventos(parts[0].trim(), parts[1].trim());
//     if (!comp.eventoA || !comp.eventoB) return "No pude encontrar uno de los eventos.";

//     const casosA = comp.eventoA.total_de_eventos;
//     const casosB = comp.eventoB.total_de_eventos;
//     const diff = Math.abs(casosA - casosB);
//     const mayor = casosA > casosB ? comp.eventoA : comp.eventoB;
//     const menor = casosA > casosB ? comp.eventoB : comp.eventoA;
//     const pctDiff = ((diff / mayor.total_de_eventos) * 100).toFixed(1);

//     return `⚖️ **Comparativa de Salud Pública:**

// 🔹 **${comp.eventoA.nombre_del_evento}**: ${casosA.toLocaleString()} casos
// 🔸 **${comp.eventoB.nombre_del_evento}**: ${casosB.toLocaleString()} casos

// 📊 **${mayor.nombre_del_evento}** tiene **${diff.toLocaleString()}** casos más que **${menor.nombre_del_evento}** (un ${pctDiff}% más).

// ℹ️ *Diferencia absoluta y relativa calculada sobre el evento con mayor incidencia.*`;
//   }

//   private async handleGenderProportion(): Promise<string> {
//     const prop = await this.saludPublicaService.proporcionSexoGlobal();
//     return `👥 **Distribución Global por Sexo en Salud Pública**

// 👩 **Mujeres:** ${prop.pctFem.toFixed(1)}% (${prop.femenino.toLocaleString()} casos)
// 👨 **Hombres:** ${prop.pctMasc.toFixed(1)}% (${prop.masculino.toLocaleString()} casos)

// 📊 **Total de casos considerados:** ${prop.total.toLocaleString()}

// ℹ️ *Estos porcentajes corresponden a la suma de todos los eventos de salud pública registrados.*`;
//   }

//   private async handleGenderGap(): Promise<string> {
//     const eventos = await this.saludPublicaService.eventosMayorBrechaSexo(5);
//     if (eventos.length === 0) return 'No se encontraron eventos con brecha de género significativa.';

//     const list = eventos.map(e => {
//       const diff = Math.abs(e.femenino - e.masculino);
//       const totalSexo = e.femenino + e.masculino;
//       const pctFem = totalSexo ? ((e.femenino / totalSexo) * 100).toFixed(1) : 0;
//       const pctMasc = totalSexo ? ((e.masculino / totalSexo) * 100).toFixed(1) : 0;
//       return `- **${e.nombre_del_evento}**: 🟢 Mujeres ${e.femenino.toLocaleString()} (${pctFem}%) | 🔵 Hombres ${e.masculino.toLocaleString()} (${pctMasc}%) → Brecha absoluta: ${diff.toLocaleString()}`;
//     }).join('\n');

//     return `⚖️ **Eventos con mayor brecha de género (Top 5):**

// ${list}

// ℹ️ *La brecha se calcula como la diferencia absoluta entre casos femeninos y masculinos.*`;
//   }

//   private async handleLifeCycle(text: string): Promise<string> {
//     const norm = normalizeString(text);
//     let grupo: any = 'adulto_j_ven';
//     let label = 'Adultos jóvenes (20-49 años)';
//     let descripcion = 'adultos jóvenes';

//     if (norm.includes('niños') || norm.includes('niño') || norm.includes('primera infancia')) {
//       grupo = 'infancia';
//       label = 'Niños (5-9 años)';
//       descripcion = 'niños';
//     } else if (norm.includes('adolescentes') || norm.includes('adolescente')) {
//       grupo = 'adolescencia';
//       label = 'Adolescentes (10-14 años)';
//       descripcion = 'adolescentes';
//     } else if (norm.includes('jovenes') || norm.includes('joven')) {
//       grupo = 'juventud';
//       label = 'Jóvenes (15-19 años)';
//       descripcion = 'jóvenes';
//     } else if (norm.includes('adultos mayores') || norm.includes('adulto mayor') || norm.includes('ancianos')) {
//       grupo = 'adulto_mayor';
//       label = 'Adultos mayores (50+ años)';
//       descripcion = 'adultos mayores';
//     } else if (norm.includes('adultos') || norm.includes('adulto')) {
//       grupo = 'adulto_j_ven';
//       label = 'Adultos jóvenes (20-49 años)';
//       descripcion = 'adultos jóvenes';
//     }

//     // Obtener top 3 eventos para este grupo etario (en lugar de solo 1)
//     const allEvents = await this.saludPublicaService.listarEventosCompletos();
//     const eventsWithGroup = allEvents
//       .map(e => ({
//         nombre: e.nombre_del_evento,
//         casosEnGrupo: e[grupo] as number,
//         totalCasos: e.total_de_eventos,
//       }))
//       .filter(e => e.casosEnGrupo > 0)
//       .sort((a, b) => b.casosEnGrupo - a.casosEnGrupo)
//       .slice(0, 3);

//     if (eventsWithGroup.length === 0) {
//       return `No se encontraron datos de eventos para el grupo de ${descripcion}.`;
//     }

//     const topList = eventsWithGroup.map((e, idx) => {
//       const pct = e.totalCasos > 0 ? ((e.casosEnGrupo / e.totalCasos) * 100).toFixed(1) : 0;
//       return `${idx + 1}. **${e.nombre}**: ${e.casosEnGrupo.toLocaleString()} casos (${pct}% del total de ese evento)`;
//     }).join('\n');

//     return `🧒 **Eventos más frecuentes en ${label} (Top 3):**

// ${topList}

// ℹ️ *Se muestran los eventos con mayor número absoluto de casos en este grupo etario.*`;
//   }

//   // ============================================================
//   // Métodos para búsqueda de prestadores (sin cambios)
//   // ============================================================

//   async processProviderCapabilitiesQuery(text: string): Promise<string | null> {
//     const norm = normalizeString(text);
//     if (
//       norm.includes('que info me puedes dar sobre salud publica') ||
//       norm.includes('que busquedas de prestadores') ||
//       norm.includes('que centros de salud puedo buscar') ||
//       norm.includes('que busquedas de salud')
//     ) {
//       return this.getAvailableQuestions();
//     }
//     return null;
//   }

//   isProviderLocationQuery(text: string): boolean {
//     const norm = text.toLowerCase();
//     return /(?:donde\s+(?:queda|esta|est[áa])|d[oó]nde\s+queda|d[oó]nde\s+est[áa]|ubicaci[oó]n|direcci[oó]n|direccion|ubicado|ubicada|localizaci[oó]n|busca(?:r)?\s.*(?:hospital|cl[ií]nica|eps|centro|sede|prestador|servicio)|(?:hospital(?:es)?|cl[ií]nica[s]?|centro[s]?|sede[s]?|prestador(?:es)?|servicio[s]?|eps)\b|c[oó]digo\s+(?:de\s+)?(?:habilitaci[oó]n|prestador))/.test(norm);
//   }

//   isNearbyLocationQuery(text: string): boolean {
//     const norm = text.toLowerCase();
//     return /(?:\bcerca\b|\bcercano\b|\bcercana\b|\bmás cercano\b|\bmas cercano\b|\bm[áa]s cerca\b|\ba mi alrededor\b|\bpr[óo]ximo\b|\bpr[óo]xima\b|\bmi ubicaci[oó]n\b|\bcerca de m[ií]\b)/.test(norm);
//   }

//   isStructuralQuery(text: string): boolean {
//     const norm = normalizeString(text);
//     const isCountQuery = /cuantos?\s+(?:hospitales|centros|prestadores)/.test(norm);
//     const isListQuery = ((norm.includes('lista') || norm.includes('muestreme') || norm.includes('cuales') || norm.includes('ver')) &&
//       (norm.includes('municipios') || norm.includes('pueblos') || norm.includes('ciudades') || norm.includes('prestadores')));
//     return isCountQuery || isListQuery;
//   }

//   async handleStructuralDataQuery(text: string, detectedRegion?: string): Promise<ServiceQueryResult> {
//     const norm = normalizeString(text);
//     const isCountQuery = /cuantos?\s+(?:hospitales|centros|prestadores)/.test(norm);
//     const isListQuery = this.isStructuralQuery(text) && !isCountQuery;

//     if (!isCountQuery && !isListQuery) {
//       return { handled: false };
//     }

//     const isBroadSearch = norm.includes('todos') || norm.includes('todo') || norm.includes('complet');
//     const involvesProviders = norm.includes('prestador') || norm.includes('hospital') || norm.includes('centro');

//     if (isBroadSearch && involvesProviders) {
//       return {
//         handled: true,
//         response: '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").',
//       };
//     }

//     if (!detectedRegion) {
//       return {
//         handled: true,
//         needsLocation: true,
//         response: isCountQuery
//           ? '📊 ¿De qué **municipio o departamento** deseas saber el conteo de servicios de salud?'
//           : '📍 ¿De qué **municipio o departamento** deseas ver la lista de municipios o prestadores?',
//         intent: isCountQuery ? 'count_providers' : 'list_structural',
//       };
//     }

//     const region = detectedRegion.toLowerCase();
//     if (isCountQuery) {
//       if (region.includes('boyac')) {
//         const count = this.boyacaHealthService.getHospitalCount();
//         return { handled: true, response: `📊 En **Boyacá** he encontrado **${count}** hospitales y centros de salud registrados.` };
//       } else if (region.includes('antioquia')) {
//         const count = this.antioquiaHealthService.searchProviders('hospital', 1000).length;
//         return { handled: true, response: `📊 En **Antioquia** he encontrado aproximadamente **${count}** hospitales registrados.` };
//       } else if (region.includes('yopal')) {
//         return { handled: true, response: `📊 En **Yopal** tengo registros de diversos prestadores de salud.` };
//       }
//     }

//     if (isListQuery) {
//       if (norm.includes('municipio') || norm.includes('pueblo') || norm.includes('ciudad')) {
//         let municipios: string[] = [];
//         let regionName = '';
//         if (region.includes('antioquia')) {
//           municipios = this.antioquiaHealthService.getMunicipios();
//           regionName = 'Antioquia';
//         } else if (region.includes('boyac')) {
//           municipios = this.boyacaHealthService.getMunicipios();
//           regionName = 'Boyacá';
//         }
//         if (municipios.length > 0) {
//           const list = municipios.slice(0, 50).join(', ');
//           const total = municipios.length;
//           return {
//             handled: true,
//             response: `📍 **Municipios disponibles en ${regionName} (${total}):**\n\n${list}${total > 50 ? '... y más.' : ''}\n\n💡 *Tip: Puedes buscar prestadores escribiendo el nombre de cualquiera de estos municipios.*`
//           };
//         }
//       }

//       if (norm.includes('prestador')) {
//         if (region.includes('boyac')) {
//           const summary = this.boyacaHealthService.getKnowledgeSummary();
//           return { handled: true, response: `🏢 **Boyacá:** ${summary}\n\n💡 *Tip: Para ver prestadores específicos, busca por nombre de municipio o código.*` };
//         }
//         if (region.includes('antioquia')) {
//           const summary = this.antioquiaHealthService.getKnowledgeSummary();
//           return { handled: true, response: `🏢 **Antioquia:** ${summary}` };
//         }
//       }
//     }

//     return { handled: false };
//   }

//   async handleProviderSearchQuery(text: string, detectedRegion?: string): Promise<ServiceQueryResult> {
//     if (this.isNearbyLocationQuery(text)) {
//       return {
//         handled: true,
//         needsLocation: true,
//         intent: 'provider_search_location',
//         response: '📍 por ahora te puedo ayudar a buscar prestadores de servicios de salud en Yopal, en un radio de 5Km cercanos, por favor comparte tu ubicación usando el botón de ubicación de Telegram.'
//       };
//     }

//     const norm = normalizeString(text);
//     if (norm.includes('todos') || norm.includes('todo') || norm.includes('complet')) {
//       return {
//         handled: true,
//         response: '⚠️ Esta información es muy amplia. Por favor, especifica el **nombre**, el **NIT** o el **municipio** del centro de salud para poder ayudarte con una búsqueda precisa (ej: "Hospital en Tunja").'
//       };
//     }

//     let searchTerm = text;
//     if (detectedRegion) {
//       searchTerm = text.replace(new RegExp(detectedRegion, 'gi'), '').trim();
//       if (searchTerm.length < 3) searchTerm = text;
//     }

//     if (!detectedRegion) {
//       const allMatches = await this.buscarPrestadores(text, undefined, searchTerm);
//       if (allMatches.length > 0) {
//         const uniqueMatches = this.aggregateProviderResults(allMatches);
//         const response = uniqueMatches.slice(0, 5).map((item) => this.formatProviderResult(item.provider, item.source)).join('\n\n');
//         return { handled: true, response: `🔍 He encontrado estos resultados en mi base de datos:\n\n${response}` };
//       }
//       if (norm.split(' ').length < 3) {
//         return {
//           handled: true,
//           response: '🏢 ¿En qué **municipio o departamento** deseas buscar servicios de salud?',
//           intent: 'provider_search'
//         };
//       }
//     }

//     const regionStr = detectedRegion?.toLowerCase() || '';
//     if (regionStr.includes('cali') || regionStr.includes('valle')) return await this.buscarEnRegion('cali', searchTerm);
//     if (regionStr.includes('boyac')) return await this.buscarEnRegion('boyaca', searchTerm);
//     if (regionStr.includes('medell')) return await this.buscarEnRegion('medellin', searchTerm);
//     if (regionStr.includes('antioquia')) return await this.buscarEnRegion('antioquia', searchTerm);
//     if (regionStr.includes('yopal')) return await this.buscarEnRegion('yopal', searchTerm);

//     const finalMatches = await this.buscarPrestadores(text, detectedRegion, searchTerm);
//     if (finalMatches.length > 0) {
//       const uniqueMatches = this.aggregateProviderResults(finalMatches);
//       const response = uniqueMatches.slice(0, 5).map(item => this.formatProviderResult(item.provider, item.source)).join('\n\n');
//       const regionName = detectedRegion ? ` para **${detectedRegion}**` : '';
//       return { handled: true, response: `🔍 Resultados encontrados${regionName}:\n\n${response}` };
//     }

//     return { handled: false };
//   }

//   async buscarPrestadores(query: string, region: string | undefined, searchTerm: string): Promise<Array<{ source: string; provider: any }>> {
//     const results: Array<{ source: string; provider: any }> = [];

//     const caliMatches = this.caliHealthService.findByIdentifier(searchTerm);
//     const caliSearchMatches = this.caliHealthService.searchProviders(searchTerm);
//     const boyacaMatches = this.boyacaHealthService.findByIdentifier(searchTerm);
//     const boyacaSearchMatches = this.boyacaHealthService.searchProviders(searchTerm);
//     const antioquiaMatches = this.antioquiaHealthService.searchProviders(searchTerm, 10);
//     const yopalMatches = this.yopalHealthService.findByIdentifier?.(searchTerm) || [];
//     const yopalSearchMatches = this.yopalHealthService.searchProviders(searchTerm);

//     const pushUnique = (service: string, providers: any[], keyFn: (provider: any) => string) => {
//       for (const provider of providers) {
//         const key = `${service}|${keyFn(provider)}`;
//         if (!results.some(item => item.source === service && keyFn(item.provider) === keyFn(provider))) {
//           results.push({ source: service, provider });
//         }
//       }
//     };

//     if (caliMatches && caliMatches.length > 0) pushUnique('Cali', caliMatches, p => p.sede || p.servicio || p.direccion || '');
//     if (caliSearchMatches && caliSearchMatches.length > 0) pushUnique('Cali', caliSearchMatches, p => p.sede || p.servicio || p.direccion || '');
//     if (boyacaMatches && boyacaMatches.length > 0) pushUnique('Boyacá', boyacaMatches, p => p.nombre_de_sede || p.razon_social || p.direccion || '');
//     if (boyacaSearchMatches && boyacaSearchMatches.length > 0) pushUnique('Boyacá', boyacaSearchMatches, p => p.nombre_de_sede || p.razon_social || p.direccion || '');
//     if (antioquiaMatches && antioquiaMatches.length > 0) pushUnique('Antioquia', antioquiaMatches, p => p.nombreprestador || p.nombre_sede || p.nit || '');
//     if (yopalMatches && yopalMatches.length > 0) pushUnique('Yopal', yopalMatches, p => p.entidad_2 || p.servicio || p.direccion || '');
//     if (yopalSearchMatches && yopalSearchMatches.length > 0) pushUnique('Yopal', yopalSearchMatches, p => p.entidad_2 || p.servicio || p.direccion || '');

//     return results;
//   }

//   formatProviderResult(provider: any, source: string): string {
//     const escapeMarkdown = (text: string): string => {
//       return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
//     };
//     const cleanEncoding = (text: string | undefined): string => {
//       if (!text) return '';
//       return text
//         .replace(/Ã‘/g, 'Ñ')
//         .replace(/Ã±/g, 'ñ')
//         .replace(/Ã“/g, 'Ó')
//         .replace(/Ã³/g, 'ó')
//         .replace(/Ã/g, 'Í')
//         .replace(/Ã­/g, 'í')
//         .replace(/Ã‰/g, 'É')
//         .replace(/Ã©/g, 'é')
//         .replace(/Ãš/g, 'Ú')
//         .replace(/Ãº/g, 'ú')
//         .replace(/Ã/g, 'Á')
//         .replace(/Ã¡/g, 'á')
//         .replace(/Â°/g, '°')
//         .replace(/NÂº/g, 'N°');
//     };

//     const name = (
//       provider.sede || provider.nombre_de_sede || provider.nombreprestador || provider.entidad_2 || provider.razon_social || 'Centro de salud'
//     ).toString();
//     const address = (provider.direccion || provider.direcci_n || 'Dirección no disponible').toString();
//     const phone = (provider.telefono || provider.tel_fono || 'Teléfono no disponible').toString();
//     const city = provider.ciudad || provider.municipio || provider.departamento || provider.nombre_centro_poblado || '';
//     const extra = provider.servicio || provider.grupo || provider.claseprestador || provider.caracter || '';

//     let result = `🏥 *${escapeMarkdown(cleanEncoding(name))}*\n`;
//     result += `📍 ${escapeMarkdown(cleanEncoding(address))}\n`;
//     if (city) result += `📌 ${escapeMarkdown(cleanEncoding(city.toString()))}\n`;
//     result += `📞 ${escapeMarkdown(phone)}`;
//     if (extra) result += `\nℹ️ ${escapeMarkdown(extra)}`;
//     result += `\n*Fuente:* ${escapeMarkdown(source)}`;
//     return result;
//   }

//   aggregateProviderResults(allMatches: Array<{ source: string; provider: any }>): Array<{ source: string; provider: any }> {
//     const uniqueMatches = new Map<string, { source: string; provider: any }>();
//     for (const item of allMatches) {
//       const p = item.provider;
//       const key = `${item.source}|${p.sede || p.nombre_de_sede || p.nombreprestador || p.entidad_2 || p.razon_social || p.direccion || ''}`;
//       if (!uniqueMatches.has(key)) uniqueMatches.set(key, item);
//     }
//     return Array.from(uniqueMatches.values());
//   }

//   /**
//    * Busca prestadores para una región específica y devuelve el texto formateado.
//    */
//   async buscarEnRegion(serviceType: 'cali' | 'boyaca' | 'antioquia' | 'medellin' | 'yopal', searchTerm: string): Promise<ServiceQueryResult> {
//     let providers: any[] = [];
//     let regionName = '';

//     switch (serviceType) {
//       case 'cali':
//         providers = this.caliHealthService.searchProviders(searchTerm);
//         regionName = 'Cali';
//         break;
//       case 'boyaca':
//         providers = this.boyacaHealthService.findByIdentifier(searchTerm);
//         regionName = 'Boyacá';
//         break;
//       case 'medellin':
//         providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
//         regionName = 'Medellín (Antioquia)';
//         break;
//       case 'antioquia':
//         providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
//         regionName = 'Antioquia';
//         break;
//       case 'yopal':
//         providers = this.yopalHealthService.searchProviders(searchTerm);
//         regionName = 'Yopal';
//         break;
//     }

//     if (providers.length > 0) {
//       const response = providers.slice(0, 5).map(p => this.formatProviderResult(p, regionName)).join('\n\n');
//       return { handled: true, response: `📍 Resultados encontrados en **${regionName}**:\n\n${response}` };
//     }

//     return { handled: false, response: `⚠️ No encontré resultados de servicios de salud en **${regionName}**.` };
//   }
// }





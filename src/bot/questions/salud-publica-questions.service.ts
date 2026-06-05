import { Injectable } from '@nestjs/common';
import { SaludPublicaService } from '../salud-publica.service';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class SaludPublicaQuestionsService {
  constructor(private readonly saludPublicaService: SaludPublicaService) { }

  getAvailableQuestions(): string {
    return `💊 **Preguntas que puedo responder sobre Datos de Salud Pública:**

Puedo ayudarte a resolver las siguientes consultas:

• "Dame un resumen de salud pública"
• "¿Qué enfermedad es más rural o urbana?"
• "Comparar dengue vs zika"
• "¿Qué enfermedad afecta más a los adolescentes?"
• "Proporción global por sexo"
• "Eventos con mayor brecha de género"
• "¿Qué eventos son más frecuentes en adultos jóvenes?"

¿Sobre qué tema de salud pública te gustaría consultar?`;
  }

  /**
   * Procesa una consulta de texto y retorna una respuesta formateada.
   */
  async processPublicHealthQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    if (norm.includes('que info') || norm.includes('que sabes') || norm.includes('que informacion')) {
      return this.getAvailableQuestions();
    }

    if (norm.includes('resumen') || norm.includes('estadisticas generales')) {
      return this.handleGeneralSummary();
    }

    if (norm.includes('mas rural') || norm.includes('mayor concentracion rural')) {
      return this.handleRuralEvent();
    }

    if (norm.includes('mas urbano') || norm.includes('mayor concentracion urbano')) {
      return this.handleUrbanEvent();
    }

    if (norm.includes('compara') || norm.includes(' vs ')) {
      return this.handleComparison(text);
    }

    if (norm.includes('proporcion') && norm.includes('sexo')) {
      return this.handleGenderProportion();
    }

    if (norm.includes('brecha') && norm.includes('genero')) {
      return this.handleGenderGap();
    }

    if (norm.includes('niños') || norm.includes('adolescentes') || norm.includes('adultos') || norm.includes('mayores')) {
      return this.handleLifeCycle(text);
    }

    return null;
  }

  private async handleGeneralSummary(): Promise<string> {
    const resumen = await this.saludPublicaService.obtenerResumenGeneral();
    const top = resumen.topEventos
      .map((e, i) => `${i + 1}. ${e.nombre_del_evento}: ${e.total_de_eventos.toLocaleString()} casos`)
      .join('\n');

    return `📊 **Resumen de Salud Pública (Colombia)**

📈 **Total casos acumulados:** ${resumen.totalCasos.toLocaleString()}
✅ **Eventos registrados:** ${resumen.totalEventos}

🏆 **Top 3 Eventos:**
${top}`;
  }

  private async handleRuralEvent(): Promise<string> {
    const evento = await this.saludPublicaService.eventoMasRural();
    if (!evento) return 'No se encontraron datos.';
    const pct = ((evento.rural / evento.total_de_eventos) * 100).toFixed(1);
    return `🌾 **Evento con mayor concentración rural:**

**${evento.nombre_del_evento}**
- Casos rurales: ${evento.rural.toLocaleString()}
- Porcentaje rural: ${pct}%`;
  }

  private async handleUrbanEvent(): Promise<string> {
    const evento = await this.saludPublicaService.eventoMasUrbano();
    if (!evento) return 'No se encontraron datos.';
    const pct = ((evento.urbano / evento.total_de_eventos) * 100).toFixed(1);
    return `🏙️ **Evento con mayor concentración urbana:**

**${evento.nombre_del_evento}**
- Casos urbanos: ${evento.urbano.toLocaleString()}
- Porcentaje urbano: ${pct}%`;
  }

  private async handleComparison(text: string): Promise<string | null> {
    const parts = text.split(/compara| vs /i).filter(p => p.trim().length > 0);
    if (parts.length < 2) return "Para comparar, usa el formato: 'Compara dengue vs zika'";

    const comp = await this.saludPublicaService.compararEventos(parts[0].trim(), parts[1].trim());
    if (!comp.eventoA || !comp.eventoB) return "No pude encontrar uno de los eventos.";

    return `⚖️ **Comparativa de Salud Pública:**

🔹 **${comp.eventoA.nombre_del_evento}**: ${comp.eventoA.total_de_eventos.toLocaleString()} casos
🔸 **${comp.eventoB.nombre_del_evento}**: ${comp.eventoB.total_de_eventos.toLocaleString()} casos

📊 ${comp.mensaje}`;
  }

  private async handleGenderProportion(): Promise<string> {
    const prop = await this.saludPublicaService.proporcionSexoGlobal();
    return `👥 **Distribución Global por Sexo:**

👩 **Mujeres:** ${prop.pctFem.toFixed(1)}% (${prop.femenino.toLocaleString()} casos)
👨 **Hombres:** ${prop.pctMasc.toFixed(1)}% (${prop.masculino.toLocaleString()} casos)`;
  }

  private async handleGenderGap(): Promise<string> {
    const eventos = await this.saludPublicaService.eventosMayorBrechaSexo(5);
    const list = eventos.map(e => `- **${e.nombre_del_evento}** (Brecha: ${Math.abs(e.femenino - e.masculino).toLocaleString()})`).join('\n');
    return `⚖️ **Eventos con mayor brecha de género:**\n\n${list}`;
  }

  private async handleLifeCycle(text: string): Promise<string> {
    const norm = normalizeString(text);
    let grupo: any = 'adulto_j_ven';
    let label = 'Adultos Jóvenes';

    if (norm.includes('niños')) { grupo = 'infancia'; label = 'Niños'; }
    else if (norm.includes('adolescentes')) { grupo = 'adolescencia'; label = 'Adolescentes'; }
    else if (norm.includes('mayores')) { grupo = 'adulto_mayor'; label = 'Adultos Mayores'; }

    const evento = await this.saludPublicaService.eventoPrincipalPorGrupoEtario(grupo);
    if (!evento) return 'No se encontraron datos para este grupo.';

    return `🧒 **Evento más frecuente en ${label}:**

**${evento.nombre_del_evento}**
- Casos en este grupo: ${evento[grupo].toLocaleString()}
- Total casos evento: ${evento.total_de_eventos.toLocaleString()}`;
  }
}

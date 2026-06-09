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

  /**
   * Procesa una consulta de texto y retorna una respuesta formateada.
   */
  async processPublicHealthQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

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


  // NUEVOS METODOS
  async processProviderCapabilitiesQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    if (
      norm.includes('que info me puedes dar sobre salud publica') ||
      norm.includes('salud publica') ||
      norm.includes('salud pública') ||
      norm.includes('que centros de salud') ||
      norm.includes('que busquedas')

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

    // Si no es una consulta estructural real, no debe ser manejada aquí
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
    if (regionStr.includes('boyac')) return await this.buscarEnRegion('boyaca', searchTerm); // Corrected: return type mismatch
    if (regionStr.includes('medell')) return await this.buscarEnRegion('medellin', searchTerm); // Corrected: return type mismatch
    if (regionStr.includes('antioquia')) return await this.buscarEnRegion('antioquia', searchTerm); // Corrected: return type mismatch
    if (regionStr.includes('yopal')) return await this.buscarEnRegion('yopal', searchTerm); // Corrected: return type mismatch

    const finalMatches = await this.buscarPrestadores(text, detectedRegion, searchTerm);
    if (finalMatches.length > 0) {
      const uniqueMatches = this.aggregateProviderResults(finalMatches);
      const response = uniqueMatches.slice(0, 5).map(item => this.formatProviderResult(item.provider, item.source)).join('\n\n');
      const regionName = detectedRegion ? ` para **${detectedRegion}**` : '';
      return { handled: true, response: `🔍 Resultados encontrados${regionName}:\n\n${response}` }; // Corrected: return type mismatch
    }

    return { handled: false }; // Corrected: return type mismatch
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

  /**
   * Busca prestadores para una región específica y devuelve el texto formateado.
   */
  async buscarEnRegion(serviceType: 'cali' | 'boyaca' | 'antioquia' | 'medellin' | 'yopal', searchTerm: string): Promise<ServiceQueryResult> {
    let providers: any[] = [];
    let regionName = '';

    switch (serviceType) {
      case 'cali':
        providers = this.caliHealthService.searchProviders(searchTerm);
        regionName = 'Cali'; // Corrected: Assign regionName
        break;
      case 'boyaca':
        providers = this.boyacaHealthService.findByIdentifier(searchTerm);
        regionName = 'Boyacá'; // Corrected: Assign regionName
        break;
      case 'medellin':
        providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
        regionName = 'Medellín (Antioquia)'; // Corrected: Assign regionName
        break;
      case 'antioquia':
        providers = this.antioquiaHealthService.searchProviders(searchTerm, 10);
        regionName = 'Antioquia'; // Corrected: Assign regionName
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

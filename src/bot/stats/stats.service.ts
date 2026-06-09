import { Injectable } from '@nestjs/common';
import { HealthDataService } from '../health-data.service';
import { MentalHealthService } from '../mental-health/mental-health.service';
import { HealthStatsService } from './health-stats.service';
import { MentalHealthStatsService } from './mental-health-stats.service';
import { SexualHealthStatsService } from './sexual-health-stats.service';
import { AntioquiaHealthService } from '../antioquia/antioquia-health.service';
import { BoyacaHealthService } from '../boyaca/boyaca-health.service';
import { CaliHealthService } from '../cali/cali-health.service';
import { YopalHealthService } from '../yopal/yopal-health.service';
import { NationalHealthService } from '../national-health.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly mentalHealthService: MentalHealthService,
    private readonly healthStatsService: HealthStatsService,
    private readonly mentalHealthStatsService: MentalHealthStatsService,
    private readonly sexualHealthStatsService: SexualHealthStatsService,
    private readonly antioquiaHealthService: AntioquiaHealthService,
    private readonly boyacaHealthService: BoyacaHealthService,
    private readonly caliHealthService: CaliHealthService,
    private readonly yopalHealthService: YopalHealthService,
    private readonly nationalHealthService: NationalHealthService,
  ) { }

  async getSummary(query: string): Promise<string> {
    const queryLower = query.toLowerCase();

    // 0. Detección de Capacidades Generales
    const generalKeywords = [
      'que sabes',
      'que puedes hacer',
      'quien eres',
      'ayudame',
      'temas',
      'informacion tienes',
      'base de datos',
    ];
    if (generalKeywords.some((kw) => queryLower.includes(kw))) {
      return this.getGlobalCapabilities();
    }

    // New: Regional comparison detection (e.g., "compara dengue en Cali vs Palmira")
    if (queryLower.includes(' vs ') && (queryLower.includes('compara') || queryLower.includes('diferencia'))) {
      const parts = queryLower.split(' vs ');
      // Simple regex to extract event and first municipality from the first part
      // Example: "compara dengue en cali" -> event="dengue", mun1="cali"
      const match = parts[0].match(/(?:compara|diferencia de)\s+(.+?)\s+en\s+(.+)$/i);
      if (match) {
        const event = match[1].trim();
        const reg1 = match[2].trim();
        const reg2 = parts[1].trim();
        return await this.nationalHealthService.compareRegionalCases(event, reg1, reg2);
      }
    }

    // 1. Detección de Ranking de Enfermedades (Top 5)
    const rankingKeywords = [
      'ranking',
      'top',
      'más frecuentes',
      'peores',
      'mayor incidencia',
      'peor enfermedad',
    ];
    if (rankingKeywords.some((kw) => queryLower.includes(kw))) {
      return this.healthStatsService.getTopDiseasesRanking();
    }

    // 2. Detección de Análisis de Género Global (Hombres vs Mujeres)
    const globalGenderKeywords = [
      'género global',
      'brecha de género',
      'hombres o mujeres',
      'más hombres',
      'más mujeres',
    ];
    if (globalGenderKeywords.some((kw) => queryLower.includes(kw))) {
      return this.healthStatsService.getGlobalGenderAnalysis();
    }

    // 3. Detección de Comparación Urbana/Rural
    if (queryLower.includes('urbano') || queryLower.includes('rural')) {
      const events = await this.healthDataService.getAllEvents();
      const matchedEvent = events.find((e) =>
        queryLower.includes(e.toLowerCase()),
      );
      if (matchedEvent)
        return this.healthStatsService.getDiseaseComparison(matchedEvent);
    }

    // 4. Detección de Salud Mental por Ciclo de Vida o Edad o Frecuencia
    const mentalKeywords = [
      'ansiedad',
      'depresión',
      'estrés',
      'salud mental',
      'psicología',
      'psiquiatría',
      'enfermedad mental',
    ];

    // Nueva detección para la "más frecuente" general o por grupo de edad o comparativas (vs)
    if (mentalKeywords.some((kw) => queryLower.includes(kw)) || queryLower.includes(' vs ')) {

      // Detección de Perfil de Riesgo (Propuesta #4)
      if (queryLower.includes('perfil de riesgo') || queryLower.includes('perfil riesgo')) {
        console.log('DEBUG: Detección de perfil de riesgo activada para:', queryLower);

        // Limpiar la consulta para obtener solo el término de búsqueda, eliminando frases comunes y palabras introductorias
        let terms = queryLower
          .replace(/perfil de riesgo de/g, '')
          .replace(/perfil riesgo de/g, '')
          .replace(/perfil de riesgo/g, '')
          .replace(/perfil riesgo/g, '')
          .replace(/deme el/g, '')
          .replace(/dame el/g, '')
          .replace(/por favor/g, '')
          .trim();

        console.log('DEBUG: Términos limpios para búsqueda:', terms);

        // Buscar diagnósticos que coincidan con el término
        const matches = await this.mentalHealthService.searchDiagnoses(terms);

        console.log('DEBUG: Diagnósticos encontrados:', matches.length);

        if (matches.length > 0) {
          // Si hay varios (ej. ansiedad generalizada, trastorno mixto), elegir el que tenga más casos (total)
          const bestMatch = matches.sort((a, b) => b.total - a.total)[0];
          console.log('DEBUG: Mejor diagnóstico seleccionado:', bestMatch.diagnostico_ingreso);
          return await this.getMentalHealthRiskProfile(bestMatch.diagnostico_ingreso);
        }
      }

      // Detección de comparativa "X vs Y"
      if (queryLower.includes(' vs ')) {
        const parts = queryLower.split(' vs ');
        if (parts.length === 2) {
          return this.compareMentalHealth(parts[0].trim(), parts[1].trim());
        }
      }

      // Detección de grupo de edad específico en la consulta
      if (queryLower.includes('joven') || queryLower.includes('jovenes') || queryLower.includes('adolescent')) {
        const topMental = await this.mentalHealthService.getTopByLifeCycle('jovenes', 1);
        if (topMental.length > 0) {
          const d = topMental[0];
          return `En el grupo de adolescentes y jóvenes, la enfermedad de salud mental más frecuente es: ${d.diagnostico_ingreso} con ${d.total_en_ciclo} casos registrados en este ciclo de vida.`;
        }
      }

      // Fallback a global
      if (queryLower.includes('más frecuente') || queryLower.includes('que más afecta')) {
        const topMental = await this.mentalHealthService.getTopDiagnoses(1);
        if (topMental.length > 0) {
          const d = topMental[0];
          return `La enfermedad de salud mental que más afecta a los registrados es: ${d.diagnostico_ingreso} con ${d.total} casos.`;
        }
      }
    }

    if (
      mentalKeywords.some((kw) => queryLower.includes(kw)) &&
      (queryLower.includes('edad') ||
        queryLower.includes('años') ||
        queryLower.includes('etapa'))
    ) {
      const mentalDiagnoses = await this.mentalHealthService.getAllDiagnoses();
      const matchedMental = mentalDiagnoses.find((d) =>
        queryLower.includes(d.toLowerCase()),
      );
      if (matchedMental)
        return this.mentalHealthStatsService.getMentalHealthLifeCycleAnalysis(
          matchedMental,
        );
    }

    // 7. Detección de consultas sobre hospitales en Antioquia
    const hospitalKeywords = ['hospital', 'hospitales'];
    if (hospitalKeywords.some((kw) => queryLower.includes(kw)) && queryLower.includes('antioquia')) {
      const allProviders = this.antioquiaHealthService.searchProviders('');
      const hospitalProviders = allProviders.filter((p) =>
        (p.claseprestador || '').toLowerCase().includes('hospital'),
      );
      const count = hospitalProviders.length;
      return `En Antioquia hay ${count} centros de salud clasificados como hospital en la base de datos local.`;
    }

    const valleRegex = /valle de aburr[áa]/i;
    if (valleRegex.test(queryLower) || queryLower.includes('valle aburr')) {
      // Municipios que conforman el Valle de Aburrá
      const municipios = [
        'medellín',
        'envigado',
        'itagüí',
        'sabaneta',
        'bello',
        'la estrella',
        'girardota',
        'copacabana',
        'caldas',
        'barbosa',
      ];

      const resultsMap = new Map<string, any>();
      for (const m of municipios) {
        const found = this.antioquiaHealthService.searchProviders(m);
        for (const p of found) {
          const key = `${p.nombre_sede}-${p.municipio}-${p.nombreprestador}`;
          if (!resultsMap.has(key)) resultsMap.set(key, p);
        }
      }

      const providers = Array.from(resultsMap.values()).slice(0, 20);
      if (providers.length === 0) {
        return `No encontré centros de salud registrados específicamente para el Valle de Aburrá en mi base local de Antioquia.`;
      }

      const lines = providers.map((p) => {
        const nombre =
          p.nombre_sede || p.nombreprestador || 'Nombre no disponible';
        const municipio = p.municipio || '—';
        const direccion = p.direccion || 'N/A';
        const telefono = p.telefono || 'N/A';
        const webOrEmail = p.email || p.pagina_web || 'N/A';

        const nit = p.nit || 'N/A';
        const nivel = p.nivel || 'N/A';
        const caracter = p.caracter || 'N/A';

        return `- ${nombre} — ${municipio}\n  Dirección: ${direccion}\n  Teléfono: ${telefono}\n  Email/Web: ${webOrEmail}\n  NIT: ${nit} — Nivel: ${nivel} — Caracter: ${caracter}`;
      });

      return `Centros de salud en el Valle de Aburrá (según archivos locales):\n${lines.join('\n\n')}`;
    }

    // 8. Búsqueda por municipio específico (Antioquia)
    // Normalizar texto para comparar sin tildes
    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[ -\u036f]/g, '')
        .toLowerCase();

    const municipiosList = this.antioquiaHealthService.getMunicipios();
    const normalizedQuery = normalize(queryLower);

    // Boyacá: detección de municipio o departamento en la consulta
    const boyacaKeywords = ['boyaca', 'boyacá'];
    const boyacaMunicipios = this.boyacaHealthService.getMunicipios();
    const matchedBoyacaMunicipios = boyacaMunicipios.filter((m) =>
      normalizedQuery.includes(normalize(m)),
    );
    const isBoyacaQuery =
      boyacaKeywords.some((kw) => normalizedQuery.includes(normalize(kw))) ||
      matchedBoyacaMunicipios.length > 0;

    if (isBoyacaQuery) {
      if (matchedBoyacaMunicipios.length > 0) {
        return this.buildProviderResponse(
          matchedBoyacaMunicipios,
          this.boyacaHealthService.searchProviders.bind(
            this.boyacaHealthService,
          ),
          'Boyacá',
        );
      }

      const allBoyacaProviders = this.boyacaHealthService.searchProviders('');
      if (allBoyacaProviders.length > 0) {
        const lines = allBoyacaProviders.slice(0, 50).map((p) => {
          const provider = p as any;
          const nombre =
            provider.nombre_de_sede ||
            provider.nombreprestador ||
            'Nombre no disponible';
          const municipio = p.municipio || '—';
          const direccion = p.direccion || 'N/A';
          const telefono = provider.telefono || 'N/A';
          const webOrEmail = provider.email || provider.pagina_web || 'N/A';
          const nit = provider.nit || 'N/A';
          const nivel = provider.nivel || 'N/A';
          const caracter = provider.caracter || 'N/A';
          return `- ${nombre} — ${municipio}\n  Dirección: ${direccion}\n  Teléfono: ${telefono}\n  Email/Web: ${webOrEmail}\n  NIT: ${nit} — Nivel: ${nivel} — Caracter: ${caracter}`;
        });
        return `Centros de salud en Boyacá (según archivos locales):\n${lines.join('\n\n')}`;
      }
    }

    // Yopal: detección de municipio o departamento (Casanare) en la consulta
    const yopalKeywords = ['yopal', 'casanare'];
    const yopalMunicipios = this.yopalHealthService.getMunicipios();
    // Buscar la palabra 'yopal' o 'casanare' en la consulta, sin importar el contexto
    const isYopalQuery = yopalKeywords.some((kw) => queryLower.includes(kw));

    if (isYopalQuery) {
      const matchedYopalMunicipios = yopalMunicipios.filter((m) =>
        normalizedQuery.includes(normalize(m)),
      );

      if (matchedYopalMunicipios.length > 0) {
        return this.buildProviderResponse(
          matchedYopalMunicipios,
          this.yopalHealthService.searchProviders.bind(this.yopalHealthService),
          'Yopal',
        );
      }

      const allYopalProviders = this.yopalHealthService.searchProviders('');
      if (allYopalProviders.length > 0) {
        const lines = allYopalProviders.slice(0, 50).map((p) => {
          const provider = p as any;
          const nombre = provider.entidad_2 || 'Nombre no disponible';
          const gerente = provider.gerente || 'N/A';
          const direccion = p.direccion || 'N/A';
          const telefono = p.telefono || 'N/A';
          const email = provider.correo_electronico || 'N/A';

          return `🏢 Entidad: ${nombre}\n👤 Gerente: ${gerente}\n📍 Dirección: ${direccion}\n📞 Teléfono: ${telefono}\n📧 Email: ${email}`;
        });
        return `🏥 Servicios de Salud en Yopal (Casanare):\n\n${lines.join('\n\n')}`;
      }
    }

    const matchedMunicipios = municipiosList.filter((m) =>
      normalizedQuery.includes(normalize(m)),
    );

    if (matchedMunicipios.length > 0) {
      const resultsMap = new Map<string, any>();
      for (const m of matchedMunicipios) {
        const found = this.antioquiaHealthService.searchProviders(m);
        for (const p of found) {
          const key = `${p.nombre_sede}-${p.municipio}-${p.nombreprestador}`;
          if (!resultsMap.has(key)) resultsMap.set(key, p);
        }
      }

      const providers = Array.from(resultsMap.values()).slice(0, 50);
      if (providers.length === 0) {
        return `No encontré centros de salud registrados en ${matchedMunicipios.join(
          ', ',
        )} en mi base local de Antioquia.`;
      }

      const lines = providers.map((p) => {
        const nombre =
          p.nombre_sede || p.nombreprestador || 'Nombre no disponible';
        const municipio = p.municipio || '—';
        const direccion = p.direccion || 'N/A';
        const telefono = p.telefono || 'N/A';
        const webOrEmail = p.email || p.pagina_web || 'N/A';

        const nit = p.nit || 'N/A';
        const nivel = p.nivel || 'N/A';
        const caracter = p.caracter || 'N/A';

        return `- ${nombre} — ${municipio}\n  Dirección: ${direccion}\n  Teléfono: ${telefono}\n  Email/Web: ${webOrEmail}\n  NIT: ${nit} — Nivel: ${nivel} — Caracter: ${caracter}`;
      });

      const header =
        matchedMunicipios.length === 1
          ? `Centros de salud en ${matchedMunicipios[0]} (según archivos locales):`
          : `Centros de salud en ${matchedMunicipios.join(
            ', ',
          )} (según archivos locales):`;

      return `${header}\n${lines.join('\n\n')}`;
    }

    return `[INFO] El sistema de estadísticas para '${query}' está en desarrollo. Pronto podrás obtener tendencias, comparativas y promedios detallados.`;
  }

  private buildProviderResponse(
    municipios: string[],
    searchFn: (municipio: string) => any[],
    regionName: string,
  ): string {
    const resultsMap = new Map<string, any>();
    for (const m of municipios) {
      const found = searchFn(m);
      for (const p of found) {
        const provider = p as any;
        const key = `${provider.nombre_sede || provider.nombre_de_sede || provider.entidad_2}-${provider.municipio}-${provider.nombreprestador || provider.razon_social || provider.nombre_de_sede || provider.entidad_2}`;
        if (!resultsMap.has(key)) resultsMap.set(key, provider);
      }
    }

    const providers = Array.from(resultsMap.values()).slice(0, 50);
    if (providers.length === 0) {
      return `No encontré centros de salud registrados en ${municipios.join(', ')} en mi base local de ${regionName}.`;
    }

    const lines = providers.map((p) => {
      const provider = p as any;
      const nombre =
        provider.nombre_sede ||
        provider.nombre_de_sede ||
        provider.nombreprestador ||
        provider.razon_social ||
        provider.entidad_2 ||
        'Nombre no disponible';
      const municipio = provider.municipio || '—';
      const direccion = provider.direccion || 'N/A';
      const telefono = provider.telefono || 'N/A';
      const webOrEmail =
        provider.email ||
        provider.pagina_web ||
        provider.correo_electronico ||
        'N/A';
      const nit = provider.nit || 'N/A';
      const nivel = provider.nivel || 'N/A';
      const caracter = provider.caracter || 'N/A';

      let baseInfo = `- ${nombre} — ${municipio}\n  Dirección: ${direccion}\n  Teléfono: ${telefono}\n  Email/Web: ${webOrEmail}`;
      if (nit !== 'N/A' || nivel !== 'N/A' || caracter !== 'N/A') {
        baseInfo += `\n  NIT: ${nit} — Nivel: ${nivel} — Caracter: ${caracter}`;
      } else if (provider.latitud || provider.longitud) {
        baseInfo += `\n  Coordenadas: ${provider.latitud || 'N/A'}, ${provider.longitud || 'N/A'}`;
      }
      return baseInfo;
    });

    const header =
      municipios.length === 1
        ? `Centros de salud en ${municipios[0]} (según archivos locales):`
        : `Centros de salud en ${municipios.join(', ')} (según archivos locales):`;

    return `${header}\n${lines.join('\n\n')}`;
  }

  /**
   * Si el usuario envía un identificador (código, nombre o sede), devuelve
   * una respuesta formateada con la/s coincidencias. Retorna `null` si no
   * encuentra nada relevante para tratar como búsqueda directa.
   */
  public async lookupProviderByIdentifier(
    query: string,
  ): Promise<string | null> {
    const q = query.toString().trim();
    if (!q || q.length === 0) return null;

    const qLower = q.toLowerCase();
    let matches: any[] = [];

    // Priorizar búsqueda según la región detectada en la consulta
    if (qLower.includes('yopal') || qLower.includes('casanare')) {
      matches = this.yopalHealthService.findByIdentifier(q) || [];
    } else if (qLower.includes('cali')) {
      matches = this.caliHealthService.findByIdentifier(q) || [];
    } else if (qLower.includes('antioquia') || qLower.includes('medellin') || qLower.includes('medellín')) {
      matches = this.antioquiaHealthService.searchProviders(q) || [];
    } else if (qLower.includes('boyaca') || qLower.includes('boyacá')) {
      matches = this.boyacaHealthService.findByIdentifier(q) || [];
    } else {
      // Búsqueda global si no hay región explícita
      matches = [
        ...(this.boyacaHealthService.findByIdentifier(q) || []),
        ...(this.antioquiaHealthService.searchProviders(q) || []),
        ...(this.yopalHealthService.findByIdentifier(q) || []),
      ];
    }

    if (!matches || matches.length === 0) {
      return `⚠️ No encontré información específica para "${q}" en mi base de datos.\n\nActualmente, dispongo de información detallada de centros de salud, hospitales y clínicas en las siguientes regiones:\n- Antioquia (incluyendo Valle de Aburrá)\n- Boyacá\n- Cali\n- Yopal (Casanare)\n\nPor favor, intenta con el nombre de una sede, código de prestador o un dato más específico de estas regiones.`;
    }


    // Formatear la respuesta (máximo 20 resultados para evitar mensajes gigantes)
    const slice = matches.slice(0, 20);
    const parts = slice.map((p, idx) => {
      const nombre =
        p.nombre_de_sede ||
        p.razon_social ||
        p.nombreprestador ||
        p.nombre_sede ||
        p.entidad_2 ||
        'N/A';
      const municipio = p.municipio || p.departamento || 'N/A';
      const direccion = p.direccion || 'N/A';
      const telefono = p.telefono || 'N/A';
      const email = p.email || p.correo_electronico || 'N/A';
      const nivel = p.nivel || p.caracter || p.orden || 'N/A';
      const nit = p.nit || p.digito_verificacion_nit || 'N/A';
      const codigo =
        p.codigo_prestador ||
        p.codigo_habilitacion ||
        p.codigohabilitacion ||
        'N/A';

      let baseString = `#${idx + 1}\nNombre sede: ${nombre}\nMunicipio: ${municipio}\nDirección: ${direccion}\nTeléfono: ${telefono}\nEmail: ${email}`;
      if (nivel !== 'N/A') baseString += `\nNivel: ${nivel}`;
      if (nit !== 'N/A') baseString += `\nNIT: ${nit}`;
      if (codigo !== 'N/A') baseString += `\nCódigo prestador: ${codigo}`;
      if (p.latitud || p.longitud)
        baseString += `\nCoordenadas: ${p.latitud || 'N/A'}, ${p.longitud || 'N/A'}`;

      return baseString;
    });

    const header = `He encontrado ${matches.length} coincidencia(s). Mostrando ${slice.length} primero(s):\n\n`;
    return header + parts.join('\n\n');
  }

  async getMentalHealthRiskProfile(diagName: string): Promise<string> {
    const profile = await this.mentalHealthService.getRiskProfileByDiagnosis(diagName);
    if (!profile) return `No encontré un perfil de riesgo para '${diagName}'.`;

    const lines = Object.entries(profile.distribucion).map(
      ([cycle, count]) => `- ${cycle.charAt(0).toUpperCase() + cycle.slice(1)}: ${count} casos`,
    );

    return `
--- PERFIL DE RIESGO: ${profile.diagnostico.toUpperCase()} ---
📊 Distribución por Ciclo de Vida:

${lines.join('\n')}

Total registrado: ${profile.total} casos.
*(Nota: La suma de ciclos puede superar el total debido a que los rangos de edad son categorías solapadas).*
`;
  }

  async compareMentalHealth(diag1: string, diag2: string): Promise<string> {
    const comparison = await this.mentalHealthService.getComparisonBetweenDiagnoses(diag1, diag2);
    if (!comparison) return `No pude encontrar datos comparativos para '${diag1}' y '${diag2}'.`;

    const { d1, d2 } = comparison;
    return `
--- ANÁLISIS COMPARATIVO: SALUD MENTAL ---
⚖️ Comparación: ${d1.diagnostico_ingreso} vs ${d2.diagnostico_ingreso}

1. ${d1.diagnostico_ingreso}: ${d1.total} casos totales.
2. ${d2.diagnostico_ingreso}: ${d2.total} casos totales.

${d1.total > d2.total ? `📈 El primer diagnóstico (${d1.diagnostico_ingreso}) tiene mayor incidencia.` : `📈 El segundo diagnóstico (${d2.diagnostico_ingreso}) tiene mayor incidencia.`}
`;
  }

  /**
   * Reúne la capacidad total de conocimiento basada en los archivos XML cargados.
   */
  private async getGlobalCapabilities(): Promise<string> {
    const regionsSummary = `
📍 **Regiones con Cobertura Detallada:**
- Antioquia (incluyendo Valle de Aburrá)
- Boyacá (todos los municipios)
- Cali
- Yopal (Casanare)`;

    return `Soy **Salud IA**, tu asistente especializado en Salud Pública para Colombia. Mi conocimiento se basa en datos oficiales (SIVIGILA) y registros locales de infraestructura.

${regionsSummary}

✨ **¿Qué preguntas soy capaz de responder?**
Estoy diseñado para responder a consultas de alta precisión basadas en datos reales:

📍 **Búsqueda Geográfica:**
- "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
- "Lista de municipios de Boyacá con centros de salud."

📊 **Estadísticas SIVIGILA:**
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"
- "Muéstrame un gráfico de los eventos de salud pública más frecuentes."

🛡️ **Riesgo y Vacunación:**
- "Analizar riesgo de sarampión en Antioquia"
- "¿Cuál es la cobertura de vacunación de BCG en Santander?"

🧠 **Salud Mental y Sexual:**
- "¿Cuál es el diagnóstico de salud mental más común en niños?"
- "¿Qué derechos tengo para la prevención del VIH?"

🍃 **Indicadores Ambientales:**
- "¿Cómo está la calidad del aire hoy en Cali?"

¿Sobre cuál de estos temas o regiones te gustaría profundizar hoy?`;
  }

}

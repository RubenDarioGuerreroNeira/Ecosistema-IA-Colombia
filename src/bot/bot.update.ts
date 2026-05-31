import { Update, Start, Help, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GenkitService } from './genkit.service';
import { UserService } from './user.service';
import { StatsService } from './stats/stats.service';
import { CaliHealthService } from './cali-health.service';
import { BoyacaHealthService } from './boyaca-health.service';
import { YopalHealthService } from './yopal-health.service';
import { SaludPublicaService } from './salud-publica.service';
import { SaludAnaliticaService } from './salud-analitica.service';
import { HealthStatsService } from './stats/health-stats.service';
import { HealthDataService } from './health-data.service';
import { SexualHealthService, Intencion } from './sexual-health.service';
import { AirQualityService } from './air-quality.service';
import { PredictionService } from './prediction.service';
import { EMERGENCY_PROTOCOLS } from './emergency-protocols';

@Update()
export class BotUpdate {
  constructor(
    private readonly genkitService: GenkitService,
    private readonly userService: UserService,
    private readonly statsService: StatsService,
    private readonly boyacaHealthService: BoyacaHealthService,
    private readonly caliHealthService: CaliHealthService,
    private readonly yopalHealthService: YopalHealthService,
    private readonly saludPublicaService: SaludPublicaService,
    private readonly saludAnaliticaService: SaludAnaliticaService,
    private readonly healthStatsService: HealthStatsService,
    private readonly healthDataService: HealthDataService,
    private readonly sexualHealthService: SexualHealthService,
    private readonly airQualityService: AirQualityService,
    private readonly predictionService: PredictionService,
  ) {}

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private async sendPersonalizedGreeting(ctx: Context) {
    const firstName = ctx.from?.first_name || 'usuario';
    const greeting = this.getTimeGreeting();
    const welcomeMessage = `¡${greeting}, ${firstName}! 👋 Soy **Salud IA**, tu asistente de salud pública con **cobertura nacional**.

Ahora cuento con acceso a datos en tiempo real de SIVIGILA, lo que me permite ofrecerte análisis epidemiológicos locales para cualquier departamento o municipio de Colombia.

✨ **Puedo ayudarte con:**
- 🌍 **Monitoreo Nacional:** Datos reales de incidencia en todo el país.
- ⚖️ **Comparativas Regionales:** Analiza diferencias entre ciudades (ej. "Compara dengue en Cali vs Palmira").
- 🛡️ **Acción Preventiva:** Alertas automáticas basadas en vacunación y brotes reales de tu región.
- 🔬 **Análisis de Riesgo:** Indicadores locales y perfiles de riesgo sin depender de referencias externas.
- 🏢 **Búsqueda de Servicios:** Hospitales, clínicas y prestadores de salud en cualquier región.
- 🧠 **Salud Mental:** Perfiles de riesgo y comparativas de trastornos.
- 🛡️ **Protocolos de Emergencia:** Guías y rutas de atención.
- ❤️ **Salud Sexual:** Guías, derechos y rutas de atención.
- 📈 **Predicción Epidemiológica:** Proyección de tendencias basadas en datos históricos.

🔎 **Ejemplos de preguntas que puedes hacerme:**
- *"Compara dengue en Cali vs Palmira"*
- *"Analizar riesgo de tuberculosis en Risaralda"*
- *"¿Dónde queda el Hospital Primitivo Iglesias?"*
- *"predecir casos tuberculosis"*

💬 Estoy listo para apoyarte con datos precisos. **¿Qué te gustaría explorar hoy?**`;

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

    if (ctx.from?.id) {
      await this.userService.markAsGreeted(ctx.from.id);
    }
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(
      `🤖 **Menú de Ayuda - Salud IA (Versión Nacional)**

Puedes consultarme sobre cualquier región de Colombia:

📊 **Análisis Regional y Comparativo:**
- "¿Cómo está el dengue en Risaralda?"
- "Compara tuberculosis en Cali vs Tuluá"
- "Análisis de riesgo de zika en Valle del Cauca"

🏢 **Búsqueda de Servicios:**
- "Hospitales en [Municipio]"
- "Centros de salud en [Región]"

🔬 **Estadísticas de Salud Pública:**
- Consultas directas de casos (SIVIGILA).
- Análisis de género, edad y zona para eventos específicos.

💬 *Tip: Ahora tengo datos de todo el país. ¡Prueba comparando dos ciudades!*`,
      { parse_mode: 'Markdown' },
    );
  }

  private async sendLongMessage(
    ctx: Context,
    text: string,
    options: { parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' } = {},
  ) {
    const MAX_LENGTH = 4000;
    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text, options);
      return;
    }

    let currentPosition = 0;
    while (currentPosition < text.length) {
      let endPosition = currentPosition + MAX_LENGTH;

      if (endPosition < text.length) {
        const lastNewline = text.lastIndexOf('\n', endPosition);
        if (lastNewline > currentPosition) {
          endPosition = lastNewline;
        }
      }

      await ctx.reply(text.substring(currentPosition, endPosition), options);
      currentPosition = endPosition;
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const messageText = (ctx.message as { text: string }).text;

    // Detectar región para posibles análisis posteriores
    const detectedRegion = this.detectRegion(messageText);

    // Flujo de prioridades
    if (await this.handleGreeting(ctx, messageText)) return;
    if (await this.handleYopalQuery(ctx, messageText)) return;
    if (await this.handlePrediction(ctx, messageText)) return;
    if (await this.handleAirQualityQuery(ctx, messageText, detectedRegion)) return;

    // 1. PRIORIDAD: ESTADÍSTICAS Y COMPARATIVAS (StatsService)
    const contextData = await this.statsService.getSummary(messageText);
    const bypassMarkers = [
      '--- ANÁLISIS',
      '--- RANKING',
      '--- DISTRIBUCIÓN',
      '--- ANÁLISIS GLOBAL',
      '--- SALUD MENTAL',
      '--- PERFIL DE RIESGO',
      '--- COMPARATIVA SIVIGILA',
      'En el grupo de',
      'La enfermedad de salud mental que más afecta',
    ];

    if (
      contextData &&
      bypassMarkers.some((marker) => contextData.includes(marker))
    ) {
      await this.sendLongMessage(ctx, contextData);
      return;
    }

    // 2. PRIORIDAD: ANÁLISIS DE RIESGO E INCIDENCIA DETALLADA
    if (await this.handleRiskAnalysis(ctx, messageText, detectedRegion)) return;
    if (await this.handleSaludPublica(ctx, messageText, detectedRegion)) return;

    // 3. PRIORIDAD: MANEJO GENERAL (IA con contexto)
    await this.handleGeneralQuery(ctx, messageText, contextData);
  }

  private async handleGeneralQuery(
    ctx: Context,
    text: string,
    preFetchedContext?: string,
  ) {
    const contextData =
      preFetchedContext || (await this.statsService.getSummary(text));

    const respuestaProfesionalNoInformacion = `Lo siento, no tengo información sobre ese tema en mi base de datos actual. 
    
    Mi especialidad es la salud pública en Colombia. Puedo ayudarte con:
    1. 🏢 Buscar hospitales, clínicas y prestadores de servicios de salud en diversas ciudades.
    2. 🔬 Consultar estadísticas oficiales (SIVIGILA) y análisis de riesgo de enfermedades.
    3. 🧠 Recibir orientación sobre salud mental y perfiles de riesgo.
    4. 🛡️ Acceder a protocolos de emergencia.
    5. ❤️ Obtener guías sobre salud sexual y reproductiva.

    ¿Te gustaría consultar alguna de estas áreas?`;

    let augmentedPrompt = text;
    if (contextData && !contextData.includes('[INFO]')) {
      augmentedPrompt = `
### CONTEXTO DE DATOS REALES (COLOMBIA) ###
${contextData}
### FIN DEL CONTEXTO ###

INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. 
Si el contexto no contiene información relevante para responder la consulta, responde EXACTAMENTE con este mensaje: "${respuestaProfesionalNoInformacion}"
Si el contexto contiene estadísticas, limítate a analizarlas y presentarlas. NO generes información que no esté presente en el contexto.

Consulta: ${text}
      `;
    } else {
      augmentedPrompt = `Consulta: ${text}

INSTRUCCIÓN: Como asistente experto en salud pública colombiana, si la consulta no está relacionada con tus capacidades (servicios de salud, estadísticas de salud pública, salud mental o sexual), responde EXACTAMENTE con este mensaje: "${respuestaProfesionalNoInformacion}"`;
    }

    try {
      const response =
        await this.genkitService.generateResponse(augmentedPrompt);
      await this.sendLongMessage(ctx, response);
    } catch (error) {
      await ctx.reply(
        '⚠️ Lo siento, mi servicio de inteligencia artificial no está disponible en este momento. Por favor, intenta de nuevo en unos minutos.',
      );
    }
  }

  private async handleRiskAnalysis(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const norm = text.toLowerCase();
    // Solo activamos si el usuario pide explícitamente analizar riesgo, NO en comparativas
    if (
      (!norm.includes('riesgo') && !norm.includes('analizar')) ||
      norm.includes(' vs ')
    )
      return false;

    // Intentar extraer el evento (ej: tuberculosis, dengue)
    const keywords = [
      'tuberculosis',
      'dengue',
      'zika',
      'malaria',
      'sarampion',
      'rubeola',
      'fiebre amarilla',
      'hepatitis',
      'polio',
      'tos ferina',
    ];
    const event = keywords.find((k) => norm.includes(k));

    if (event) {
      try {
        const region = detectedRegion || 'Antioquia';
        const analysis = await this.saludAnaliticaService.analizarRiesgoEvento(
          event,
          region,
        );
        await this.sendLongMessage(ctx, analysis);
        return true;
      } catch (error) {
        console.error('Error in handleRiskAnalysis:', error);
      }
    }
    return false;
  }

  private detectRegion(text: string): string | undefined {
    const departments = [
      'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá',
      'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
      'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
      'Quindío', 'Risaralda', 'San Andrés', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
      'Vaupés', 'Vichada'
    ];

    const capitals = [
      'Leticia', 'Medellín', 'Arauca', 'Barranquilla', 'Cartagena', 'Tunja', 'Manizales',
      'Florencia', 'Yopal', 'Popayán', 'Valledupar', 'Quibdó', 'Montería', 'Bogotá',
      'Inírida', 'San José del Guaviare', 'Neiva', 'Riohacha', 'Santa Marta', 'Villavicencio',
      'Pasto', 'Cúcuta', 'Mocoa', 'Armenia', 'Pereira', 'Bucaramanga', 'Sincelejo',
      'Ibagué', 'Cali', 'Mitú', 'Puerto Carreño'
    ];

    const majorValle = [
      'Buga', 'Tuluá', 'Palmira', 'Jamundí', 'Cartago', 'Buenaventura', 'Yumbo', 'Candelaria',
      'Florida', 'El Cerrito', 'Sevilla', 'Zarzal', 'Caicedonia', 'Guacarí', 'Roldanillo'
    ];

    const others = [
      'valle', 'capresoca', 'coomeva', 'medimas', 'sanitas', 'nueva eps', 'coosalud', 'horo', 'orinoquia'
    ];

    const regions = [...departments, ...capitals, ...majorValle, ...others];
    
    const cleanText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents for better matching
      .replace(/\s+/g, '')
      .replace(/k/g, 'c');

    return regions.find((r) => {
      const cleanRegion = r.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/k/g, 'c');
      return cleanText.includes(cleanRegion);
    });
  }

  private async handleGreeting(ctx: Context, text: string): Promise<boolean> {
    const userId = ctx.from?.id;
    const isGreeting =
      /^(hola|buenos dias|buenas tardes|buenas noches|saludos|hi|hello|\/start)/i.test(
        text.trim(),
      );
    console.log(`DEBUG: handleGreeting - userId=${userId}, text='${text}', isGreeting=${isGreeting}`);

    if (userId && !(await this.userService.hasBeenGreeted(userId))) {
      console.log(`DEBUG: handleGreeting - Greeting new user`);
      await this.sendPersonalizedGreeting(ctx);
      return true;
    } else if (isGreeting) {
      console.log(`DEBUG: handleGreeting - Greeting existing user`);
      // ... resto del mensaje
      const firstName = ctx.from?.first_name || 'usuario';
      await ctx.reply(
        `¡Hola, ${firstName}! 👋 Soy Salud IA, tu asistente de salud respaldado por datos oficiales. 

Mi objetivo es aportar valor preventivo mediante el cruce de datos oficiales de salud, vacunación y medio ambiente.

Puedo ayudarte con:
- 🏢 **Búsqueda de Servicios:** Hospitales, clínicas y prestadores.
- 🔬 **Análisis de Riesgo e Incidencia:** Estadísticas oficiales (SIVIGILA).
- 🧠 **Salud Mental:** Perfiles de riesgo y trastornos.
- 🛡️ **Protocolos de Emergencia:** Guías de atención.
- ❤️ **Salud Sexual:** Guías, derechos y rutas.
- 📈 **Predicción Epidemiológica:** Proyección de tendencias.

---
💡 **¿Cómo puedes preguntarme?**
*   "¿Qué eventos de salud pública hay en Antioquia?"
*   "Analizar riesgo de dengue en Cali"
*   "Predecir riesgo de tuberculosis en Antioquia"
*   "Predecir casos tuberculosis"
*   "Comparar hombres y mujeres en malaria"

¿Sobre qué tema te gustaría consultar hoy?`,
      );
      return true;
    }
    console.log(`DEBUG: handleGreeting - No greeting detected`);
    return false;
  }

  private async handleYopalQuery(ctx: Context, text: string): Promise<boolean> {
    try {
      const lcQuery = text.toLowerCase();
      const cleanQuery = lcQuery.replace(/\s+/g, '').replace(/k/g, 'c');

      if (
        lcQuery.includes('yopal') ||
        ['capresoca', 'coomeva', 'horo', 'orinoquia'].some((e) =>
          cleanQuery.includes(e.replace(/k/g, 'c')),
        )
      ) {
        const { content, found } =
          await this.yopalHealthService.answerNaturalQuestion(text);

        if (found) {
          await this.sendLongMessage(ctx, content, {
            parse_mode: 'Markdown',
          });
          return true;
        }
      }
    } catch (err) {
      console.error('Yopal bypass failed', err);
    }
    return false;
  }

  private async handlePrediction(ctx: Context, text: string): Promise<boolean> {
    const lowerText = text.toLowerCase();
    
    // 1. Predicción de Riesgo (Nueva Funcionalidad)
    if (lowerText.startsWith('predecir riesgo de')) {
      const parts = lowerText.replace('predecir riesgo de', '').split(' en ');
      const eventName = parts[0].trim();
      const departamento = parts[1] ? parts[1].trim() : 'Antioquia';

      if (!eventName) {
        await this.sendLongMessage(ctx, "Por favor, especifica un evento. Ejemplo: 'predecir riesgo de dengue en Cali'");
        return true;
      }

      const prediction = await this.predictionService.predictRisk(departamento, eventName);
      await this.sendLongMessage(ctx, prediction);
      return true;
    }

    // 2. Predicción de Casos (Funcionalidad anterior)
    if (lowerText.startsWith('predecir casos')) {
      const eventName = lowerText.replace('predecir casos', '').trim();

      if (!eventName) {
        await this.sendLongMessage(
          ctx,
          "Por favor, especifica un evento. Ejemplo: 'predecir casos dengue'",
        );
        return true;
      }

      const resultado = await this.saludPublicaService.procesarPregunta(eventName);
      if (!resultado.evento) {
        await this.sendLongMessage(
          ctx,
          'No encontré ese evento para predecir.',
        );
        return true;
      }

      const temporalData = await this.healthDataService.getTemporalSeries(
        resultado.evento.nombre_del_evento,
      );
      const cases = temporalData.map((d) => d.cases);
      const prediccion = this.healthStatsService.predictNextValue(cases);

      await this.sendLongMessage(
        ctx,
        `📊 **Predicción para ${resultado.evento.nombre_del_evento}:**
Basado en datos históricos de los últimos 6 meses: ${cases.join(', ')}
El próximo valor proyectado es: **${prediccion}** casos.`,
      );
      return true;
    }
    return false;
  }

  private async handleAirQualityQuery(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    const norm = text.toLowerCase();
    if (!norm.includes('calidad del aire')) return false;
    
    const region = detectedRegion || 'Colombia';
    const aireData = await this.airQualityService.getAirQualityByMunicipio(region);
    
    if (aireData && aireData.length > 0) {
      const variables = aireData.slice(0, 3).map(item => `- ${item.variable}: ${item.promedio} ${item.unidades}`).join('\n');
      await this.sendLongMessage(ctx, `🍃 **Indicadores ambientales en ${region}:**\n${variables}`);
      return true;
    }
    
    return false;
  }

  private async handleSaludPublica(
    ctx: Context,
    text: string,
    detectedRegion?: string,
  ): Promise<boolean> {
    try {
      const resultado = await this.saludPublicaService.procesarPregunta(text);
      console.log(
        `DEBUG: handleSaludPublica - resultado.encontrado=${resultado.encontrado}, hasEvento=${!!resultado.evento}, hasContenido=${!!resultado.contenido}`,
      );

      if (resultado.encontrado) {
        let respuestaFinal = '';

        if (resultado.evento) {
          const { contenido } = await this.saludPublicaService._formatearRespuesta(
            { evento: resultado.evento },
            'detalle',
          );
          respuestaFinal = contenido;

          const regionParaAnalisis = detectedRegion || 'Antioquia';
          console.log(
            `DEBUG: handleSaludPublica - Llamando analizarRiesgoEvento para ${resultado.evento.nombre_del_evento} en ${regionParaAnalisis}`,
          );

          const analisis =
            await this.saludAnaliticaService.analizarRiesgoEvento(
              resultado.evento.nombre_del_evento,
              regionParaAnalisis,
            );
          respuestaFinal += `\n\n${analisis}`;

          // ENRIQUECIMIENTO: Datos de calidad del aire (Procesando arreglo de variables)
          try {
            const aireData = await this.airQualityService.getAirQualityByMunicipio(regionParaAnalisis);
            if (aireData && aireData.length > 0) {
              // Agrupamos las variables encontradas
              const variables = aireData.slice(0, 3).map(item => `- ${item.variable}: ${item.promedio} ${item.unidades}`).join('\n');
              
              respuestaFinal += `\n\n🍃 **Indicadores ambientales en ${regionParaAnalisis}:**
${variables}
(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
            } else {
              respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas. No se encontraron datos ambientales locales para ${regionParaAnalisis}).`;
            }
          } catch (e) {
            console.error('Error enriqueciendo con calidad del aire', e);
            respuestaFinal += `\n\n(Nota: Los datos de salud pública mostrados son estadísticas nacionales consolidadas).`;
          }
        } else if (resultado.contenido) {
          respuestaFinal = resultado.contenido;
        }

        if (!respuestaFinal) {
          console.warn('DEBUG: handleSaludPublica - respuestaFinal vacía');
          return false;
        }

        await this.sendLongMessage(ctx, respuestaFinal);
        return true;
      }
    } catch (err) {
      console.error('DEBUG: Error en handleSaludPublica:', err);
    }
    return false;
  }
}

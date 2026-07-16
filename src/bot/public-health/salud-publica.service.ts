import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthEvent as HealthEventEntity } from '../../entities/health-event.entity';
import { HealthEvent } from '../health-data.service';

@Injectable()
export class SaludPublicaService implements OnModuleInit {
  private readonly logger = new Logger(SaludPublicaService.name);
  private events: HealthEvent[] = [];
  private eventsMap = new Map<string, HealthEvent>();
  private readyPromise: Promise<void>;

  constructor(
    @InjectRepository(HealthEventEntity)
    private readonly healthEventRepo: Repository<HealthEventEntity>,
  ) {
    // Carga lazy desde SQLite - no en constructor
    this.readyPromise = this.loadData();
    this.logger.log('SaludPublicaService initialized (SQLite mode)');
  }

  async onModuleInit() {
    await this.readyPromise;
    this.logger.log(
      `Servicio listo. ${this.events.length} eventos únicos cargados.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Carga y procesamiento de datos
  // ---------------------------------------------------------------------------
  private async loadData() {
    try {
      const rows = await this.healthEventRepo.find();
      const tempMap = new Map<string, HealthEvent>();

      for (const row of rows) {
        const nombre = row.nombre_del_evento?.trim();
        if (!nombre) continue;

        const event = this.mapRowToEvent(row);
        const normalizedKey = this.normalizeText(nombre);

        if (tempMap.has(normalizedKey)) {
          const existing = tempMap.get(normalizedKey)!;
          this.aggregateEvent(existing, event);
        } else {
          tempMap.set(normalizedKey, event);
        }
      }

      this.events = Array.from(tempMap.values());
      this.eventsMap = tempMap;
      this.logger.log(
        `Cargados ${this.events.length} eventos únicos (agregados) desde SQLite.`,
      );
    } catch (error) {
      this.logger.error('Error cargando datos de salud pública desde SQLite:', error);
      this.events = [];
    }
  }

  // mapea eventos de salud
  private mapRowToEvent(row: HealthEventEntity): HealthEvent {
    const toNumber = (val: any): number => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    return {
      departamento: row.departamento || '',
      nombre_del_evento: row.nombre_del_evento?.trim() || 'Desconocido',
      urbano: toNumber(row.urbano),
      rural: toNumber(row.rural),
      primera_infancia: toNumber(row.primera_infancia),
      infancia: toNumber(row.infancia),
      adolescencia: toNumber(row.adolescencia),
      juventud: toNumber(row.juventud),
      adulto_j_ven: toNumber(row.adulto_j_ven),
      adulto_mayor: toNumber(row.adulto_mayor),
      femenino: toNumber(row.femenino),
      masculino: toNumber(row.masculino),
      total_de_eventos: toNumber(row.total_de_eventos),
    };
  }

  private aggregateEvent(target: HealthEvent, source: HealthEvent): void {
    target.urbano += source.urbano;
    target.rural += source.rural;
    target.primera_infancia += source.primera_infancia;
    target.infancia += source.infancia;
    target.adolescencia += source.adolescencia;
    target.juventud += source.juventud;
    target.adulto_j_ven += source.adulto_j_ven;
    target.adulto_mayor += source.adulto_mayor;
    target.femenino += source.femenino;
    target.masculino += source.masculino;
    target.total_de_eventos += source.total_de_eventos;
  }

  // ---------------------------------------------------------------------------
  // Normalización
  // ---------------------------------------------------------------------------
  private normalizeText(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------------------------------------------------------------------------
  // Búsqueda y obtención de eventos
  // ---------------------------------------------------------------------------
  private async ensureReady() {
    await this.readyPromise;
  }

  /**
   * Obtiene todos los eventos (sin filtrar)
   * Preguntas: "Muéstrame todos los eventos de salud pública", "Lista completa"
   */
  public async listarEventosCompletos(): Promise<HealthEvent[]> {
    await this.ensureReady();
    return this.events;
  }

  /**
   * Obtiene un evento único por nombre exacto (normalizado)
   * Preguntas: "Dame los datos de DENGUE", "¿Qué casos hay de VARICELA?"
   */
  public async obtenerEventoUnico(
    nombre: string,
  ): Promise<HealthEvent | undefined> {
    await this.ensureReady();
    const norm = this.normalizeText(nombre);
    return this.eventsMap.get(norm);
  }

  /**
   * Búsqueda ambigua (coincidencia parcial)
   * Preguntas: "Eventos que contengan 'violencia'", "Buscar por 'malaria'"
   */
  public async buscarEventosAmbigua(nombre: string): Promise<HealthEvent[]> {
    await this.ensureReady();
    const normNombre = this.normalizeText(nombre);
    return this.events.filter((e) =>
      this.normalizeText(e.nombre_del_evento).includes(normNombre),
    );
  }

  /**
   * Búsqueda por similitud difusa (útil para errores tipográficos)
   * Preguntas: "dgngue" (similar a dengue), "chikunguña"
   */
  public async buscarPorSimilitud(
    query: string,
    threshold = 0.6,
  ): Promise<HealthEvent[]> {
    await this.ensureReady();
    const normQuery = this.normalizeText(query);
    return this.events
      .map((evento) => ({
        evento,
        score: this.similarity(
          normQuery,
          this.normalizeText(evento.nombre_del_evento),
        ),
      }))
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.evento);
  }

  private similarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const costs = new Array(shorter.length + 1);
    for (let i = 0; i <= shorter.length; i++) costs[i] = i;
    for (let i = 1; i <= longer.length; i++) {
      let prev = i;
      for (let j = 1; j <= shorter.length; j++) {
        const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
        const current = Math.min(prev + 1, costs[j] + 1, costs[j - 1] + cost);
        costs[j - 1] = prev;
        prev = current;
      }
      costs[shorter.length] = prev;
    }
    const distance = costs[shorter.length];
    return 1 - distance / longer.length;
  }

  // ---------------------------------------------------------------------------
  // Métodos de análisis existentes (mejorados con comentarios)
  // ---------------------------------------------------------------------------

  /**
   * Lista de nombres de todos los eventos
   * Preguntas: "¿Qué eventos de salud pública están registrados?", "Nombres de enfermedades"
   */
  public async listarEventos(): Promise<string[]> {
    await this.ensureReady();
    return this.events.map((e) => e.nombre_del_evento);
  }


  // Obtiene Todos los departamentos
  public async getDepartamentos(): Promise<string[]> {
    await this.ensureReady();
    return [...new Set(this.events.map(e => e.departamento))];
  }

  /**
   * Top n eventos con más casos totales
   * Preguntas: "¿Cuáles son los 5 eventos más comunes?", "Evento con más casos", "Ranking de enfermedades"
   */
  public async topEventos(n = 5): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, n);
  }

  /**
   * Bottom n eventos con menos casos (pueden ser cero)
   * Preguntas: "Eventos con menos incidencia", "¿Qué enfermedades tienen pocos casos?"
   */
  public async bottomEventos(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .sort((a, b) => a.total_de_eventos - b.total_de_eventos)
      .slice(0, n);
  }

  /**
   * Eventos cuyos casos totales están entre un rango
   * Preguntas: "Eventos con entre 10 y 50 casos", "¿Qué enfermedades tienen más de 100 casos?"
   */
  public async eventosPorRango(
    min: number,
    max: number,
  ): Promise<HealthEvent[]> {
    await this.ensureReady();
    return this.events.filter(
      (e) => e.total_de_eventos >= min && e.total_de_eventos <= max,
    );
  }

  /**
   * Eventos donde solo hay casos femeninos
   * Preguntas: "Eventos que solo afectan a mujeres", "Enfermedades exclusivas de mujeres"
   */
  public async eventosExclusivamenteFemeninos(): Promise<HealthEvent[]> {
    await this.ensureReady();
    return this.events.filter((e) => e.masculino === 0 && e.femenino > 0);
  }

  /**
   * Eventos donde solo hay casos masculinos
   * Preguntas: "Eventos que solo afectan a hombres", "Enfermedades exclusivas de hombres"
   */
  public async eventosExclusivamenteMasculinos(): Promise<HealthEvent[]> {
    await this.ensureReady();
    return this.events.filter((e) => e.femenino === 0 && e.masculino > 0);
  }

  /**
   * Eventos con mayor proporción de casos femeninos
   * Preguntas: "¿Qué enfermedad afecta más a las mujeres?", "Evento con más mujeres"
   */
  public async eventosMasFemeninos(n = 1): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .filter((e) => e.femenino + e.masculino > 0)
      .sort(
        (a, b) =>
          b.femenino / (b.femenino + b.masculino) -
          a.femenino / (a.femenino + a.masculino),
      )
      .slice(0, n);
  }

  /**
   * Compara casos por sexo de un evento específico
   * Preguntas: "¿Cuántos hombres y mujeres tienen dengue?", "Comparación por sexo de malaria"
   */
  public async compararSexo(nombreEvento: string): Promise<any> {
    await this.ensureReady();
    const evento = await this.obtenerEventoUnico(nombreEvento);
    if (!evento) {
      return { error: `No encontré el evento '${nombreEvento}'.` };
    }
    const total = evento.femenino + evento.masculino;
    return {
      evento: evento.nombre_del_evento,
      femenino: evento.femenino,
      masculino: evento.masculino,
      total,
      pctFem: total > 0 ? (evento.femenino / total) * 100 : 0,
      pctMasc: total > 0 ? (evento.masculino / total) * 100 : 0,
    };
  }

  /**
   * Distribución por grupos de edad de un evento
   * Preguntas: "¿Qué edades afecta más el dengue?", "Distribución por edad de violencia intrafamiliar"
   */
  public async distribucionPorEdad(
    nombreEvento: string,
  ): Promise<{ grupo: string; casos: number }[]> {
    await this.ensureReady();
    const evento = await this.obtenerEventoUnico(nombreEvento);
    if (!evento) return [];
    return [
      { grupo: 'Primera infancia (0-4)', casos: evento.primera_infancia },
      { grupo: 'Infancia (5-9)', casos: evento.infancia },
      { grupo: 'Adolescencia (10-14)', casos: evento.adolescencia },
      { grupo: 'Juventud (15-19)', casos: evento.juventud },
      { grupo: 'Adulto joven (20-49)', casos: evento.adulto_j_ven },
      { grupo: 'Adulto mayor (50+)', casos: evento.adulto_mayor },
    ].filter((g) => g.casos > 0);
  }

  /**
   * Eventos que superan un umbral de casos totales
   * Preguntas: "Eventos con más de 100 casos", "¿Cuáles superan los 50 casos?"
   */
  public async eventosSobreUmbral(umbral = 100): Promise<HealthEvent[]> {
    await this.ensureReady();
    return this.events.filter((e) => e.total_de_eventos > umbral);
  }

  /**
   * Exporta los datos agregados a un archivo CSV
   * Preguntas: "Exportar datos a CSV", "Generar reporte"
   */
  public async exportarACSV(): Promise<string> {
    await this.ensureReady();
    const campos: (keyof HealthEvent)[] = [
      'nombre_del_evento',
      'total_de_eventos',
      'femenino',
      'masculino',
      'urbano',
      'rural',
      'primera_infancia',
      'infancia',
      'adolescencia',
      'juventud',
      'adulto_j_ven',
      'adulto_mayor',
    ];
    const cabecera = campos.join(',');
    const filas = this.events.map((e) =>
      campos.map((campo) => e[campo]?.toString() ?? '').join(','),
    );
    const csvContent = [cabecera, ...filas].join('\n');
    const outPath = require('path').join(
      process.cwd(),
      'exports',
      'eventos_salud_publica.csv',
    );
    const fs = require('fs/promises');
    await fs.mkdir(require('path').dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, csvContent, 'utf-8');
    this.logger.log(`Exportado CSV a ${outPath}`);
    return outPath;
  }

  // ---------------------------------------------------------------------------
  // Categorías
  // ---------------------------------------------------------------------------

  /**
   * Filtra eventos por categoría temática (infecciosos, mental, materno, violencia)
   * Preguntas: "Eventos de salud mental", "Enfermedades infecciosas", "Violencia y accidentes"
   */
  public async eventosPorCategoria(categoria: string): Promise<HealthEvent[]> {
    await this.ensureReady();
    const cats: Record<string, string[]> = {
      infecciosos: [
        'DENGUE',
        'ZIKA',
        'CHIKUNGUYA',
        'MALARIA',
        'TUBERCULOSIS',
        'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
        'VIH/SIDA - MORTALIDAD POR SIDA',
        'SIFILIS GESTACIONAL',
        'HERPES GENITAL',
        'PAROTIDITIS',
        'TOS FERINA',
        'CHAGAS',
        'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
        'FIEBRE TIFOIDEA Y PARATIFOIDEA',
        'VARICELA INDIVIDUAL',
      ],
      mental: [
        'ANSIEDAD',
        'DEPRESIÓN',
        'PSICOSIS',
        'TRASTORNO AFECTIVO BIPOLAR',
        'CONSUMO DE SPA',
        'INTENTO DE SUICIDIO',
      ],
      materno: [
        'MORTALIDAD MATERNA',
        'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
        'BAJO PESO AL NACER',
        'DEFECTOS CONGENITOS',
        'SIFILIS GESTACIONAL',
        'MORBILIDAD MATERNA EXTREMA',
      ],
      violencia: [
        'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
        'LESIONES DE CAUSA EXTERNA',
        'ACCIDENTE DE TRABAJO',
        'INTENTO DE SUICIDIO',
        'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
        'ACCIDENTE OFIDICO',
        'CONSUMO DE SPA',
        'LESIONES POR ARTEFACTOS EXPLOSIVOS',
      ],
    };
    const lista = cats[categoria.toLowerCase()] || [];
    return this.events.filter((e) => lista.includes(e.nombre_del_evento));
  }

  /**
   * Eventos de una categoría desglosados por zona (urbano/rural)
   * Preguntas: "¿Cuántos casos de enfermedades infecciosas hay en zona rural?", "Violencia en zona urbana"
   */
  public async eventosPorZona(
    categoria: string,
    zona: 'urbano' | 'rural',
  ): Promise<{ evento: string; casos: number }[]> {
    const eventos = await this.eventosPorCategoria(categoria);
    return eventos
      .map((e) => ({
        evento: e.nombre_del_evento,
        casos: zona === 'rural' ? e.rural : e.urbano,
      }))
      .filter((item) => item.casos > 0)
      .sort((a, b) => b.casos - a.casos);
  }

  /**
   * Eventos que afectan a niños (primera infancia + infancia)
   * Preguntas: "Enfermedades comunes en niños", "Eventos infantiles", "¿Qué afecta más a los menores de 10 años?"
   */
  public async eventosInfantiles(): Promise<
    { evento: string; casos: number }[]
  > {
    await this.ensureReady();
    return this.events
      .map((e) => ({
        evento: e.nombre_del_evento,
        casos: e.primera_infancia + e.infancia,
      }))
      .filter((item) => item.casos > 0);
  }

  /**
  * Resumen ejecutivo de salud pública: total de casos, top 3 eventos, total por categorías, etc.
  * Preguntas: "Dame un resumen de salud pública", "Estadísticas generales", "Panorama general"
  */
  public async obtenerResumenGeneral(): Promise<{
    totalCasos: number;
    totalEventos: number;
    topEventos: HealthEvent[];
    casosCategoria: { categoria: string; casos: number }[];
    eventosConCeroCasos: number;
  }> {
    await this.ensureReady();
    const totalCasos = this.events.reduce(
      (sum, e) => sum + e.total_de_eventos,
      0,
    );
    const topEventos = await this.topEventos(3);
    const categorias = ['infecciosos', 'mental', 'materno', 'violencia'];
    const casosCategoria: { categoria: string; casos: number }[] = [];
    for (const cat of categorias) {
      const eventosCat = await this.eventosPorCategoria(cat);
      const totalCat = eventosCat.reduce(
        (sum, e) => sum + e.total_de_eventos,
        0,
      );
      casosCategoria.push({ categoria: cat, casos: totalCat });
    }
    const eventosConCeroCasos = this.events.filter(
      (e) => e.total_de_eventos === 0,
    ).length;
    return {
      totalCasos,
      totalEventos: this.events.length,
      topEventos,
      casosCategoria,
      eventosConCeroCasos,
    };
  }

  /**
   * Evento con mayor concentración en zona rural (porcentaje rural más alto)
   * Preguntas: "¿Qué enfermedad es más rural?", "Evento con más casos en el campo"
   */
  public async eventoMasRural(): Promise<HealthEvent | null> {
    await this.ensureReady();
    if (this.events.length === 0) return null;
    return this.events.reduce((max, e) => {
      const pctMax = max.total_de_eventos
        ? max.rural / max.total_de_eventos
        : 0;
      const pctCurr = e.total_de_eventos ? e.rural / e.total_de_eventos : 0;
      return pctCurr > pctMax ? e : max;
    }, this.events[0]);
  }

  /**
   * Evento con mayor concentración en zona urbana
   * Preguntas: "¿Qué enfermedad es más urbana?", "Evento con más casos en ciudad"
   */
  public async eventoMasUrbano(): Promise<HealthEvent | null> {
    await this.ensureReady();
    if (this.events.length === 0) return null;
    return this.events.reduce((max, e) => {
      const pctMax = max.total_de_eventos
        ? max.urbano / max.total_de_eventos
        : 0;
      const pctCurr = e.total_de_eventos ? e.urbano / e.total_de_eventos : 0;
      return pctCurr > pctMax ? e : max;
    }, this.events[0]);
  }

  /**
   * Compara dos eventos: retorna el que tiene más casos y la diferencia
   * Preguntas: "¿Qué es más común, dengue o zika?", "Comparar varicela con parotiditis"
   */
  public async compararEventos(
    eventoA: string,
    eventoB: string,
  ): Promise<{
    eventoA: HealthEvent | null;
    eventoB: HealthEvent | null;
    mayor: string;
    diferencia: number;
    mensaje: string;
  }> {
    await this.ensureReady();
    const eA = await this.obtenerEventoUnico(eventoA);
    const eB = await this.obtenerEventoUnico(eventoB);
    if (!eA && !eB) {
      return {
        eventoA: null,
        eventoB: null,
        mayor: '',
        diferencia: 0,
        mensaje: 'Ninguno de los eventos fue encontrado.',
      };
    }
    if (!eA) {
      return {
        eventoA: null,
        eventoB: eB ?? null,
        mayor: eB!.nombre_del_evento,
        diferencia: eB!.total_de_eventos,
        mensaje: `No encontré "${eventoA}", solo "${eB!.nombre_del_evento}" con ${eB!.total_de_eventos} casos.`,
      };
    }
    if (!eB) {
      return {
        eventoA: eA ?? null,
        eventoB: null,
        mayor: eA.nombre_del_evento,
        diferencia: eA.total_de_eventos,
        mensaje: `No encontré "${eventoB}", solo "${eA.nombre_del_evento}" con ${eA.total_de_eventos} casos.`,
      };
    }
    const diff = Math.abs(eA.total_de_eventos - eB.total_de_eventos);
    const mayor =
      eA.total_de_eventos > eB.total_de_eventos
        ? eA.nombre_del_evento
        : eB.nombre_del_evento;
    const menor =
      eA.total_de_eventos > eB.total_de_eventos
        ? eB.nombre_del_evento
        : eA.nombre_del_evento;
    const mensaje = `${mayor} tiene ${diff} casos más que ${menor}.`;
    return {
      eventoA: eA ?? null,
      eventoB: eB ?? null,
      mayor,
      diferencia: diff,
      mensaje,
    };
  }

  /**
   * Eventos con mayor incidencia en un grupo etario específico
   * @param grupo 'primera_infancia' | 'infancia' | 'adolescencia' | 'juventud' | 'adulto_j_ven' | 'adulto_mayor'
   * Preguntas: "¿Qué enfermedad afecta más a los adolescentes?", "Principal causa en adultos mayores"
   */
  public async eventoPrincipalPorGrupoEtario(
    grupo: keyof Pick<
      HealthEvent,
      | 'primera_infancia'
      | 'infancia'
      | 'adolescencia'
      | 'juventud'
      | 'adulto_j_ven'
      | 'adulto_mayor'
    >,
  ): Promise<HealthEvent | null> {
    await this.ensureReady();
    if (this.events.length === 0) return null;
    return this.events.reduce(
      (max, e) => (e[grupo] > max[grupo] ? e : max),
      this.events[0],
    );
  }

  /**
   * Porcentaje de casos por sexo a nivel global (todos los eventos sumados)
   * Preguntas: "¿En general hay más casos en mujeres u hombres?", "Proporción global por sexo"
   */
  public async proporcionSexoGlobal(): Promise<{
    femenino: number;
    masculino: number;
    total: number;
    pctFem: number;
    pctMasc: number;
  }> {
    await this.ensureReady();
    const totalF = this.events.reduce((sum, e) => sum + e.femenino, 0);
    const totalM = this.events.reduce((sum, e) => sum + e.masculino, 0);
    const total = totalF + totalM;
    return {
      femenino: totalF,
      masculino: totalM,
      total,
      pctFem: total ? (totalF / total) * 100 : 0,
      pctMasc: total ? (totalM / total) * 100 : 0,
    };
  }

  /**
   * Eventos con mayor diferencia absoluta entre sexos (brecha de género)
   * Preguntas: "¿Qué enfermedad tiene más diferencia entre hombres y mujeres?", "Evento más desbalanceado por sexo"
   */
  public async eventosMayorBrechaSexo(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .sort(
        (a, b) =>
          Math.abs(b.femenino - b.masculino) -
          Math.abs(a.femenino - a.masculino),
      )
      .slice(0, n);
  }

  /**
   * Eventos ordenados por su incidencia en adultos jóvenes (20-49 años)
   * Preguntas: "¿Qué eventos afectan más a adultos jóvenes?", "Principal problema de salud en adultos"
   */
  public async eventosMasAdultosJovenes(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .sort((a, b) => b.adulto_j_ven - a.adulto_j_ven)
      .slice(0, n);
  }

  /**
   * Eventos con mayor incidencia en adultos mayores (50+)
   * Preguntas: "¿Qué enfermedades son más comunes en ancianos?", "Riesgos para adultos mayores"
   */
  public async eventosMasAdultosMayores(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .sort((a, b) => b.adulto_mayor - a.adulto_mayor)
      .slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // Formateo y procesamiento de preguntas (legado)
  // ---------------------------------------------------------------------------
  public _formatearRespuesta(
    datos: any,
    tipo: string,
  ): { contenido: string; encontrado: boolean } {
    if (datos.error)
      return { contenido: `⚠️ ${datos.error}`, encontrado: true };
    switch (tipo) {
      case 'detalle': {
        const e = datos.evento;
        return {
          contenido: `--- DETALLE: ${e.nombre_del_evento || 'N/A'} ---
👥 **Casos Totales:** ${e.total_de_eventos || 0}
📍 **Distribución Zona:** ${e.urbano || 0} Urbano / ${e.rural || 0} Rural
👥 **Distribución Sexo:** ${e.femenino || 0} Mujeres / ${e.masculino || 0} Hombres`,
          encontrado: true,
        };
      }
      default:
        return { contenido: '', encontrado: false };
    }
  }

  /**
   * Procesa una pregunta en lenguaje natural y devuelve el evento correspondiente (primera coincidencia)
   * Preguntas: "¿Qué me dices del dengue?", "Casos de violencia intrafamiliar"
   */
  public async procesarPregunta(
    texto: string,
  ): Promise<{ contenido?: string; evento?: any; encontrado: boolean }> {
    await this.ensureReady();
    const norm = this.normalizeText(texto);
    const sinonimos: Record<string, string> = {
      dengue: 'DENGUE',
      'fiebre del dengue': 'DENGUE',
      varicela: 'VARICELA INDIVIDUAL',
      mordeduras:
        'AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA',
      'violencia de genero':
        'VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR',
      zika: 'ZIKA',
      desnutricion: 'DESNUTRICION AGUDA EN MENORES DE 5 AÑOS',
      ansiedad: 'ANSIEDAD',
      fluorosis: 'FLUOROSIS',
      'accidente laboral': 'ACCIDENTE DE TRABAJO',
      intoxicacion: 'INTOXICACIONES',
      hepatitis: 'HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA',
      parotiditis: 'PAROTIDITIS',
      depresion: 'DEPRESIÓN',
      suicidio: 'INTENTO DE SUICIDIO',
      vih: 'VIH/SIDA - MORTALIDAD POR SIDA',
      cancer: 'CÁNCER DE LA MAMA Y CUELLO UTERINO',
      'defectos de nacimiento': 'DEFECTOS CONGENITOS',
      vibora: 'ACCIDENTE OFIDICO',
      chikungunya: 'CHIKUNGUYA',
      tuberculosis: 'TUBERCULOSIS',
      malaria: 'MALARIA',
      'tos ferina': 'TOS FERINA',
      chagas: 'CHAGAS',
      spa: 'CONSUMO DE SPA',
      drogas: 'CONSUMO DE SPA',
      lesiones: 'LESIONES DE CAUSA EXTERNA',
      'eventos adversos': 'EVENTO ADVERSO SEGUIDO A LA VACUNACION',
      eta: 'ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)',
      sifilis: 'SIFILIS GESTACIONAL',
      'mortalidad materna': 'MORTALIDAD MATERNA',
      'mortalidad perinatal': 'MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA',
      'bajo peso': 'BAJO PESO AL NACER',
    };
    let eventoBuscado = '';
    for (const [sinonimo, nombreTecnico] of Object.entries(sinonimos)) {
      if (norm.includes(this.normalizeText(sinonimo))) {
        eventoBuscado = nombreTecnico;
        break;
      }
    }
    if (!eventoBuscado) {
      const eventos = await this.buscarEventosAmbigua(norm);
      if (eventos.length > 0) eventoBuscado = eventos[0].nombre_del_evento;
    }
    if (eventoBuscado) {
      const evento = await this.obtenerEventoUnico(eventoBuscado);
      if (evento) return { evento, encontrado: true };
    }
    return { encontrado: false };
  }

  // obtiene más eventos de la categoria infecciosos ordenados por total de casos descendente
  public async eventosInfecciososMasComunes(n = 5): Promise<HealthEvent[]> {
    await this.ensureReady();
    const infecciosos = await this.eventosPorCategoria('infecciosos');
    return [...infecciosos]
      .sort((a, b) => b.total_de_eventos - a.total_de_eventos)
      .slice(0, n);
  }

  // obtiene más Eventos de Salud que afectan a las mujeres
  async eventosMasAfectanMujeres(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .filter((e) => e.femenino + e.masculino > 0)
      .sort(
        (a, b) =>
          b.femenino / (b.femenino + b.masculino) -
          a.femenino / (a.femenino + a.masculino),
      )
      .slice(0, n);
  }

  // Obtiene mas Eventos que Afectan a los hombres
  async eventosMasAfectanHombres(n = 3): Promise<HealthEvent[]> {
    await this.ensureReady();
    return [...this.events]
      .filter((e) => e.femenino + e.masculino > 0)
      .sort(
        (a, b) =>
          b.masculino / (b.femenino + b.masculino) -
          a.masculino / (a.femenino + a.masculino),
      )
      .slice(0, n);
  }
}
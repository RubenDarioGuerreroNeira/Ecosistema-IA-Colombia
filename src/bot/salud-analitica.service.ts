import { Injectable } from '@nestjs/common';
import { SaludPublicaService } from './salud-publica.service';
import { VaccinationService } from './vaccination.service';

@Injectable()
export class SaludAnaliticaService {
  constructor(
    private readonly saludPublicaService: SaludPublicaService,
    private readonly vaccinationService: VaccinationService
  ) {}

  /**
   * Genera un análisis de riesgo mejorado incluyendo datos de vacunación.
   */
  public async analizarRiesgoEvento(nombreEvento: string, departamento: string = 'Antioquia'): Promise<string> {
    const eventos = this.saludPublicaService.buscarEventosAmbigua(nombreEvento);
    if (eventos.length === 0) return '⚠️ No tengo suficientes datos para analizar el riesgo de este evento.';

    const e = eventos[0];
    const total = e.total_de_eventos;
    if (total === 0) return 'ℹ️ Este evento no registra casos actualmente.';

    let alerta = `--- ANÁLISIS DE RIESGO: ${e.nombre_del_evento} ---\n`;
    const indicadores: string[] = [];

    // 1. Análisis de Zona (Rural vs Urbano)
    const pctRural = (e.rural / total) * 100;
    if (pctRural > 60) {
      indicadores.push('🚨 Alta concentración en zona RURAL.');
    } else if (pctRural > 40) {
      indicadores.push('⚠️ Distribución equilibrada.');
    }

    // 2. Análisis por Ciclo de Vida
    const casosInfantiles = e.primera_infancia + e.infancia;
    const pctInfantil = (casosInfantiles / total) * 100;
    if (pctInfantil > 50) {
      indicadores.push('🚨 Alta incidencia en población INFANTIL.');
    }

    // 3. Integración de Datos de Vacunación (Asincrónico)
    try {
        const mapeoEventoVacuna: Record<string, string> = {
            'tuberculosis': 'bcg',
            'varicela individual': 'varicela',
            'tos ferina': 'tos ferina',
            'hepatitis b, c y coinfección hepatitis b y delta': 'hepatitis',
            'agresiones por animales potencialmente transmisores de rabia': 'rabia',
            'dengue': 'dengue',
            'zika': 'zika'
        };

        const coberturas = await this.vaccinationService.getCoverageByDepartment(departamento);
        
        const terminoBusqueda = mapeoEventoVacuna[nombreEvento.toLowerCase()] || nombreEvento.toLowerCase();
        
        const coberturaRelevante = coberturas.find(c => 
            c.biol_gico.toLowerCase().includes(terminoBusqueda)
        );

        if (coberturaRelevante) {
            const val = parseFloat(coberturaRelevante.cobertura_de_vacunaci_n);
            // Manejo de casos donde la cobertura es una cantidad total (caso atlÃ¡ntico 10379) en lugar de porcentaje
            const esPorcentaje = val <= 100;
            const textoCobertura = esPorcentaje ? `${val}%` : `${val} dosis`;
            
            if (esPorcentaje && val < 80) {
                indicadores.push(`🚨 Cobertura de vacunación baja en ${departamento} (${textoCobertura}).`);
            } else {
                indicadores.push(`✅ Cobertura de vacunación registrada en ${departamento} (${textoCobertura}).`);
            }
        } else {
            indicadores.push('ℹ️ No hay datos de vacunación específicos para este evento.');
        }
    } catch (e) {
        indicadores.push('ℹ️ No se pudieron consultar datos de vacunación actuales.');
    }

    // Resumen
    if (indicadores.length > 0) {
      alerta += indicadores.join('\n');
    } else {
      alerta += '✅ Los indicadores actuales no muestran alertas críticas.';
    }

    return alerta;
  }
}

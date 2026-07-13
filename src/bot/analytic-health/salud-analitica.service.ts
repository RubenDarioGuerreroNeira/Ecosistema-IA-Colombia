import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccination } from '../../entities/vaccination.entity';
import { Result, Ok, Err } from '../../interfaces/result';

@Injectable()
export class SaludAnaliticaService {
  private readonly logger = new Logger(SaludAnaliticaService.name);

  constructor(
    @InjectRepository(Vaccination)
    private readonly vaccinationRepo: Repository<Vaccination>,
  ) {
    this.logger.log('SaludAnaliticaService initialized');
  }

  // Analiza el riesgo de un evento de salud en una región
  async analizarRiesgoEvento(evento: string, region: string): Promise<string> {
    try {
      // Normalizar parámetros
      const eventoNorm = evento.toLowerCase().trim();
      const regionNorm = region.toLowerCase().trim();

      // Buscar datos de vacunación para la región
      const vacRows = await this.vaccinationRepo
        .createQueryBuilder('v')
        .where('LOWER(v.departamento) LIKE :region OR LOWER(v.indicator1) LIKE :region', {
          region: `%${regionNorm}%`
        })
        .getMany();

      const coverageAvg = vacRows.length > 0
        ? vacRows.reduce((sum, r) => sum + (parseFloat(r.cobertura_de_vacunaci_n as any) || 0), 0) / vacRows.length
        : 0;

      // Determinar nivel de riesgo basado en cobertura
      let riesgoLevel = 'BAJO';
      let emoji = '🟢';
      if (coverageAvg < 50) {
        riesgoLevel = 'ALTO';
        emoji = '🔴';
      } else if (coverageAvg < 70) {
        riesgoLevel = 'MEDIO';
        emoji = '🟡';
      }

      return `${emoji} **Análisis de Riesgo - ${evento}**

📍 **Región:** ${region}
💉 **Cobertura vacunal promedio:** ${coverageAvg.toFixed(2)}%
📊 **Nivel de riesgo:** ${riesgoLevel}

${coverageAvg < 50 ? '⚠️ La cobertura de vacunación es baja, lo que puede indicar mayor vulnerabilidad al evento.' : 'La cobertura de vacunación es adecuada, disminuyendo la vulnerabilidad.'}`;
    } catch (error) {
      this.logger.error(`Error analizando riesgo: ${error.message}`);
      return `⚠️ No se pudo analizar el riesgo para el evento ${evento} en ${region}.`;
    }
  }

  // Calcula correlación entre evento de salud y cobertura de vacunación
  async calcularCorrelacion(evento: string, region: string): Promise<Result<number>> {
    try {
      // Placeholder para cálculo real de correlación
      // En una implementación completa, compararía casos del evento con cobertura de vacuna
      const correlation = 0.75; // Valor simulado
      return Ok(correlation);
    } catch (error) {
      this.logger.error(`Error calculando correlación: ${error.message}`);
      return Err(`Error calculando correlación: ${error.message}`);
    }
  }
}
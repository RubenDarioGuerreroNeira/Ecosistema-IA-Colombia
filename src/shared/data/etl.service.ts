import { Injectable } from '@nestjs/common';
import { HealthDataService } from '../../bot/health-data.service';
import { EnvironmentalService } from '../../bot/environmental/environmental.service';
import { VaccinationService } from '../../bot/vaccination/vaccination.service';

@Injectable()
export class EtlService {
  constructor(
    private readonly healthData: HealthDataService,
    private readonly environmental: EnvironmentalService,
    private readonly vaccination: VaccinationService,
  ) {}

  async transformHealthData() {
    const healthEvents = await this.healthData.getAllEvents();
    
    const enrichedData = await Promise.all(
      healthEvents.map(async (event) => {
        const geoCode = event.codigo_georeferencia;
        const date = new Date(event.fecha_reporte);
        
        const [envData, vaccData] = await Promise.all([
          this.environmental.getDataByLocation(geoCode, date),
          this.vaccination.getCoverageByLocation(geoCode, date),
        ]);

        return {
          ...event,
          environmental: envData,
          vaccination: vaccData,
        };
      })
    );

    return enrichedData;
  }

  async prepareTrainingData(eventName: string) {
    const rawData = await this.transformHealthData();
    
    return rawData
      .filter((e) => e.nombre_del_evento.includes(eventName))
      .map((e) => ({
        date: new Date(e.fecha_reporte),
        cases: e.total_de_eventos,
        temperature: e.environmental.temperatura,
        humidity: e.environmental.humedad,
        precipitation: e.environmental.precipitacion,
        vaccinationRate: e.vaccination.cobertura,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

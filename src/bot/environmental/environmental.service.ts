import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

interface EnvironmentalData {
  fecha: Date;
  temperatura: number;
  humedad: number;
  precipitacion: number;
}

@Injectable()
export class EnvironmentalService {
  constructor(private httpService: HttpService) {}

  private cache = new Map<string, EnvironmentalData[]>();

  async getDataByLocation(
    codigoGeoreferencia: string,
    date: Date,
  ): Promise<EnvironmentalData> {
    const cacheKey = `${codigoGeoreferencia}-${date.toISOString().split('T')[0]}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)![0];
    }

    try {
      // Simulación - en producción conectar con API del IDEAM
      const mockData: EnvironmentalData = {
        fecha: date,
        temperatura: 20 + Math.random() * 15,
        humedad: 60 + Math.random() * 30,
        precipitacion: Math.random() > 0.7 ? Math.random() * 20 : 0,
      };

      this.cache.set(cacheKey, [mockData]);
      return mockData;

    } catch (error) {
      console.error('Error fetching environmental data:', error);
      throw new Error('Failed to get environmental data');
    }
  }
}

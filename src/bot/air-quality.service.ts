import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AirQualityService {
  private readonly apiUrl = 'https://www.datos.gov.co/resource/kekd-7v7h.json';

  async getAirQualityByMunicipio(municipio: string): Promise<any> {
    try {
      // Usamos el parámetro '$where' para filtrar por municipio o departamento en la API Socrata
      const response = await axios.get(this.apiUrl, {
        params: {
          $where: `nombre_del_municipio like '%${municipio.toUpperCase()}%' OR nombre_del_departamento like '%${municipio.toUpperCase()}%'`,
          $limit: 10,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching air quality for ${municipio}:`, error);
      return null;
    }
  }
}

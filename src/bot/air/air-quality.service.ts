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
      console.log(`[DEBUG] Searching air quality for: ${municipio.toUpperCase()}`);
      console.log(`[DEBUG] Found ${response.data?.length || 0} records`);
      if (response.data?.length > 0) {
        console.log(`[DEBUG] Sample record:`, response.data[0]);
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching air quality for ${municipio}:`, error);
      return null;
    }
  }

  async getAllMunicipios(): Promise<string[]> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          $select: 'DISTINCT nombre_del_municipio, nombre_del_departamento',
          $limit: 100,
        },
      });
      const municipios: string[] = response.data.map(m => m.nombre_del_municipio).filter(Boolean);
      return [...new Set(municipios)].sort();
    } catch (error) {
      console.error(`Error fetching air quality for all municipios:`, error);
      return [];
    }
  }

  async getAllDepartamentos(): Promise<string[]> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          $select: 'DISTINCT nombre_del_departamento',
          $limit: 100,
        },
      });
      const deptos: string[] = response.data.map(m => m.nombre_del_departamento).filter(Boolean);
      return [...new Set(deptos)].sort();
    } catch (error) {
      console.error(`Error fetching air quality for all departamentos:`, error);
      return [];
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AirQualityService } from './air-quality.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AirQualityService', () => {
  let service: AirQualityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AirQualityService],
    }).compile();

    service = module.get<AirQualityService>(AirQualityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return data when API call is successful', async () => {
    const mockData = [{ municipio: 'BOGOTA', pm25: 15 }];
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });

    const result = await service.getAirQualityByMunicipio('bogota');
    
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.datos.gov.co/resource/kekd-7v7h.json',
      expect.objectContaining({
        params: expect.objectContaining({
          $where: "nombre_del_municipio like '%BOGOTA%' OR nombre_del_departamento like '%BOGOTA%'",
        }),
      }),
    );
  });

  it('should return null when API call fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API error'));

    const result = await service.getAirQualityByMunicipio('bogota');
    
    expect(result).toBeNull();
  });
});

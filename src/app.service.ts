import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): any {
    return {
      name: 'Salud IA Bot Colombia',
      status: 'online',
      timestamp: new Date().toISOString(),
      message: 'Service is running successfully',
    };
  }

  getPing(): any {
    return {
      status: 'ok',
      ping: 'pong'
    };
  }
}

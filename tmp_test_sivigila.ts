
import { SaludPublicaService } from './src/bot/salud-publica.service';
import * as fs from 'fs';

// Mocking some parts if needed, but let's try to run it directly with ts-node if possible
// Actually, I'll just write a simple script that I can run with node or ts-node.
// Since it's a NestJS app, I'll just try to use a simple node script.

async function test() {
    const service = new SaludPublicaService();
    // Wait for data to load (since it's async in constructor)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = service.procesarPregunta("Analizar riesgo de tuberculosis en Cali");
    console.log('Result:', JSON.stringify(result, null, 2));
}

test();

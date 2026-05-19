const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { BoyacaHealthService } = require(path.join(projectRoot, 'dist/bot/boyaca-health.service.js'));
(async () => {
  const svc = new BoyacaHealthService();
  await svc.onModuleInit();
  const results = svc.searchProviders('tunja');
  console.log('FOUND', results.length);
  results.slice(0,8).forEach((p,i)=>{
    console.log(`\n#${i+1}`);
    console.log('Nombre sede:', p.nombre_de_sede || p.razon_social || 'N/A');
    console.log('Municipio:', p.municipio || 'N/A');
    console.log('Dirección:', p.direccion || 'N/A');
    console.log('Teléfono:', p.telefono || 'N/A');
    console.log('Email:', p.email || 'N/A');
    console.log('Nivel:', p.nivel || 'N/A');
  });
})();

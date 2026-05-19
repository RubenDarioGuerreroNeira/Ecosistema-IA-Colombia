const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { BoyacaHealthService } = require(path.join(projectRoot, 'dist/bot/boyaca-health.service.js'));
(async () => {
  const boyaca = new BoyacaHealthService();
  await boyaca.onModuleInit();
  const query = 'me puedes mostrar info sobre hospitales en tunja ? Los datos para Tunja están en fase de actualización técnica.';
  const queryLower = query.toLowerCase();
  const normalize = (s) => s.normalize('NFD').replace(/[-\u036f]/g, '').toLowerCase();
  const normalizedQuery = normalize(queryLower);
  const boyacaMunicipios = boyaca.getMunicipios();
  const matchedBoyacaMunicipios = boyacaMunicipios.filter((m) => normalizedQuery.includes(normalize(m)));
  console.log('normalizedQuery:', normalizedQuery);
  console.log('has tunja raw:', queryLower.includes('tunja'));
  console.log('has tunja normalized:', normalizedQuery.includes('tunja'));
  console.log('matchedBoyacaMunicipios length:', matchedBoyacaMunicipios.length);
  console.log('matchedBoyacaMunicipios sample:', matchedBoyacaMunicipios.slice(0,20));
})();

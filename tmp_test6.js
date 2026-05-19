const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { BoyacaHealthService } = require(path.join(projectRoot, 'dist/bot/boyaca-health.service.js'));
const { StatsService } = require(path.join(projectRoot, 'dist/bot/stats/stats.service.js'));
const orig = StatsService.prototype.getSummary;
StatsService.prototype.getSummary = async function(query) {
  const queryLower = query.toLowerCase();
  const normalize = (s) => s.normalize('NFD').replace(/[-\u036f]/g, '').toLowerCase();
  const normalizedQuery = normalize(queryLower);
  const boyacaKeywords = ['boyaca', 'boyacá'];
  const boyacaMunicipios = this.boyacaHealthService.getMunicipios();
  const matchedBoyacaMunicipios = boyacaMunicipios.filter((m) => normalizedQuery.includes(normalize(m)));
  console.log('DEBUG getSummary matchedBoyacaMunicipios length:', matchedBoyacaMunicipios.length);
  console.log('DEBUG sample:', matchedBoyacaMunicipios.slice(0,20));
  return orig.call(this, query);
};
(async () => {
  const boyaca = new BoyacaHealthService();
  await boyaca.onModuleInit();
  const stats = new StatsService(
    { getAllEvents: async () => [] },
    { getAllDiagnoses: async () => [] },
    { getTopDiseasesRanking: () => 'top' },
    { getMentalHealthLifeCycleAnalysis: () => 'mental' },
    { getSexualHealthCoverage: () => 'sexual' },
    { getMunicipios: () => ['medellín'], searchProviders: () => [] },
    boyaca,
  );
  const summary = await stats.getSummary('me puedes mostrar info sobre hospitales en tunja ? Los datos para Tunja están en fase de actualización técnica.');
  console.log('Summary length', summary.length);
})();

const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { BoyacaHealthService } = require(path.join(projectRoot, 'dist/bot/boyaca-health.service.js'));
const { StatsService } = require(path.join(projectRoot, 'dist/bot/stats/stats.service.js'));
const origGetSummary = StatsService.prototype.getSummary;
const origBuild = StatsService.prototype.buildProviderResponse;
StatsService.prototype.getSummary = async function(query) {
  const queryLower = query.toLowerCase();
  const normalize = (s) => s.normalize('NFD').replace(/[-\u036f]/g, '').toLowerCase();
  const normalizedQuery = normalize(queryLower);
  const boyacaKeywords = ['boyaca', 'boyacá'];
  const boyacaMunicipios = this.boyacaHealthService.getMunicipios();
  const matchedBoyacaMunicipios = boyacaMunicipios.filter((m) => normalizedQuery.includes(normalize(m)));
  console.log('DBG getSummary matchedBoyacaMunicipios len', matchedBoyacaMunicipios.length);
  console.log('DBG getSummary matchedBoyacaMunicipios sample', matchedBoyacaMunicipios.slice(0,10));
  return origGetSummary.call(this, query);
};
StatsService.prototype.buildProviderResponse = function(municipios, searchFn, regionName) {
  console.log('DBG buildProviderResponse municipios len', municipios.length);
  console.log('DBG buildProviderResponse municipios', municipios);
  return origBuild.call(this, municipios, searchFn, regionName);
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
  console.log('SUMMARY PREFIX', summary.slice(0,100));
})();

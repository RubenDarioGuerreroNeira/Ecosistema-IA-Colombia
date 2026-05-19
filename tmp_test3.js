const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { BoyacaHealthService } = require(path.join(projectRoot, 'dist/bot/boyaca-health.service.js'));
const { StatsService } = require(path.join(projectRoot, 'dist/bot/stats/stats.service.js'));
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
  console.log(summary);
})();

const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { StatsService } = require(path.join(projectRoot, 'dist/bot/stats/stats.service.js'));
console.log(StatsService.prototype.getSummary.toString().slice(0,1200));

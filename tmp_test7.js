const path = require('path');
const projectRoot = path.resolve('e:/Proyectos a Desarrollar/Concurso IA Colombia/salud-ia-bot');
const { StatsService } = require(path.join(projectRoot, 'dist/bot/stats/stats.service.js'));
const src = StatsService.prototype.getSummary.toString();
const idx = src.indexOf('const isBoyacaQuery');
console.log(src.slice(idx, idx+450));

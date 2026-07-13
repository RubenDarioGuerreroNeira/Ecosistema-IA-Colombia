import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { VaccinationService } from '../vaccination.service';
import { I18nProvider } from '../../shared/i18n/i18n.provider';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class VaccinationHandler {
    private readonly logger = new Logger(VaccinationHandler.name);

    constructor(
        private readonly vaccinationService: VaccinationService,
        private readonly i18n: I18nProvider,
    ) { }

    /**
     * Procesa consultas de vacunación y envía respuestas al usuario.
     */
    async handle(ctx: Context, text: string, detectedRegion?: string): Promise<boolean> {
        const userId = ctx.from?.id;
        const norm = normalizeString(text);

        // Evitar que consultas sobre prestadores/hospitales entren en el manejador de vacunación
        if (
            norm.includes('hospital') ||
            norm.includes('hospitales') ||
            norm.includes('clinica') ||
            norm.includes('clinicas') ||
            norm.includes('cliníca') ||
            norm.includes('clínicas')
        ) {
            this.logger.log('VaccinationHandler - consulta sobre prestadores detectada, saltando manejador de vacunación');
            return false;
        }

        try {
            // Pregunta general sobre vacunación
            if (norm.includes('vacunacion') || norm.includes('vacunación') || norm.includes('informacion sobre vacunas')) {
                return await this.handleGeneralQuery(ctx, text, detectedRegion, norm, userId);
            }

            this.logger.log(`VaccinationHandler - No se detectó consulta válida`);
            return false;
        } catch (error) {
            this.logger.error(`Error en VaccinationHandler: ${error.message}`);
            await ctx.reply(this.i18n.translate('error_generic', userId));
            return true;
        }
    }

    private async handleGeneralQuery(ctx: Context, text: string, detectedRegion?: string, norm?: string, userId?: number): Promise<boolean> {
        const n = norm || normalizeString(text);


        // lo que no se cumple
        if (
            n.includes('hospitales') && n.includes('yopal') ||
            n.includes('hospitales') && n.includes('medellin') ||
            n.includes('hospitales') && n.includes('antioquia') ||
            n.includes('hospitales') && n.includes('yopal')

        ) {
            return false;
        }

        // Indicadores disponibles por departamento
        if (n.includes('indicadores') && n.includes('vacunacion') && (n.includes('departamento') || n.includes('municipio'))) {
            return await this.handleIndicatorsQuery(ctx, text, userId);
        }

        // Top departamentos por cobertura
        if (n.includes('top') && n.includes('vacunacion')) {
            return await this.handleTopDepartments(ctx, userId);
        }

        // Filtro por tipo biológico
        if (n.includes('biolog') || n.includes('tipo biol')) {
            return await this.handleBiologicoFilter(ctx, text, userId);
        }

        // Búsqueda por criterios múltiples
        if (n.includes('filtra') || n.includes('filtro') || n.includes('buscar') || n.includes('criterios')) {
            return await this.handleFlexibleSearch(ctx, text, userId);
        }

        // Resumen por año
        if (n.includes('resumen') && n.includes('vacunacion')) {
            return await this.handleSummary(ctx, userId);
        }

        // Ubicaciones disponibles
        if (n.includes('municipios') || n.includes('departamentos')) {
            return await this.handleLocations(ctx, userId);
        }

        // Indicadores altos/bajos
        if (n.includes('indicadores') && n.includes('altos') || n.includes('bajos')) {
            return await this.handleIndicatorsHighLow(ctx, text, detectedRegion, userId);
        }

        // Cobertura por región detectada
        if (detectedRegion) {
            return await this.handleCoverageByRegion(ctx, detectedRegion, userId);
        }

        // Pregunta general
        const available = await this.vaccinationService.getAvailabeQuestions();
        await ctx.reply(available, { parse_mode: 'Markdown' });
        return true;
    }

    private async handleIndicatorsQuery(ctx: Context, text: string, userId?: number): Promise<boolean> {
        const norm = normalizeString(text);
        let region: string | undefined;

        if (norm.includes('departamento')) {
            const match = text.match(/departamento(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
            region = match?.[1]?.trim();
            if (!region) {
                await ctx.reply('📍 ¿Para qué departamento deseas consultar los indicadores?');
                return true;
            }
            const indicators = await this.vaccinationService.getAvailableIndicatorsByDepartment(region);
            const response = `📊 **Indicadores de vacunación en ${region}:**\n\n${indicators.map(i => `• ${i}`).join('\n')}`;
            await ctx.reply(response, { parse_mode: 'Markdown' });
            return true;
        }

        if (norm.includes('municipio')) {
            const match = text.match(/municipio(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
            region = match?.[1]?.trim();
            if (!region) {
                await ctx.reply('📍 ¿Para qué municipio deseas consultar los indicadores?');
                return true;
            }
            const indicators = await this.vaccinationService.getAvailableIndicatorsByMunicipio(region);
            const response = `📊 **Indicadores de vacunación en ${region}:**\n\n${indicators.map(i => `• ${i}`).join('\n')}`;
            await ctx.reply(response, { parse_mode: 'Markdown' });
            return true;
        }

        return false;
    }

    private async handleTopDepartments(ctx: Context, userId?: number): Promise<boolean> {
        const topDepts = await this.vaccinationService.getTopDepartmentsByCoverage();
        if (topDepts && topDepts.length > 0) {
            const response = `🏆 **Top 5 Departamentos por Cobertura de Vacunación:**\n\n${topDepts.map((d, i) => `${i + 1}. **${d.departamento}**: ${d.cobertura_de_vacunaci_n}%`).join('\n')}`;
            await ctx.reply(response, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }

    private async handleBiologicoFilter(ctx: Context, text: string, userId?: number): Promise<boolean> {
        const match = text.match(/(?:biol[oó]gico(?:s)?(?:\s+de)?\s*[:\-]?\s*|vacunas?\s+de\s+)([a-z0-9áéíóúñÁÉÍÓÚÑ\s]+)/i);
        const biologico = match?.[1]?.trim();
        if (!biologico || biologico.length < 2) {
            await ctx.reply('📍 ¿Cuál es el tipo biológico o vacuna que deseas filtrar?');
            return true;
        }

        const results = await this.vaccinationService.getVaccinationByBiologico(biologico);
        if (!results || results.length === 0) {
            await ctx.reply(`No encontré registros de vacunación para el biológico "${biologico}".`);
            return true;
        }

        const response = `💉 **Vacunación filtrada por biológico: ${biologico}**\n\n${results.slice(0, 10).map(r => `• ${r.departamento}: ${r.cobertura_de_vacunaci_n}% (${r.biol_gico})`).join('\n')}`;
        await ctx.reply(response, { parse_mode: 'Markdown' });
        return true;
    }

    private async handleFlexibleSearch(ctx: Context, text: string, userId?: number): Promise<boolean> {
        const criteria: { departamento?: string; municipio?: string; biologico?: string; year?: string } = {};

        const deptMatch = text.match(/departamento(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
        const muniMatch = text.match(/municipio(?:\s+de)?\s+([a-záéíóúñÁÉÍÓÚÑ\s]+)/i);
        const biologicoMatch = text.match(/(?:biol[oó]gico(?:s)?(?:\s+de)?\s*[:\-]?\s*|vacunas?\s+de\s+)([a-z0-9áéíóúñÁÉÍÓÚÑ\s]+)/i);
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);

        if (deptMatch?.[1]) criteria.departamento = deptMatch[1].trim();
        if (muniMatch?.[1]) criteria.municipio = muniMatch[1].trim();
        if (biologicoMatch?.[1]) criteria.biologico = biologicoMatch[1].trim();
        if (yearMatch?.[0]) criteria.year = yearMatch[0];

        if (Object.keys(criteria).length === 0) {
            await ctx.reply('📍 ¿Qué criterios quieres usar para la búsqueda? (departamento, municipio, tipo biológico o año)');
            return true;
        }

        const results = await this.vaccinationService.searchVaccinationData(criteria);
        if (!results || results.length === 0) {
            await ctx.reply('No encontré resultados con los criterios indicados.');
            return true;
        }

        const response = `🔎 **Búsqueda de vacunación**\n\n${results.slice(0, 10).map(r => `• ${r.departamento} / ${r.indicator1}: ${r.cobertura_de_vacunaci_n}%`).join('\n')}`;
        await ctx.reply(response, { parse_mode: 'Markdown' });
        return true;
    }

    private async handleSummary(ctx: Context, userId?: number): Promise<boolean> {
        const summary = await this.vaccinationService.getCoverageSummary();
        await ctx.reply(summary, { parse_mode: 'Markdown' });
        return true;
    }

    private async handleLocations(ctx: Context, userId?: number): Promise<boolean> {
        const deptos = await this.vaccinationService.getAllDepartament();
        const municipios = await this.vaccinationService.getAllMunicipios();
        const response = `💉 **Ubicaciones disponibles:**\n\n**Departamentos:** ${deptos.slice(0, 10).join(', ')}\n\n**Municipios:** ${municipios.slice(0, 10).join(', ')}`;
        await ctx.reply(response, { parse_mode: 'Markdown' });
        return true;
    }

    private async handleIndicatorsHighLow(ctx: Context, text: string, detectedRegion?: string, userId?: number): Promise<boolean> {
        // Placeholder - implementar según necesidades
        return false;
    }

    private async handleCoverageByRegion(ctx: Context, region: string, userId?: number): Promise<boolean> {
        const coverage = await this.vaccinationService.getCoverageByDepartment(region);
        if (coverage && coverage.length > 0) {
            const response = `💉 **Cobertura en ${region}:**\n\n${coverage.slice(0, 10).map(c => `${c.indicator1}: ${c.cobertura_de_vacunaci_n}%`).join('\n')}`;
            await ctx.reply(response, { parse_mode: 'Markdown' });
            return true;
        }
        return false;
    }
}
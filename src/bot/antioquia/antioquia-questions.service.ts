import { Injectable } from '@nestjs/common';
import { AntioquiaHealthService } from './antioquia-health.service';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class AntioquiaQuestionsService {
    constructor(private readonly antioquiaHealthService: AntioquiaHealthService) { }

    /**
     * Retorna las preguntas que el bot puede responder sobre Antioquia.
     * Muestra el menú de capacidades cuando el usuario pregunta "¿Qué información tienes de Antioquia?"
     */
    getAvailableQuestions(): string {
        return `🏥 **Preguntas que puedo responder sobre Antioquia:**

📍 **Búsqueda de prestadores:**
• "Buscar hospitales en Medellín"
• "¿Qué centros de salud hay en Bello?"
• "Prestadores de salud en Itagüí"
• "Clínicas en Envigado"

🔍 **Búsqueda por nombre:**
• "¿Dónde queda el Hospital General de Medellín?"
• "Información de la Clínica Las Vegas"
• "Buscar por NIT o código de habilitación"

📊 **Estadísticas:**
• "¿Cuántos prestadores hay en Antioquia?"
• "Lista de municipios con centros de salud"
• "Resumen de la red de salud de Antioquia"

🏢 **Por categoría:**
• "Hospitales en Antioquia"
• "Clínicas en Antioquia"
• "IPS en Antioquia"

✨ *Puedes preguntar con lenguaje natural y te ayudaré a encontrar la información que necesitas.*`;
    }

    /**
     * Detecta si una consulta es sobre qué información tiene el bot de Antioquia.
     * Resuelve la pregunta: "¿Qué información tienes de Antioquia?" / "¿Qué sabes de Antioquia?"
     */
    isKnowledgeQuery(text: string): boolean {
        const q = this.normalizeString(text);
        const knowledgePatterns = [
            'antioquia',
            'que sabes de antioquia',
            'que informacion tienes de antioquia',
            'que informacion hay sobre antioquia',
            'que servicios de salud hay en antioquia',
            'prestadores de salud en antioquia',
            'centros de salud en antioquia',
            'que puedes decirme de antioquia',
            'dime sobre antioquia',
            'salud en antioquia',
            'red de salud de antioquia',
            'servicios medicos en antioquia',
        ];
        return knowledgePatterns.some(pattern => q.includes(pattern));
    }

    /**
     * Procesa una consulta de texto sobre Antioquia y retorna una respuesta formateada.
     * Es el método principal que debe ser llamado desde bot.update.ts.
     *
     * Ruta de procesamiento:
     * 1. isKnowledgeQuery() → getAvailableQuestions()
     * 2. getMunicipios() → "¿Qué municipios tienes?"
     * 3. Búsqueda por código/NIT → findByIdentifier()
     * 4. Búsqueda general → searchProviders()
     */
    async processAntioquiaQuery(text: string): Promise<string | null> {
        const q = this.normalizeString(text);

        // ── [1] CONSULTA DE CONOCIMIENTO ─────────────────────────────────────────
        // Responde: "¿Qué sabes de Antioquia?", "¿Qué información tienes de Antioquia?"
        if (this.isKnowledgeQuery(text)) {
            return this.getAvailableQuestions();
        }

        // ── [2] LISTA DE MUNICIPIOS ───────────────────────────────────────────────
        // Responde: "¿Qué municipios tienes?", "Lista de municipios de Antioquia"
        if (
            q.includes('municipios') ||
            q.includes('municipio') ||
            q.includes('ciudades') ||
            q.includes('ciudad')
        ) {
            const municipios = await this.antioquiaHealthService.getMunicipios();
            if (municipios && municipios.length > 0) {
                const list = municipios.slice(0, 20).map(m => `• ${m}`).join('\n');
                return `📍 **Municipios de Antioquia con prestadores registrados (${municipios.length} total):**\n\n${list}${municipios.length > 20 ? '\n\n*... y ' + (municipios.length - 20) + ' municipios más.*' : ''}`;
            }
        }

        // ── [3] BÚSQUEDA POR IDENTIFICADOR (código/NIT) ──────────────────────────
        // Responde: "Buscar por código de habilitación", "Buscar por NIT"
        if (
            q.includes('codigo') ||
            q.includes('habilitacion') ||
            q.includes('nit') ||
            q.includes('identificador') ||
            /^\d{5,}$/.test(q.replace(/\s/g, ''))
        ) {
            const results = await this.antioquiaHealthService.findByIdentifier(text);
            if (results.length > 0) {
                const formatted = results.slice(0, 5)
                    .map(p => this.antioquiaHealthService.formatProviderResponse(p))
                    .join('\n\n');
                return `🔍 *Resultados para "${text}":*\n\n${formatted}`;
            }
        }

        // ── [4] BÚSQUEDA GENERAL ──────────────────────────────────────────────────
        // Responde cualquier otra consulta: "Buscar hospitales en Medellín", "Clínicas en Bello"
        const results = await this.antioquiaHealthService.searchProviders(text, 10);
        if (results.length > 0) {
            const unique = this.antioquiaHealthService['getUniqueProviders'](results).slice(0, 5);
            let response = '🔍 *Resultados de búsqueda en Antioquia:*\n\n';
            for (const p of unique) {
                response += this.antioquiaHealthService.formatProviderResponse(p) + '\n\n';
            }
            if (results.length > 5) {
                response += `*... y ${results.length - 5} resultados más.*`;
            }
            return response;
        }

        return null;
    }

    private normalizeString(value?: string): string {
        return (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[-\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }
}
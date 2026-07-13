import { Injectable, Logger } from '@nestjs/common';

export type SupportedLocale = 'es' | 'en';

interface Translations {
    [key: string]: {
        es: string;
        en: string;
    };
}

/**
 * Proveedor de internacionalización para el bot.
 * Permite mensajes en múltiples idiomas.
 */
@Injectable()
export class I18nProvider {
    private readonly logger = new Logger(I18nProvider.name);
    private readonly defaultLocale: SupportedLocale = 'es';
    private readonly userLocales = new Map<number, SupportedLocale>();

    // Traducciones básicas - expandir según necesidades
    private readonly translations: Translations = {
        welcome: {
            es: '¡Hola, {name}! 👋 Soy **Salud IA**, tu asistente de salud pública.',
            en: 'Hello, {name}! 👋 I am **Salud IA**, your public health assistant.'
        },
        no_info: {
            es: 'Lo siento, no tengo información sobre ese tema.',
            en: 'Sorry, I don\'t have information about that topic.'
        },
        typing_indicator: {
            es: '💭 Procesando tu consulta...',
            en: '💭 Processing your query...'
        },
        error_generic: {
            es: '⚠️ Ocurrió un error. Por favor, intenta de nuevo.',
            en: '⚠️ An error occurred. Please try again.'
        },
        coverage_not_found: {
            es: 'No se encontraron datos de vacunación para {region}.',
            en: 'No vaccination data found for {region}.'
        },
        indicators_available: {
            es: '📊 **Indicadores disponibles en {region}:**',
            en: '📊 **Available indicators in {region}**:'
        }
    };

    /**
     * Establece el idioma preferido por el usuario.
     */
    setUserLocale(userId: number, locale: SupportedLocale): void {
        this.userLocales.set(userId, locale);
    }

    /**
     * Obtiene el idioma del usuario o el idioma por defecto.
     */
    getUserLocale(userId?: number): SupportedLocale {
        if (userId && this.userLocales.has(userId)) {
            return this.userLocales.get(userId)!;
        }
        return this.defaultLocale;
    }

    /**
     * Traduce una clave al idioma del usuario.
     * @param key - Clave de traducción
     * @param userId - ID del usuario (opcional)
     * @param params - Parámetros para interpolación
     */
    translate(key: string, userId?: number, params?: Record<string, string>): string {
        const locale = this.getUserLocale(userId);
        const translation = this.translations[key];

        if (!translation) {
            this.logger.warn(`Traducción no encontrada: ${key}`);
            return key;
        }

        let result = translation[locale] || translation[this.defaultLocale];

        // Interpolación de parámetros
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                result = result.replace(new RegExp(`{${k}}`, 'g'), v);
            }
        }

        return result;
    }

    /**
     * Traduce y envía mensaje al usuario.
     */
    async replyWithTranslation(
        ctx: { reply: (text: string, opts?: any) => Promise<unknown> },
        key: string,
        userId?: number,
        params?: Record<string, string>
    ): Promise<void> {
        const locale = this.getUserLocale(userId);
        const translation = this.translations[key];

        if (!translation) {
            this.logger.warn(`Traducción no encontrada: ${key}`);
            return;
        }

        let result = translation[locale] || translation[this.defaultLocale];

        if (params) {
            for (const [k, v] of Object.entries(params)) {
                result = result.replace(new RegExp(`{${k}}`, 'g'), v);
            }
        }

        await ctx.reply(result, { parse_mode: 'Markdown' });
    }

    /**
     * Agrega nuevas traducciones.
     */
    addTranslations(newTranslations: Translations): void {
        Object.assign(this.translations, newTranslations);
    }
}
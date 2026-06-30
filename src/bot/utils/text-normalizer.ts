/**
 * Utilidades de normalización de texto reutilizables.
 * Centraliza la lógica de limpieza para evitar duplicación entre normalizeText y normalizeString.
 */

/**
 * Normaliza texto a minúsculas, elimina tildes, normaliza espacios y convierte 'k'→'c'.
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/k/g, 'c')
        .trim();
}

/**
 * Escapa caracteres especiales de Markdown para Telegram.
 */
export function escapeMarkdown(text: string): string {
    return text.toString().replace(/[_*\\~`>#+=|{}.!-]/g, '\\$&');
}
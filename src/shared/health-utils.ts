/**
 * Normaliza una cadena de texto a minúsculas, eliminando tildes, diacríticos y espacios innecesarios.
 */
export function normalizeString(str: string): string {
  return str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';
}

/**
 * Normaliza un NIT eliminando todo lo que no sea dígito.
 */
export function normalizeNit(nit: string): string {
  return nit ? nit.replace(/\D/g, '') : '';
}

/** Palabras vacías del español que se ignoran al tokenizar consultas de búsqueda */
export const STOPWORDS: ReadonlySet<string> = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'vos', 'vosotros', 'vosotras', 'ellos', 'ellas', 'nosotras', 'nosotros', 'aquí', 'allí', 'allá', 'acá', 'ahora', 'entonces', 'hoy', 'ayer', 'mañana'
]);

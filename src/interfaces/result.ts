/**
 * Contrato de resultado unificado para operaciones del dominio.
 * 
 * @template T - Tipo del valor exitoso
 * @template E - Tipo del error (default: string)
 * 
 * @example
 * // Éxito
 * const result: Result<User> = { success: true, data: user };
 * 
 * // Error
 * const result: Result<User, Error> = { success: false, error: 'Usuario no encontrado' };
 */
export interface Result<T, E = string> {
    /** Indica si la operación fue exitosa */
    success: boolean;
    /** Valor retornado en caso de éxito */
    data?: T;
    /** Mensaje de error en caso de fallo */
    error?: E;
}

/**
 * Crea un resultado exitoso.
 * @param data - Valor del resultado exitoso
 * @returns Result<T, E> con success: true
 */
export function Ok<T>(data: T): Result<T, never> {
    return { success: true, data };
}

/**
 * Crea un resultado de error.
 * @param error - Mensaje o entidad de error
 * @returns Result<never, E> con success: false
 */
export function Err<E = string>(error: E): Result<never, E> {
    return { success: false, error };
}
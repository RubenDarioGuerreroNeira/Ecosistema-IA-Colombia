import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Servicio genérico de validación de datos para entidades del dominio.
 * Utiliza class-validator para asegurar la integridad de los datos
 * antes de operaciones de lectura/escritura en repositories.
 */
@Injectable()
export class ValidationService {
    private readonly logger = new Logger(ValidationService.name);

    /**
     * Valida una instancia de entidad contra sus decoradores @IsString, @IsNumber, etc.
     * @param entity Instancia de la entidad a validar
     * @returns True si es válida, false si hay errores
     */
    async validateEntity<T>(entity: T): Promise<boolean> {
        try {
            const errors = await validate(entity as object);
            if (errors.length > 0) {
                const entityName = (entity as any)?.constructor?.name || 'entidad';
                this.logger.warn(
                    `Validación fallida para ${entityName}: ${JSON.stringify(errors)}`,
                );
                return false;
            }
            return true;
        } catch (error) {
            this.logger.error(`Error en validación de entidad: ${error.message}`);
            return false;
        }
    }

    /**
     * Valida y transforma un objeto plano a una entidad, aplicando validaciones.
     * @param classType Clase de la entidad
     * @param plainObject Objeto plano (ej: desde XML/JSON)
     * @returns Instancia validada de la entidad o null si falla
     */
    async validateAndTransform<T>(
        classType: new () => T,
        plainObject: Record<string, unknown>,
    ): Promise<T | null> {
        try {
            const instance = plainToInstance(classType, plainObject);
            const isValid = await this.validateEntity(instance);
            return isValid ? instance : null;
        } catch (error) {
            this.logger.error(
                `Error transformando objeto a ${classType.name}: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * Valida múltiples entidades en lote.
     * @param entities Array de entidades a validar
     * @returns Array de booleanos (true = válida, false = inválida)
     */
    async validateBatch<T>(entities: T[]): Promise<boolean[]> {
        return Promise.all(entities.map(e => this.validateEntity(e)));
    }

    /**
     * Sanitiza un string removiendo caracteres peligrosos para SQL/NoSQL.
     * Previene inyecciones básicas en consultas LIKE.
     * @param text Texto a sanitizar
     * @returns Texto sanitizado
     */
    sanitizeString(text: string | null | undefined): string {
        if (!text) return '';
        // Remover caracteres de control y comillas peligrosas
        return text
            .replace(/[<>;\\'"]/g, '')
            .replace(/\x00/g, '')
            .trim();
    }

    /**
     * Valida que un string no esté vacío y tenga longitud mínima.
     * @param value Valor a validar
     * @param minLength Longitud mínima (default 2)
     * @returns True si cumple, false si no
     */
    isValidString(value: unknown, minLength = 2): boolean {
        if (typeof value !== 'string') return false;
        return value.trim().length >= minLength;
    }

    /**
     * Valida que un número esté en un rango.
     * @param value Valor numérico
     * @param min Mínimo permitido
     * @param max Máximo permitido
     * @returns True si está en rango
     */
    isValidNumber(
        value: unknown,
        min: number,
        max: number,
    ): boolean | undefined {
        if (typeof value !== 'number') return false;
        return value >= min && value <= max;
    }
}
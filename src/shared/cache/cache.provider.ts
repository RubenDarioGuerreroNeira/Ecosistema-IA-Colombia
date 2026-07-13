import { Injectable, Logger } from '@nestjs/common';

/**
 * Provider de cache distribuido.
 * Implementación en memoria con interfaz compatible con Redis.
 * Para usar Redis, instalar: npm install ioredis y configurar REDIS_URL
 */
@Injectable()
export class CacheProvider {
    private readonly logger = new Logger(CacheProvider.name);
    private cache = new Map<string, { data: unknown; expiresAt: number }>();

    // Redis client - se inicializa dinámicamente si está disponible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private redisClient: any = undefined;
    private redisEnabled = false;

    async onModuleInit(): Promise<void> {
        // Redis deshabilitado por defecto - se habilita si REDIS_URL está configurado
        // y ioredis está instalado
    }

    /**
     * Almacena un valor en cache.
     * @param key - Clave de cache
     * @param value - Valor a almacenar
     * @param ttlSeconds - Tiempo de vida en segundos (default: 300)
     */
    async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
        if (this.redisEnabled && this.redisClient) {
            try {
                await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
                return;
            } catch (error) {
                this.logger.error(`Error guardando en Redis: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Fallback a memoria
        this.cache.set(key, {
            data: value,
            expiresAt: Date.now() + ttlSeconds * 1000
        });
    }

    /**
     * Obtiene un valor de cache.
     * @param key - Clave de cache
     * @returns Valor o null si expiró/no existe
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get<T = any>(key: string): Promise<T | null> {
        if (this.redisEnabled && this.redisClient) {
            try {
                const value = await this.redisClient.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                this.logger.error(`Error leyendo de Redis: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Elimina un valor de cache.
     */
    async del(key: string): Promise<void> {
        if (this.redisEnabled && this.redisClient) {
            try {
                await this.redisClient.del(key);
                return;
            } catch (error) {
                this.logger.error(`Error eliminando de Redis: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        this.cache.delete(key);
    }

    /**
     * Obtiene o genera un valor con cache.
     * @param key - Clave de cache
     * @param ttlSeconds - Tiempo de vida
     * @param fallback - Función generadora si no está en cache
     */
    async getOrSet<T>(key: string, ttlSeconds: number, fallback: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            this.logger.debug(`Cache HIT: ${key}`);
            return cached;
        }

        this.logger.debug(`Cache MISS: ${key}`);
        const fresh = await fallback();
        await this.set(key, fresh, ttlSeconds);
        return fresh;
    }

    /**
     * Verifica si Redis está disponible.
     */
    isRedisAvailable(): boolean {
        return this.redisEnabled && this.redisClient !== undefined;
    }

    /**
     * Configura cliente Redis (llamado desde main.ts si ioredis está disponible)
     * @param client - Cliente Redis configurado
     */
    setRedisClient(client: unknown): void {
        this.redisClient = client;
        this.redisEnabled = true;
        this.logger.log('Cache distribuido Redis habilitado');
    }
}
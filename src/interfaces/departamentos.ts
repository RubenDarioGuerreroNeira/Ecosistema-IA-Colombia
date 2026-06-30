// ─── Departamentos de Colombia ───────────────────────────────────────────────
// Enum con los 32 departamentos + Bogotá D.C.
// Usamos mayúsculas sostenidas como clave estándar (CONSTANT_CASE).
// El valor es el nombre oficial con acentos y formato correcto.

export enum Departamento {
    AMAZONAS = 'Amazonas',
    ANTIOQUIA = 'Antioquia',
    ARAUCA = 'Arauca',
    ATLANTICO = 'Atlántico',
    BOGOTA_DC = 'Bogotá D.C.',
    BOLIVAR = 'Bolívar',
    BOYACA = 'Boyacá',
    CALDAS = 'Caldas',
    CAQUETA = 'Caquetá',
    CASANARE = 'Casanare',
    CAUCA = 'Cauca',
    CESAR = 'Cesar',
    CHOCO = 'Chocó',
    CORDOBA = 'Córdoba',
    CUNDINAMARCA = 'Cundinamarca',
    GUAINIA = 'Guainía',
    GUAVIARE = 'Guaviare',
    HUILA = 'Huila',
    LA_GUAJIRA = 'La Guajira',
    MAGDALENA = 'Magdalena',
    META = 'Meta',
    NARINO = 'Nariño',
    NORTE_DE_SANTANDER = 'Norte de Santander',
    PUTUMAYO = 'Putumayo',
    QUINDIO = 'Quindío',
    RISARALDA = 'Risaralda',
    SAN_ANDRES_PROVIDENCIA = 'San Andrés y Providencia',
    SANTANDER = 'Santander',
    SUCRE = 'Sucre',
    TOLIMA = 'Tolima',
    VALLE_DEL_CAUCA = 'Valle del Cauca',
    VAUPES = 'Vaupés',
    VICHADA = 'Vichada',
}

// ─── Interfaz para usar el enum ──────────────────────────────────────────────
export interface Departamentos {
    departamento: Departamento;
}

// ─── Utilidad: lista plana de todos los departamentos ────────────────────────
export const DEPARTAMENTOS_LIST: Departamento[] = Object.values(Departamento);

// ─── Utilidad: normalizar texto para búsqueda ────────────────────────────────
export function normalizeDepartamento(text: string): Departamento | undefined {
    const clean = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // elimina acentos
        .replace(/[^\w\s]/g, '')           // elimina puntuación
        .replace(/\s+/g, ' ')
        .trim();

    return DEPARTAMENTOS_LIST.find(d => {
        const cleanDepto = d
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleanDepto === clean || cleanDepto.includes(clean) || clean.includes(cleanDepto);
    });
}
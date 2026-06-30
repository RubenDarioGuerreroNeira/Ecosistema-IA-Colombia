import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { DataSource } from 'typeorm';
import { AntioquiaProvider } from '../src/entities';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'salud-ia-bot.db');

const AppDataSource = new DataSource({
    type: 'better-sqlite3',
    database: DB_PATH,
    entities: [AntioquiaProvider],
    synchronize: false,
    logging: false,
});

function normalizeString(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim();
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

async function main() {
    console.log('🌱 Seeding Antioquia providers into SQLite...');
    const filePath = path.join(DATA_DIR, 'Prestadores_de_Salud_Departamento_de_Antioquia.xml');
    if (!fs.existsSync(filePath)) {
        console.log('⏭️  Archivo no encontrado.');
        process.exit(0);
    }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(AntioquiaProvider);

    const entities = rows.map((row: any) => {
        const entity = new AntioquiaProvider();
        entity.codigohabilitacion = row.codigohabilitacion || null;
        entity.nombreprestador = row.nombreprestador || null;
        entity.nombre_sede = row.nombre_sede || null;
        entity.direccion = row.direccion || null;
        entity.telefono = row.telefono || null;
        entity.departamento = row.departamento || null;
        entity.municipio = row.municipio || null;
        entity.claseprestador = row.claseprestador || null;
        entity.clasepersona = row.clasepersona || null;
        entity.nit = row.nit || null;
        entity.ese = row.ese || null;
        entity.email = row.email || null;
        entity.privadapublica = row.privadapublica || null;
        entity.numero_sede = row.numero_sede || null;
        entity.gerente = row.gerente || null;
        entity.tipo_zona = row.tipo_zona || null;
        entity.barrio = row.barrio || null;
        entity.codigo_centro_poblado = row.codigo_centro_poblado || null;
        entity.nombre_centro_poblado = row.nombre_centro_poblado || null;
        entity.fecha_apertura = row.fecha_apertura || null;
        entity.digito_verificacion_nit = row.digito_verificacion_nit || null;
        entity.codigo_naturaleza_juridica = row.codigo_naturaleza_juridica || null;
        entity.codigo_clase_prestador = row.codigo_clase_prestador || null;
        entity.nivel = row.nivel || null;
        entity.caracter = row.caracter || null;
        entity.horario_lunes = row.horario_lunes || null;
        entity.horario_martes = row.horario_martes || null;
        entity.horario_miercoles = row.horario_miercoles || null;
        entity.horario_jueves = row.horario_jueves || null;
        entity.horario_viernes = row.horario_viernes || null;
        entity.horario_sabado = row.horario_sabado || null;
        entity.horario_domingo = row.horario_domingo || null;
        return entity;
    });

    await repo.save(entities, { chunk: 100 });
    console.log(`✅ ${entities.length} registros importados a ${DB_PATH}`);
    await AppDataSource.destroy();
}

main();
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { DataSource } from 'typeorm';
import { Vaccination } from '../src/entities';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'salud-ia-bot.db');

const AppDataSource = new DataSource({
    type: 'better-sqlite3',
    database: DB_PATH,
    entities: [Vaccination],
    synchronize: false,
    logging: false,
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

function mapGeneralVaccination(row: any): Vaccination {
    const entity = new Vaccination();
    entity.coddepto = row.coddepto || '';
    entity.departamento = row.departamento || 'Desconocido';
    entity.a_o = String(row.a_o || '');
    entity.biol_gico = row.biol_gico || '';
    entity.cobertura_de_vacunaci_n = String(row.cobertura_de_vacunaci_n || '0');
    return entity;
}

function mapValleVaccination(row: any): Vaccination {
    const entity = new Vaccination();
    entity.coddepto = row.codigo_departamento || '76';
    entity.departamento = row.departamento || 'VALLE DEL CAUCA';
    entity.a_o = String(row.a_o || '');
    entity.biol_gico = row.biologico || '';
    entity.cobertura_de_vacunaci_n = String(row.cobertura || '0');
    entity.indicator1 = row.municipio || null;
    return entity;
}

function mapChildrenVaccination(row: any): Vaccination {
    const rawVal = parseFloat(row.dato_num_rico || '0');
    const coverage = (rawVal / 100).toFixed(2);
    const entity = new Vaccination();
    entity.departamento = row.departamento || '';
    entity.a_o = String(row.a_o || '');
    entity.biol_gico = row.evento || row.biologico || '';
    entity.cobertura_de_vacunaci_n = coverage;
    entity.indicator1 = row.indicator || null;
    entity.indicator1_1 = row.indicator1 || null;
    entity.indicator1_2 = row.indicator2 || null;
    entity.indicator1_3 = row.indicator3 || null;
    entity.indicator1_4 = row.indicator4 || null;
    entity.indicator1_5 = row.indicator5 || null;
    return entity;
}

async function main() {
    console.log('🌱 Seeding vaccination data into SQLite...');
    const files = [
        { name: 'Coberturas_administrativas_de_vacunación_por_departamento_20260528.xml', mapper: mapGeneralVaccination },
        { name: 'Cobertura_de_Vacunación_PAI_en_el_Valle_del_Cauca.xml', mapper: mapValleVaccination },
        { name: 'DATOS_DE_VACUNACIÓN_EN_NIÑOS_Y_NIÑAS.xml', mapper: mapChildrenVaccination },
    ];

    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Vaccination);
    let totalCount = 0;

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file.name);
        if (!fs.existsSync(filePath)) {
            console.log(`⏭️  ${file.name} no encontrado, saltando.`);
            continue;
        }

        const xmlData = fs.readFileSync(filePath, 'utf-8');
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlData);
        const rows = ensureArray(jsonObj.response?.rows?.row);
        const entities = rows.map(file.mapper);

        if (entities.length > 0) {
            await repo.save(entities, { chunk: 100 });
            console.log(`   ✅ ${entities.length} registros de ${file.name}`);
            totalCount += entities.length;
        }
    }

    console.log(`✅ Total: ${totalCount} registros importados a ${DB_PATH}`);
    await AppDataSource.destroy();
}

main();
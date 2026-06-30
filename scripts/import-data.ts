/**
 * Script de importación de datos (una sola vez).
 * 
 * Uso: npm run import:data
 * 
 * Lee todos los archivos XML de la carpeta data/,
 * los parsea y los inserta en SQLite.
 * 
 * Después de ejecutar este script, la aplicación ya no necesita
 * xml2js ni fast-xml-parser en tiempo de ejecución.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { XMLParser } from 'fast-xml-parser';
import { DataSource } from 'typeorm';
import {
    BoyacaProvider,
    AntioquiaProvider,
    CaliProvider,
    YopalProvider,
    Vaccination,
    MentalHealth,
    SexualHealth,
    HealthEvent,
} from '../src/entities';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'salud-ia-bot.db');

// Configuración de TypeORM para importación
const AppDataSource = new DataSource({
    type: 'better-sqlite3',
    database: DB_PATH,
    entities: [
        BoyacaProvider,
        AntioquiaProvider,
        CaliProvider,
        YopalProvider,
        Vaccination,
        MentalHealth,
        SexualHealth,
        HealthEvent,
    ],
    synchronize: true,
    logging: false,
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function normalizeString(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .trim();
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

function parseXml(xmlContent: string): any {
    const parser = new XMLParser();
    return parser.parse(xmlContent);
}

function parseXmlWithXml2js(xmlContent: string): Promise<any> {
    const parser = new xml2js.Parser({ explicitArray: false });
    return parser.parseStringPromise(xmlContent);
}

// ---------------------------------------------------------------------------
// Importadores específicos
// ---------------------------------------------------------------------------

async function importBoyaca(repository: any) {
    console.log('📥 Importando prestadores de Boyacá...');
    const filePath = path.join(DATA_DIR, 'servicios_salud_boyaca.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXmlWithXml2js(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new BoyacaProvider();
        entity.municipio = row.municipio || null;
        entity.codigo_prestador = row.codigo_prestador || null;
        entity.razon_social = row.razon_social || null;
        entity.codigo_habilitacion = row.codigo_habilitacion || null;
        entity.codigo_municipio = row.codigo_municipio || null;
        entity.nombre_de_sede = row.nombre_de_sede || null;
        entity.direccion = row.direccion || null;
        entity.telefono = row.telefono || null;
        entity.fax = row.fax || null;
        entity.email = row.email || null;
        entity.fecha_apertura = row.fecha_apertura || null;
        entity.nit = row.nit || null;
        entity.dv = row.dv || null;
        entity.ese = row.ese || null;
        entity.sede_principal = row.sede_principal || null;
        entity.horario_lunes = row.horario_lunes || null;
        entity.horario_martes = row.horario_martes || null;
        entity.horario_miercoles = row.horario_miercoles || null;
        entity.horario_jueves = row.horario_jueves || null;
        entity.horario_viernes = row.horario_viernes || null;
        entity.horario_sabado = row.horario_sabado || null;
        entity.horario_domingo = row.horario_domingo || null;
        entity.nivel = row.nivel || null;
        entity.caracter = row.caracter || null;
        entity.barrio = row.barrio || null;
        entity.gerente = row.gerente || null;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importAntioquia(repository: any) {
    console.log('📥 Importando prestadores de Antioquia...');
    const filePath = path.join(DATA_DIR, 'Prestadores_de_Salud_Departamento_de_Antioquia.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXmlWithXml2js(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

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

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importCali(repository: any) {
    console.log('📥 Importando prestadores de Cali...');
    const filePath = path.join(DATA_DIR, 'SERVICIOS_OFERTADOS_RED_DE_SALUD_DEL_CENTRO_ESE_POR_SEDE_CALI.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXmlWithXml2js(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new CaliProvider();
        entity.complejidad = row.complejidad || null;
        entity.sede = row.sede || null;
        entity.grupo = row.grupo || null;
        entity.servicio = row.servicio || null;
        entity.direccion = row.direccion || null;
        entity.geolocalizacion = row.geolocalizacion || null;
        entity.departamento = row.departamento || null;
        entity.ciudad = row.ciudad || null;
        entity.telefono = row.telefono || null;
        entity.extension = row.extension || null;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importYopal(repository: any) {
    console.log('📥 Importando centros de salud de Yopal...');
    const filePath = path.join(DATA_DIR, 'Centros_de_salud_Yopal._.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = await parseXmlWithXml2js(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new YopalProvider();
        entity.departamento = row.departamento || null;
        entity.municipio = row.municipio || null;
        entity.orden = row.orden || null;
        entity.sector = row.sector || null;
        entity.idioma = row.idioma || null;
        entity.entidad_2 = row.entidad_2 || null;
        entity.gerente = row.gerente || null;
        entity.direccion = row.direccion || null;
        entity.telefono = row.telefono || null;
        entity.correo_electronico = row.correo_electronico || null;
        entity.latitud = row.latitud || null;
        entity.longitud = row.longitud || null;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importVaccination(repository: any) {
    console.log('📥 Importando datos de vacunación...');
    let totalCount = 0;
    const files = [
        { path: 'Coberturas_administrativas_de_vacunación_por_departamento_20260528.xml', mapper: mapGeneralVaccination },
        { path: 'Cobertura_de_Vacunación_PAI_en_el_Valle_del_Cauca.xml', mapper: mapValleVaccination },
        { path: 'DATOS_DE_VACUNACIÓN_EN_NIÑOS_Y_NIÑAS.xml', mapper: mapChildrenVaccination },
    ];

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file.path);
        if (!fs.existsSync(filePath)) { console.log(`   ⏭️  ${file.path} no encontrado, saltando.`); continue; }

        const xmlData = fs.readFileSync(filePath, 'utf-8');
        const result = parseXml(xmlData);
        const rawRows = result?.response?.rows?.row;
        const rows = ensureArray(rawRows);
        const entities = rows.map(file.mapper);

        if (entities.length > 0) {
            await repository.save(entities, { chunk: 100 });
            console.log(`   ✅ ${entities.length} registros de ${file.path}`);
            totalCount += entities.length;
        }
    }

    console.log(`   ✅ Total: ${totalCount} registros de vacunación importados.`);
    return totalCount;

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
}

async function importMentalHealth(repository: any) {
    console.log('📥 Importando datos de salud mental...');
    const filePath = path.join(DATA_DIR, 'Salud_Mental.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = parseXml(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new MentalHealth();
        entity.diagnostico_ingreso = row.diagnostico_ingreso || null;
        entity.codigo_dx_ingreso = row.codigo_dx_ingreso || null;
        entity.menor_a_1 = Number(row.menor_a_1) || 0;
        entity.de_1_a_4 = Number(row.de_1_a_4) || 0;
        entity.de_5_a_9 = Number(row.de_5_a_9) || 0;
        entity.de_10_a_14 = Number(row.de_10_a_14) || 0;
        entity.de_15_a_19 = Number(row.de_15_a_19) || 0;
        entity.de_20_a_49 = Number(row.de_20_a_49) || 0;
        entity.de_50_a_64 = Number(row.de_50_a_64) || 0;
        entity._65_y_mas = Number(row._65_y_mas) || 0;
        entity.total = Number(row.total) || 0;
        entity.a_o_diagn_stico = row.a_o_diagn_stico || null;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importSexualHealth(repository: any) {
    console.log('📥 Importando datos de salud sexual...');
    const filePath = path.join(DATA_DIR, 'Salud_sexual_-_preguntas.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = parseXml(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new SexualHealth();
        entity.id_sub_tema = Number(row.id_sub_tema) || 0;
        entity.pregunta = row.pregunta || null;
        entity.respuesta = row.respuesta || null;
        entity.palabras_claves = row.palabras_claves || null;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

async function importHealthEvents(repository: any) {
    console.log('📥 Importando eventos de salud pública...');
    const filePath = path.join(DATA_DIR, 'Eventos_de_Interés_en_Salud_Pública_20260514.xml');
    if (!fs.existsSync(filePath)) { console.log('   ⏭️  Archivo no encontrado, saltando.'); return 0; }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = parseXml(xmlData);
    const rawRows = result?.response?.rows?.row;
    const rows = ensureArray(rawRows);

    const entities = rows.map((row: any) => {
        const entity = new HealthEvent();
        entity.departamento = row.departamento || null;
        entity.nombre_del_evento = row.nombre_del_evento || null;
        entity.urbano = Number(row.urbano) || 0;
        entity.rural = Number(row.rural) || 0;
        entity.primera_infancia = Number(row.primera_infancia) || 0;
        entity.infancia = Number(row.infancia) || 0;
        entity.adolescencia = Number(row.adolescencia) || 0;
        entity.juventud = Number(row.juventud) || 0;
        entity.adulto_j_ven = Number(row.adulto_j_ven) || 0;
        entity.adulto_mayor = Number(row.adulto_mayor) || 0;
        entity.femenino = Number(row.femenino) || 0;
        entity.masculino = Number(row.masculino) || 0;
        entity.total_de_eventos = Number(row.total_de_eventos) || 0;
        return entity;
    });

    await repository.save(entities, { chunk: 100 });
    console.log(`   ✅ ${entities.length} registros importados.`);
    return entities.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('='.repeat(60));
    console.log('🚀 IMPORTACIÓN DE DATOS A SQLITE');
    console.log('='.repeat(60));
    console.log('');
    console.log(`📂 Base de datos: ${DB_PATH}`);
    console.log('');

    const startTime = Date.now();

    try {
        // Inicializar conexión
        await AppDataSource.initialize();
        console.log('✅ Conexión a SQLite establecida.\n');

        // Obtener repositorios
        const boyacaRepo = AppDataSource.getRepository(BoyacaProvider);
        const antioquiaRepo = AppDataSource.getRepository(AntioquiaProvider);
        const caliRepo = AppDataSource.getRepository(CaliProvider);
        const yopalRepo = AppDataSource.getRepository(YopalProvider);
        const vaccinationRepo = AppDataSource.getRepository(Vaccination);
        const mentalRepo = AppDataSource.getRepository(MentalHealth);
        const sexualRepo = AppDataSource.getRepository(SexualHealth);
        const healthEventRepo = AppDataSource.getRepository(HealthEvent);

        // Importar cada dataset
        const counts = await Promise.all([
            importBoyaca(boyacaRepo),
            importAntioquia(antioquiaRepo),
            importCali(caliRepo),
            importYopal(yopalRepo),
            importVaccination(vaccinationRepo),
            importMentalHealth(mentalRepo),
            importSexualHealth(sexualRepo),
            importHealthEvents(healthEventRepo),
        ]);

        const totalRecords = counts.reduce((sum, c) => sum + c, 0);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('='.repeat(60));
        console.log('📊 RESUMEN DE IMPORTACIÓN');
        console.log('='.repeat(60));
        console.log(`   Boyacá:          ${counts[0]} registros`);
        console.log(`   Antioquia:       ${counts[1]} registros`);
        console.log(`   Cali:            ${counts[2]} registros`);
        console.log(`   Yopal:           ${counts[3]} registros`);
        console.log(`   Vacunación:      ${counts[4]} registros`);
        console.log(`   Salud Mental:    ${counts[5]} registros`);
        console.log(`   Salud Sexual:    ${counts[6]} registros`);
        console.log(`   Eventos Salud:   ${counts[7]} registros`);
        console.log('---');
        console.log(`   TOTAL:           ${totalRecords} registros`);
        console.log(`   ⏱️  Tiempo:       ${elapsed} segundos`);
        console.log('');
        console.log(`📁 Base de datos: ${DB_PATH}`);

        // Mostrar tamaño del archivo
        const stats = fs.statSync(DB_PATH);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`💾 Tamaño: ${sizeMB} MB`);
        console.log('');
        console.log('✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE.');
        console.log('   Ahora la aplicación usará SQLite en lugar de XML.');

    } catch (error) {
        console.error('❌ Error durante la importación:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

main();
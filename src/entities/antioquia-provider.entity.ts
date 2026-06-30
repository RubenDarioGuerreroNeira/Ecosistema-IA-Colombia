import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('antioquia_health_providers')
@Index('idx_antioquia_municipio', ['municipio'])
@Index('idx_antioquia_nit', ['nit'])
@Index('idx_antioquia_nombre_prestador', ['nombreprestador'])
export class AntioquiaProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    codigohabilitacion: string;

    @Column({ nullable: true })
    nombreprestador: string;

    @Column({ nullable: true })
    nombre_sede: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    municipio: string;

    @Column({ nullable: true })
    claseprestador: string;

    @Column({ nullable: true })
    clasepersona: string;

    @Column({ nullable: true })
    nit: string;

    @Column({ nullable: true })
    ese: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    privadapublica: string;

    @Column({ nullable: true })
    numero_sede: string;

    @Column({ nullable: true })
    gerente: string;

    @Column({ nullable: true })
    tipo_zona: string;

    @Column({ nullable: true })
    barrio: string;

    @Column({ nullable: true })
    codigo_centro_poblado: string;

    @Column({ nullable: true })
    nombre_centro_poblado: string;

    @Column({ nullable: true })
    fecha_apertura: string;

    @Column({ nullable: true })
    digito_verificacion_nit: string;

    @Column({ nullable: true })
    codigo_naturaleza_juridica: string;

    @Column({ nullable: true })
    codigo_clase_prestador: string;

    @Column({ nullable: true })
    nivel: string;

    @Column({ nullable: true })
    caracter: string;

    @Column({ nullable: true })
    horario_lunes: string;

    @Column({ nullable: true })
    horario_martes: string;

    @Column({ nullable: true })
    horario_miercoles: string;

    @Column({ nullable: true })
    horario_jueves: string;

    @Column({ nullable: true })
    horario_viernes: string;

    @Column({ nullable: true })
    horario_sabado: string;

    @Column({ nullable: true })
    horario_domingo: string;
}
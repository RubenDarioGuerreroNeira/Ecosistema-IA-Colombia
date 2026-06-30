import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('boyaca_health_providers')
@Index('idx_boyaca_municipio', ['municipio'])
@Index('idx_boyaca_nit', ['nit'])
@Index('idx_boyaca_codigo_prestador', ['codigo_prestador'])
@Index('idx_boyaca_razon_social', ['razon_social'])
export class BoyacaProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    municipio: string;

    @Column({ nullable: true })
    codigo_prestador: string;

    @Column({ nullable: true })
    razon_social: string;

    @Column({ nullable: true })
    codigo_habilitacion: string;

    @Column({ nullable: true })
    codigo_municipio: string;

    @Column({ nullable: true })
    nombre_de_sede: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    fax: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    fecha_apertura: string;

    @Column({ nullable: true })
    nit: string;

    @Column({ nullable: true })
    dv: string;

    @Column({ nullable: true })
    ese: string;

    @Column({ nullable: true })
    sede_principal: string;

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

    @Column({ nullable: true })
    nivel: string;

    @Column({ nullable: true })
    caracter: string;

    @Column({ nullable: true })
    barrio: string;

    @Column({ nullable: true })
    gerente: string;
}
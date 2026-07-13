import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('antioquia_health_providers')
@Index('idx_antioquia_municipio', ['municipio'])
@Index('idx_antioquia_nit', ['nit'])
@Index('idx_antioquia_nombre_prestador', ['nombreprestador'])
export class AntioquiaProvider {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigohabilitacion: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nombreprestador: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nombre_sede: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    direccion: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    telefono: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    departamento: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    municipio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    claseprestador: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    clasepersona: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nit: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    ese: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    email: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    privadapublica: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    numero_sede: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    gerente: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    tipo_zona: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    barrio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_centro_poblado: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nombre_centro_poblado: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    fecha_apertura: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    digito_verificacion_nit: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_naturaleza_juridica: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_clase_prestador: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nivel: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    caracter: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_lunes: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_martes: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_miercoles: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_jueves: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_viernes: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_sabado: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    horario_domingo: string;
}
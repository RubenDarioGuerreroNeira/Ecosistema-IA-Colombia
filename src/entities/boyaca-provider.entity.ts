import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('boyaca_health_providers')
@Index('idx_boyaca_municipio', ['municipio'])
@Index('idx_boyaca_nit', ['nit'])
@Index('idx_boyaca_codigo_prestador', ['codigo_prestador'])
@Index('idx_boyaca_razon_social', ['razon_social'])
export class BoyacaProvider {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    municipio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_prestador: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    razon_social: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_habilitacion: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_municipio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nombre_de_sede: string;

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
    fax: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    email: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    fecha_apertura: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    nit: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    dv: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    ese: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    sede_principal: string;

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
    barrio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    gerente: string;
}
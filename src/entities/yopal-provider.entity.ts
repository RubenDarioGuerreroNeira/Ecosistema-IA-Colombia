import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('yopal_health_providers')
@Index('idx_yopal_municipio', ['municipio'])
@Index('idx_yopal_entidad', ['entidad_2'])
export class YopalProvider {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

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
    orden: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    sector: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    idioma: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    entidad_2: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    gerente: string;

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
    correo_electronico: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    latitud: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    longitud: string;
}
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('cali_health_providers')
@Index('idx_cali_ciudad', ['ciudad'])
@Index('idx_cali_servicio', ['servicio'])
export class CaliProvider {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    complejidad: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    sede: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    grupo: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    servicio: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    direccion: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    geolocalizacion: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    departamento: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    ciudad: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    telefono: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    extension: string;
}
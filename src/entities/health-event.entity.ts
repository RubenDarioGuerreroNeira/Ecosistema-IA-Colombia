import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('health_events')
@Index('idx_event_nombre', ['nombre_del_evento'])
@Index('idx_event_departamento', ['departamento'])
export class HealthEvent {
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
    nombre_del_evento: string;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    urbano: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    rural: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    primera_infancia: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    infancia: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    adolescencia: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    juventud: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    adulto_j_ven: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    adulto_mayor: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    femenino: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    masculino: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    total_de_eventos: number;
}
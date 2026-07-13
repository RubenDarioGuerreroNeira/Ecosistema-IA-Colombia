import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('mental_health_events')
@Index('idx_mental_diagnostico', ['codigo_dx_ingreso'])
export class MentalHealth {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    diagnostico_ingreso: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    codigo_dx_ingreso: string;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    menor_a_1: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_1_a_4: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_5_a_9: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_10_a_14: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_15_a_19: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_20_a_49: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    de_50_a_64: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    _65_y_mas: number;

    @Column({ default: 0 })
    @IsOptional()
    @IsNumber()
    total: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    a_o_diagn_stico: string;
}
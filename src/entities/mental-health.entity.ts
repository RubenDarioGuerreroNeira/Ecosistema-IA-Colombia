import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('mental_health_events')
@Index('idx_mental_diagnostico', ['codigo_dx_ingreso'])
export class MentalHealth {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    diagnostico_ingreso: string;

    @Column({ nullable: true })
    codigo_dx_ingreso: string;

    @Column({ default: 0 })
    menor_a_1: number;

    @Column({ default: 0 })
    de_1_a_4: number;

    @Column({ default: 0 })
    de_5_a_9: number;

    @Column({ default: 0 })
    de_10_a_14: number;

    @Column({ default: 0 })
    de_15_a_19: number;

    @Column({ default: 0 })
    de_20_a_49: number;

    @Column({ default: 0 })
    de_50_a_64: number;

    @Column({ default: 0 })
    _65_y_mas: number;

    @Column({ default: 0 })
    total: number;

    @Column({ nullable: true })
    a_o_diagn_stico: string;
}
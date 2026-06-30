import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('sexual_health_qa')
export class SexualHealth {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    id_sub_tema: number;

    @Column({ type: 'text', nullable: true })
    pregunta: string;

    @Column({ type: 'text', nullable: true })
    respuesta: string;

    @Column({ nullable: true })
    palabras_claves: string;
}
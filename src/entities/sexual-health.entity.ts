import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('sexual_health_qa')
export class SexualHealth {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsNumber()
    id_sub_tema: number;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @IsString()
    pregunta: string;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @IsString()
    respuesta: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    palabras_claves: string;
}
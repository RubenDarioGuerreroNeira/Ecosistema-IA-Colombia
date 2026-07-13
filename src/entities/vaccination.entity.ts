import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('vaccination_data')
@Index('idx_vaccination_departamento', ['departamento'])
@Index('idx_vaccination_biológico', ['biol_gico'])
@Index('idx_vaccination_anio', ['a_o'])
export class Vaccination {
    @PrimaryGeneratedColumn()
    @IsOptional()
    @IsNumber()
    id: number;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    coddepto: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    departamento: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    a_o: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    biol_gico: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    cobertura_de_vacunaci_n: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1_1: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1_2: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1_3: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1_4: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    indicator1_5: string;
}
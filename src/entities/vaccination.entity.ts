import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('vaccination_data')
@Index('idx_vaccination_departamento', ['departamento'])
@Index('idx_vaccination_biológico', ['biol_gico'])
@Index('idx_vaccination_anio', ['a_o'])
export class Vaccination {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    coddepto: string;

    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    a_o: string;

    @Column({ nullable: true })
    biol_gico: string;

    @Column({ nullable: true })
    cobertura_de_vacunaci_n: string;

    @Column({ nullable: true })
    indicator1: string;

    @Column({ nullable: true })
    indicator1_1: string;

    @Column({ nullable: true })
    indicator1_2: string;

    @Column({ nullable: true })
    indicator1_3: string;

    @Column({ nullable: true })
    indicator1_4: string;

    @Column({ nullable: true })
    indicator1_5: string;
}
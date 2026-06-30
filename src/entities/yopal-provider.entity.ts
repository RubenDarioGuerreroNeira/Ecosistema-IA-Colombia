import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('yopal_health_providers')
@Index('idx_yopal_municipio', ['municipio'])
@Index('idx_yopal_entidad', ['entidad_2'])
export class YopalProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    municipio: string;

    @Column({ nullable: true })
    orden: string;

    @Column({ nullable: true })
    sector: string;

    @Column({ nullable: true })
    idioma: string;

    @Column({ nullable: true })
    entidad_2: string;

    @Column({ nullable: true })
    gerente: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    correo_electronico: string;

    @Column({ nullable: true })
    latitud: string;

    @Column({ nullable: true })
    longitud: string;
}
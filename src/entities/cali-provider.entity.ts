import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('cali_health_providers')
@Index('idx_cali_ciudad', ['ciudad'])
@Index('idx_cali_servicio', ['servicio'])
export class CaliProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    complejidad: string;

    @Column({ nullable: true })
    sede: string;

    @Column({ nullable: true })
    grupo: string;

    @Column({ nullable: true })
    servicio: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    geolocalizacion: string;

    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    ciudad: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    extension: string;
}
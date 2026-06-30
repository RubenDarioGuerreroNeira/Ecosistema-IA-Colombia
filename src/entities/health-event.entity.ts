import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('health_events')
@Index('idx_event_nombre', ['nombre_del_evento'])
@Index('idx_event_departamento', ['departamento'])
export class HealthEvent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    nombre_del_evento: string;

    @Column({ default: 0 })
    urbano: number;

    @Column({ default: 0 })
    rural: number;

    @Column({ default: 0 })
    primera_infancia: number;

    @Column({ default: 0 })
    infancia: number;

    @Column({ default: 0 })
    adolescencia: number;

    @Column({ default: 0 })
    juventud: number;

    @Column({ default: 0 })
    adulto_j_ven: number;

    @Column({ default: 0 })
    adulto_mayor: number;

    @Column({ default: 0 })
    femenino: number;

    @Column({ default: 0 })
    masculino: number;

    @Column({ default: 0 })
    total_de_eventos: number;
}
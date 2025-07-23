import { Doctor } from 'src/doctor/doctor.entity';
import { Patient } from 'src/patient/patient.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('ehr_records')
export class EHR {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  data: any;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Doctor, (doctor) => doctor.ehr, {
    onDelete: 'CASCADE',
    eager: true,
  })
  createdBy: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.ehr, {
    nullable: true,
    eager: true,
  })
  patient: Patient;
}

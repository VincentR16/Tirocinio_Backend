import { Bundle, OperationOutcome } from 'fhir/r4';
import { ComunicationStatus } from 'src/common/types/comunicationStatus';
import { ComunicationType } from 'src/common/types/comunicationType';
import { Doctor } from 'src/doctor/doctor.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('comunication')
@Index(['createdAt'])
export class Comunication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'enum', enum: ComunicationType })
  type: ComunicationType;

  @Column({ type: 'enum', enum: ComunicationStatus })
  status: ComunicationStatus;

  @ManyToOne(() => Doctor, (doctor) => doctor.comunication, {
    eager: true,
  })
  doctor: Doctor;

  @Column({ type: 'jsonb' })
  message: Bundle | OperationOutcome;
}

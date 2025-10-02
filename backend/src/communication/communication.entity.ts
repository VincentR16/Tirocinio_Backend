import { Bundle, OperationOutcome } from 'fhir/r4';
import { CommunicationStatus } from 'src/common/types/communicationStatus';
import { CommunicationType } from 'src/common/types/communicationType';
import { Doctor } from 'src/doctor/doctor.entity';
import { EHR } from 'src/ehr/ehr.entity';
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
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'enum', enum: CommunicationType })
  type: CommunicationType;

  @Column({ type: 'enum', enum: CommunicationStatus })
  status: CommunicationStatus;

  @Column({ nullable: true })
  hospital: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.comunication, {
    eager: true,
  })
  doctor: Doctor;

  @ManyToOne(() => EHR, (ehr) => ehr.communications, {
    nullable: true,
  })
  ehr: EHR;

  @Column({ type: 'jsonb' })
  message: Bundle | OperationOutcome;
}

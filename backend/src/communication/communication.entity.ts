import { Bundle, OperationOutcome } from 'fhir/r4';
import { CommunicationStatus } from 'src/common/types/communicationStatus';
import { CommunicationType } from 'src/common/types/communicationType';
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
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'date' })
  createdAt!: Date;

  @Column({ type: 'enum', enum: CommunicationType })
  type: CommunicationType;

  @Column({ type: 'enum', enum: CommunicationStatus })
  status: CommunicationStatus;

  @Column({ nullable: true })
  hospital: string;

  //questo rappresenta sempre il dottore all interno del sistema sia che sia inviata sia che sia ricevuta, nel caso di invio rappresnta chi invia
  //nel caso di ricevuto rapprensenta chi riceve la comunicazione
  @ManyToOne(() => Doctor, (doctor) => doctor.comunication, {
    eager: true,
  })
  doctor: Doctor;

  //TODO AGGIUNGERE ASSULUTAMENTE CHIAVE ESTERNA AD EHR!!! MA CHE CAZZO STAVI PENSANDO
  //! SERVE ASSOLUTAMENTE

  @Column({ type: 'jsonb' })
  message: Bundle | OperationOutcome;
}

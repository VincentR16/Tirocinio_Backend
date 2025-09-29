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
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'date' })
  createdAt!: Date;

  @Column({ type: 'enum', enum: ComunicationType })
  type: ComunicationType;

  @Column({ type: 'enum', enum: ComunicationStatus })
  status: ComunicationStatus;

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

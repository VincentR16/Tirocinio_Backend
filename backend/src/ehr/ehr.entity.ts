import { Exclude } from 'class-transformer';
import {
  AllergyIntolerance as FhirAllergyIntolerance,
  Encounter as FhirEncounter,
  MedicationRequest as FhirMedicationRequest,
  Observation as FhirObservation,
  Procedure as FhirProcedure,
  Patient as FhirPatient,
  Condition as FhirCondition,
  Bundle,
} from 'fhir/r4';
import { Communication } from 'src/communication/communication.entity';
import { Doctor } from 'src/doctor/doctor.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Column,
  Index,
  OneToMany,
} from 'typeorm';

@Entity('ehr_records')
@Index(['createdAt'])
export class EHR {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  // Blocchi FHIR salvati come JSONB
  @Column({ type: 'jsonb' })
  patient: FhirPatient;

  @Column({ type: 'jsonb', nullable: true })
  encounter: FhirEncounter;

  @Column({ type: 'jsonb', nullable: true })
  condition: FhirCondition;

  @Column({ type: 'jsonb', default: [] })
  allergies: FhirAllergyIntolerance[];

  @Column({ type: 'jsonb', default: [] })
  observations: FhirObservation[];

  @Column({ type: 'jsonb', nullable: true })
  procedure: FhirProcedure;

  @Column({ type: 'jsonb', default: [] })
  medications: FhirMedicationRequest[];

  @Column({ type: 'jsonb', nullable: true })
  bundle: Bundle;

  // Chi crea l’EHR
  @ManyToOne(() => Doctor, (doctor) => doctor.ehr, {
    onDelete: 'CASCADE',
    eager: true,
  })
  createdBy: Doctor;

  @Exclude()
  @OneToMany(() => Communication, (communication) => communication.ehr, {
    nullable: true,
  })
  communications: Communication[];

  @Column()
  patientEmail: string;
}

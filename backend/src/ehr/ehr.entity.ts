import {
  AllergyIntolerance as FhirAllergyIntolerance,
  Encounter as FhirEncounter,
  MedicationRequest as FhirMedicationRequest,
  Observation as FhirObservation,
  Procedure as FhirProcedure,
  Patient as FhirPatient,
  Condition as FhirCondition,
} from 'fhir/r4';
import { Doctor } from 'src/doctor/doctor.entity';
import { Patient as AppPatient } from 'src/patient/patient.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Column,
  Index,
} from 'typeorm';

@Entity('ehr_records')
@Index(['createdAt'])
export class EHR {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  // Blocchi FHIR salvati come JSONB (non entity TypeORM)
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

  // Chi crea l’EHR
  @ManyToOne(() => Doctor, (doctor) => doctor.ehr, {
    onDelete: 'CASCADE',
    eager: true,
  })
  createdBy: Doctor;

  // FK al paziente della tua app (NON il Patient FHIR)
  @ManyToOne(() => AppPatient, (patient) => patient.ehr, {
    nullable: true,
    eager: true,
  })
  patientRef: AppPatient;
}

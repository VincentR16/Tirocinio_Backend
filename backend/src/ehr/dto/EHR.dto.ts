// dto/create-ehr.dto.ts
import {
  Patient,
  Encounter,
  Condition,
  Procedure,
  AllergyIntolerance,
  Observation,
  MedicationRequest,
} from 'fhir/r4';

export interface EhrDTO {
  patient: Patient;
  encounter: Encounter;
  condition: Condition;
  procedure: Procedure;
  allergies: AllergyIntolerance[];
  observations: Observation[];
  medications: MedicationRequest[];
  patientEmail: string;
}

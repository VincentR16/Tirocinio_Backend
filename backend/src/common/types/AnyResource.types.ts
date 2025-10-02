import {
  AllergyIntolerance,
  Condition,
  Encounter,
  MedicationRequest,
  Observation,
  Patient,
  Procedure,
} from 'fhir/r4';

export type AnyResource =
  | Patient
  | Encounter
  | Condition
  | Procedure
  | Observation
  | MedicationRequest
  | AllergyIntolerance;

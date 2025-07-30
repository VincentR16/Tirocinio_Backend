// dto/create-ehr.dto.ts
import {
  Patient,
  Encounter,
  Condition,
  Procedure,
  MedicationStatement,
  AllergyIntolerance,
  Observation,
} from 'fhir/r4';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional } from 'class-validator';

export class EhrDTO {
  @ValidateNested()
  @Type(() => Object)
  patient: Patient;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  encounter?: Encounter;
  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  allergy?: AllergyIntolerance;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  observation?: Observation;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  condition?: Condition;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  procedure?: Procedure;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  medicationStatement?: MedicationStatement;
}

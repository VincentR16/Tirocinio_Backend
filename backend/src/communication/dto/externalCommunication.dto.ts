import { IsEmail, IsNotEmpty, IsObject } from 'class-validator';
import { Bundle } from 'fhir/r4';

export class ExternalCommunicationDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsObject()
  json: Bundle;
}

import { IsEmail, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { Bundle } from 'fhir/r4';

export class ExternalCommunicationDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  hospital: string;

  @IsNotEmpty()
  @IsObject()
  json: Bundle;
}

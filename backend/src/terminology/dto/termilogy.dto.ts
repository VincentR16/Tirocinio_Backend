import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class TerminologyDto {
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

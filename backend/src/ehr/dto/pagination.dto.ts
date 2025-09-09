import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

export class EhrPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  search?: string;
}

import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { UserRoles } from 'src/common/types/userRoles';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  surname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsIn(['Male', 'Female', 'Other'])
  gender: string;

  @IsNotEmpty()
  @IsPhoneNumber('IT')
  phone: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  birthDate: Date;

  @IsNotEmpty()
  @IsEnum(UserRoles)
  role: UserRoles;

  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @IsString()
  ssn: string;

  @IsString()
  ospidal: string;
}

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
import { UserRoles } from 'src/common/types/user_roles';

export class SignInDto {
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
  @IsIn(['male', 'female', 'other'])
  gender: string;

  @IsNotEmpty()
  @IsPhoneNumber('IT')
  phone: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  birthDate: Date;

  @IsEnum(UserRoles)
  role: UserRoles;

  @IsStrongPassword()
  password: string;
}

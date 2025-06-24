import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

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
  @IsEmail()
  gender: string;

  @IsNotEmpty()
  @IsPhoneNumber('IT')
  phone: string;

  @IsNotEmpty()
  @IsDate()
  birthDate: Date;

  @IsStrongPassword()
  password: string;
}

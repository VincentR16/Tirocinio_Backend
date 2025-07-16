import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LogInDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  //todo fare un dto apparte con user e questa stringa
  @IsNotEmpty()
  @IsString()
  twoFactorAuthenticationCode: string;
}

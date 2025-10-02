import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class twoFactorAuthenticationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  twoFactorAuthenticationCode: string;
}

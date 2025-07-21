import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class twoFactorAuthenticationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsString()
  twoFactorAuthenticationCode: string;
}

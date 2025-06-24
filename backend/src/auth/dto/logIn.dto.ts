import { IsEmail, IsNotEmpty } from 'class-validator';

export class LogInDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

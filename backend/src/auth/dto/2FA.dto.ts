import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { User } from 'src/user/user.entity';

export class twoFactorAuthenticationDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => User)
  user: User;

  @IsNotEmpty()
  @IsString()
  twoFactorAuthenticationCode: string;
}

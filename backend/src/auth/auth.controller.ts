import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authservice: AuthService) {}

  @Post('/singup')
  signup() {
    return;
  }

  @Post('/singin')
  signin() {
    return;
  }
}

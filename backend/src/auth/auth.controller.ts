import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signIn.dto';
import { Request } from 'express';
import { LogInDto } from './dto/logIn.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authservice: AuthService) {}

  @Post('/login')
  signup(@Body() credential: LogInDto, @Req() req: Request) {
    return this.authservice.logIn(credential, req);
  }

  @Post('/signin')
  signin(@Body() credential: SignInDto, @Req() req: Request) {
    return this.authservice.singIn(credential, req);
  }
}

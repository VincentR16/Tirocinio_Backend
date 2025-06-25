import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { Request, Response } from 'express';
import { LogInDto } from './dto/logIn.dto';
import { AuthenticatedRequest } from 'src/common/types/authRequest';
import { JwtAuthGuard } from './jwt/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authservice: AuthService) {}

  @Post('/login')
  async login(
    @Body() credential: LogInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authservice.logIn(
      credential,
      req,
    );
    //set dei cookie
    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'Login success' };
  }

  @Post('/signUp')
  async signUp(
    @Body() credential: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authservice.signUp(
      credential,
      req,
    );
    //set dei cookie
    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'SignUp success' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authservice.refreshTokens(req);

    //set dei cookie
    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'Token refreshed!' };
  }
  @UseGuards(JwtAuthGuard)
  @Post('/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logout success' };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }
}

import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { Request, Response } from 'express';
import { LogInDto } from './dto/logIn.dto';
import { AuthenticatedRequest } from 'src/common/types/authRequest';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { twoFactorAuthenticationDto } from './dto/2FA.dto';
import { User } from 'src/user/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authservice: AuthService) {}

  @Post('/login')
  login(@Body() credential: LogInDto): Promise<User> {
    return this.authservice.logIn(credential);
  }

  @Post('/signup')
  async signUp(
    @Body() credential: SignUpDto,
  ): Promise<{ qrCodeUrl: string; user: User }> {
    return await this.authservice.signUp(credential);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authservice.logout(req);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: 'Logout success' };
  }

  @Post('/2FA')
  async twoFactorAuthentication(
    @Body() dto: twoFactorAuthenticationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authservice.isTwoFactorAuthenticationCodeValid(dto, req);

    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'Login success' };
  }

  @Post('refresh')
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authservice.refreshTokens(req);

    //set dei cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15,
    });

    return { message: 'Token refreshed!' };
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

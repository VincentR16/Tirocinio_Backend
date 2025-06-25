import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { Request, Response } from 'express';
import { LogInDto } from './dto/logIn.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authservice: AuthService) {}

  @Post('/login')
  async signup(
    @Body() credential: LogInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authservice.logIn(
      credential,
      req,
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 min
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 giorni
    });

    return { message: 'Login success' };
  }

  @Post('/signin')
  async signin(
    @Body() credential: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authservice.singUp(
      credential,
      req,
    );
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 min
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 giorni
    });

    return { message: 'Login success' };
  }

  @Post('refresh')
  async refreshTokens(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Token mancante' });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authservice.refreshTokens(refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 minuti
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 giorni
    });

    return { message: 'Token aggiornati con successo' };
  }

  @Post('/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logout success' };
  }
}
interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
  };
}

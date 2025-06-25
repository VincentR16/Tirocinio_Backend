import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '../auth/session.entity';
import { User } from 'src/user/user.entity';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { SignUpDto } from './dto/signUp.dto';
import { LogInDto } from './dto/logIn.dto';
import dayjs from 'dayjs';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from 'src/common/types/jwtPayload';
import { AuthenticatedRequest } from 'src/common/types/authRequest';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    private readonly jwtService: JwtService,
  ) {}

  async logIn(
    dto: LogInDto,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Invalid Email');

    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Invalid credentials');

    //creo accessToken e refreshToken hashato
    const { refreshTokenHash, accessToken, refreshToken } =
      await this.createTokens(user);

    //elimino vecchia sessione per quel dispositivo
    await this.sessionRepository.delete({
      user: { id: user.id },
      deviceInfo: req.headers['user-agent'] || 'unknown',
    });

    // Salva sessione nel DB
    const session = this.sessionRepository.create({
      refreshTokenHash: refreshTokenHash,
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: dayjs().add(7, 'days').toDate(),
      user: user,
    });

    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
    };
  }

  async signUp(
    dto: SignUpDto,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { password, email, phone } = dto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }],
    });
    if (existingUser)
      throw new BadRequestException('Email or Phone number already exists');

    //genera chiave di sale
    const salt = await bcrypt.genSalt();
    //hash sulla password
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    const { refreshTokenHash, accessToken, refreshToken } =
      await this.createTokens(user);

    //Salva sessione
    const session = this.sessionRepository.create({
      user,
      refreshTokenHash: refreshTokenHash,
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: dayjs().add(7, 'days').toDate(),
    });
    await this.sessionRepository.save(session);

    //Ritorna i token
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(
    req: AuthenticatedRequest,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    //Trova tutte la sessione per quello specifico dispositivo
    const session = await this.sessionRepository.findOne({
      where: {
        user: { id: req.user.userId },
        deviceInfo: req.headers['user-agent'] || 'unknown',
      },
      relations: ['user'],
    });
    if (!session) throw new UnauthorizedException('Invalid session');

    //controllo e valido il refreshToken
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const isValid = await bcrypt.compare(
      oldRefreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    //creo i token
    const { refreshTokenHash, accessToken, refreshToken } =
      await this.createTokens(session.user);

    //salvo il refresh token nella sessione
    session.refreshTokenHash = refreshTokenHash;
    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createTokens(user: User): Promise<{
    accessToken: string;
    refreshTokenHash: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    //Genera accessToken
    const accessToken = this.jwtService.sign(payload);
    //Genera refreshToken
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    //genera chiave di sale
    const salt = await bcrypt.genSalt();
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);

    return { accessToken, refreshTokenHash, refreshToken };
  }
}

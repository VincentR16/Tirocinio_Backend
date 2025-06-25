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

    const user = await this.userRepository.findOneOrFail({
      where: { email },
    });

    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Invalid credentials');

    //Genera accessToken
    const accessToken = this.jwtService.sign({ sub: user.id });
    //Genera refreshToken
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '14d' },
    );

    //genera chiave di sale
    const salt = await bcrypt.genSalt();

    //elimino vecchia sessione per quel dispositivo
    await this.sessionRepository.delete({
      user: { id: user.id },
      deviceInfo: req.headers['user-agent'] || 'unknown',
    });

    // Salva sessione nel DB
    const session = this.sessionRepository.create({
      refreshTokenHash: await bcrypt.hash(refreshToken, salt),
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: dayjs().add(14, 'days').toDate(),
      user: user,
    });

    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
    };
  }

  async singUp(
    dto: SignUpDto,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { password, email } = dto;

    const existingUser = await this.userRepository.findOne({
      where: { email: email },
    });

    if (existingUser) throw new BadRequestException('Email già registrata');

    //genera chiave di sale
    const salt = await bcrypt.genSalt();

    //hash sulla password
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    // Genera access e refresh token
    const accessToken = this.jwtService.sign({ sub: user.id });

    //Genera refreshToken
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '14d' },
    );

    //generare salt
    const refreshSalt = await bcrypt.genSalt();

    //Salva sessione
    const session = this.sessionRepository.create({
      user,
      refreshTokenHash: await bcrypt.hash(refreshToken, refreshSalt),
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: dayjs().add(14, 'days').toDate(),
    });
    await this.sessionRepository.save(session);

    //Ritorna i token
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    //recupero il payload per capire l utente
    const payload: JwtPayload = await this.jwtService.verifyAsync(
      refreshToken,
      {
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    //Trova tutte la sessione e cerca un match con bcrypt.compare
    const session = await this.sessionRepository.findOne({
      where: { user: { id: payload.sub } },
      relations: ['user'],
    });
    if (!session) throw new UnauthorizedException('Invalid session');

    //verifica scadenza se JWT anche per il refreshToken
    const isValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    //Genera nuovi token
    const accessToken = this.jwtService.sign({ sub: session.user.id });
    const newRefreshToken = this.jwtService.sign(
      { sub: session.user.id },
      { expiresIn: '14d' },
    );

    //Hasha e salva il nuovo refresh token
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(newRefreshToken, salt);
    session.refreshTokenHash = hashed;

    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

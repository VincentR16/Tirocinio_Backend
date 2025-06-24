import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '../auth/session.entity';
import { User } from 'src/user/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';
import { SignInDto } from './dto/signIn.dto';
import * as bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { LogInDto } from './dto/logIn.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    private readonly jwtService: JwtService,
  ) {}

  async logIn(dto: LogInDto, req: Request) {
    const { email, password } = dto;

    const user = await this.userRepository.findOneOrFail({
      where: { email },
    });

    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({ sub: user.id });
    const refreshToken = uuid(); // o genera un token random sicuro

    // Salva sessione nel DB
    const session = this.sessionRepository.create({
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
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

  async singIn(dto: SignInDto, req: Request) {
    const { password } = dto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    // Genera access e refresh token
    const accessToken = this.jwtService.sign({ sub: user.id });
    const refreshToken = uuid();

    //Salva sessione
    const session = this.sessionRepository.create({
      user,
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
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
}

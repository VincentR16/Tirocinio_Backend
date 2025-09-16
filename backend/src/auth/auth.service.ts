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
import { UserRoles } from 'src/common/types/userRoles';
import { Patient } from 'src/patient/patient.entity';
import { Doctor } from 'src/doctor/doctor.entity';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { twoFactorAuthenticationDto } from './dto/2FA.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    private readonly jwtService: JwtService,
  ) {}

  async logIn(dto: LogInDto): Promise<User> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) throw new UnauthorizedException('Invalid Email');

    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async signUp(dto: SignUpDto): Promise<{ qrCodeUrl: string; user: User }> {
    const { ssn, ospidal, role, password, email, phone } = dto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }],
    });
    if (existingUser)
      throw new BadRequestException('Email or Phone number already exists');

    //genera chiave di sale
    const salt = await bcrypt.genSalt();
    //hash sulla password
    const hashedPassword = await bcrypt.hash(password, salt);
    //creo chiave segreta per 2FA
    const secret = authenticator.generateSecret();

    const user = this.userRepository.create({
      ...dto,
      twoFactorAuthenticationSecret: secret,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    //creo la classe patient o la classe doctor a seconda di quale sia il ruolo
    if (role === UserRoles.PATIENT) {
      const patient = this.patientRepository.create({
        ssn,
        user,
      });
      await this.patientRepository.save(patient);
    } else {
      const doctor = this.doctorRepository.create({
        ospidal,
        user,
      });
      await this.doctorRepository.save(doctor);
    }
    const qrCodeUrl = await this.generateQrCodeDataUrl(email, secret);
    if (!qrCodeUrl) throw new Error('is not possible to generate the url');

    return { qrCodeUrl, user };
  }

  async logout(req: Request) {
    const user = req.user as User;
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    const sessions = await this.sessionRepository.find({
      where: {
        user: { id: user.id },
        deviceInfo,
      },
      relations: ['user'],
    });

    await this.sessionRepository.remove(sessions); // elimina tutti
  }

  async refreshTokens(
    req: AuthenticatedRequest,
  ): Promise<{ accessToken: string }> {
    //controllo e valido il refreshToken
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    //Estrae userid dal payload (utile perche non usando la guardia i campi di req non vengono implemtnati)
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(oldRefreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh Token');
    }
    const userId = payload.userId;

    //Trova tutte la sessione per quello specifico dispositivo
    const session = await this.sessionRepository.findOne({
      where: {
        user: { id: userId },
        deviceInfo: req.headers['user-agent'] || 'unknown',
      },
      relations: ['user'],
    });
    if (!session) throw new UnauthorizedException('Invalid session');

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
    //salvo il nuovo token nella sessione
    const newPayload: JwtPayload = {
      userId: session.user.id,
      role: session.user.role,
    };
    //creo il token
    const accessToken = this.jwtService.sign(newPayload);

    await this.sessionRepository.save(session);

    return {
      accessToken,
    };
  }

  async generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
    const optAuthUrl = authenticator.keyuri(email, 'MedTrust', secret);
    return await toDataURL(optAuthUrl);
  }

  async isTwoFactorAuthenticationCodeValid(
    dto: twoFactorAuthenticationDto,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, twoFactorAuthenticationCode } = dto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('Invalid UserId');

    //validate the 2fa code
    const isCodeValid = authenticator.verify({
      token: twoFactorAuthenticationCode,
      secret: user.twoFactorAuthenticationSecret,
    });

    if (!isCodeValid) throw new UnauthorizedException('2FA code Not Valid!');

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

  private async createTokens(user: User): Promise<{
    accessToken: string;
    refreshTokenHash: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      userId: user.id,
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

  async getQrCodeUrl(id: string) {
    const result = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!result) throw new BadRequestException('No user found');

    return this.generateQrCodeDataUrl(
      result.email,
      result.twoFactorAuthenticationSecret,
    );
  }
}

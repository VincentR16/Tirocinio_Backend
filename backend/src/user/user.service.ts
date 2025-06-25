import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(user: User) {
    const result = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (!result) throw new BadRequestException('Utente non trovato');
    return result;
  }
}

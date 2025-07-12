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

  async getMe(userId: string): Promise<User> {
    const result = await this.userRepository.findOne({
      where: [{ id: userId }],
    });

    if (!result) throw new BadRequestException('Utente non trovato');
    return result;
  }
}

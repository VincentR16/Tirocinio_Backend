import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/updateProfile.dto';

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
  async updateUser(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: [{ id: userId }],
    });

    if (!user) {
      throw new BadRequestException('Utente non trovato');
    }

    Object.assign(user, dto);
    return await this.userRepository.save(user);
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: [{ id: userId }],
    });
    if (!user) {
      throw new BadRequestException('Utente non trovato');
    }
    return await this.userRepository.delete({ id: userId });
  }
}

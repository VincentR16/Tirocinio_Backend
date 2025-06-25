import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './user.entity';
import { Request } from 'express';
import { CurrentUser } from 'src/common/decoretor/user.decoretor';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/profile')
  profile(@CurrentUser() user: User): Promise<User> {
    return this.userService.getProfile(user);
  }
}

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthenticatedRequest } from 'src/common/types/authRequest';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  profile(@Req() req: AuthenticatedRequest): Promise<User> {
    return this.userService.getMe(req.user.userId);
  }
}

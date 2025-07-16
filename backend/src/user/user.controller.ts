import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthenticatedRequest } from 'src/common/types/authRequest';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UpdateProfileDto } from './dto/updateProfile.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  profile(@Req() req: AuthenticatedRequest): Promise<User> {
    return this.userService.getMe(req.user.userId);
  }
  @Patch('/me')
  async updateUser(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.userService.updateUser(req.user.userId, dto);
    return { message: 'Update user success' };
  }
  @Delete('/me')
  async deleteUser(@Req() req: AuthenticatedRequest) {
    await this.userService.deleteUser(req.user.userId);
    return { message: 'Delete user success' };
  }
}

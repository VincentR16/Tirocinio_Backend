import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { UserId } from 'src/common/decoretor/user-id.decoretor';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  profile(@UserId() userId: string): Promise<User> {
    return this.userService.getMe(userId);
  }
  @Patch('/me')
  async updateUser(@Body() dto: UpdateProfileDto, @UserId() userId: string) {
    await this.userService.updateUser(userId, dto);
    return { message: 'Update user success' };
  }
  @Delete('/me')
  async deleteUser(@UserId() userId: string) {
    await this.userService.deleteUser(userId);
    return { message: 'Delete user success' };
  }
}

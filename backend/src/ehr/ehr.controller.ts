import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EHRService } from './ehr.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateEhrDTO } from './dto/createEHR.dto';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';

@Controller('EHR')
@UseGuards(RolesGuard)
export class EHRController {
  constructor(private readonly ehrService: EHRService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoles.DOCTOR)
  createEHR(@Body() dto: CreateEhrDTO, @UserId() userId: string) {
    return this.ehrService.create(dto, userId);
  }
}

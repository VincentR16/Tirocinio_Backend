import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EHRService } from './ehr.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { EhrDTO } from './dto/ehr.dto';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';
import { EHR } from './ehr.entity';

@Controller('EHR')
@UseGuards(RolesGuard)
@UseGuards(JwtAuthGuard)
export class EHRController {
  constructor(private readonly ehrService: EHRService) {}

  @Post('create')
  @Roles(UserRoles.DOCTOR)
  async createEHR(@Body() dto: EhrDTO, @UserId() userId: string) {
    await this.ehrService.create(dto, userId);
    return { message: 'EHR creation success' };
  }

  @Get('Doctor')
  @Roles(UserRoles.DOCTOR)
  getEhrDoctor(@UserId() userId: string): Promise<EHR[]> {
    return this.ehrService.getEhrDoctor(userId);
  }

  @Get('Patient')
  @Roles(UserRoles.PATIENT)
  getEhrPatient(@UserId() userId: string): Promise<EHR[]> {
    return this.ehrService.getEhrPatient(userId);
  }

  @Delete(':id')
  @Roles(UserRoles.DOCTOR)
  async deleteEhr(@UserId() userId: string, @Param('id') ehrId: string) {
    await this.ehrService.delete(userId, ehrId);
    return { message: 'EHR deleted' };
  }

  @Patch(':id')
  @Roles(UserRoles.DOCTOR)
  async patchEhr(
    @UserId() userId: string,
    @Param('id') ehrId: string,
    @Body() dto: EhrDTO,
  ) {
    await this.ehrService.patchEhr(userId, ehrId, dto);
    return { message: ' EHR updated' };
  }

  @Get(':id/pdf')
  getPdf(@Param('id') ehrId: string, @UserId() userId: string) {
    return this.ehrService.getPdf(ehrId, userId);
  }
}

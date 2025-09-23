import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ComiunicationService } from './comunication.service';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';
import { ComunicationType } from 'src/common/types/comunicationType';
import { Comunication } from './comunication.entity';

@Controller('comunication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComunicationController {
  constructor(private readonly comunicationService: ComiunicationService) {}

  @Post(':ehrId/send')
  @Roles(UserRoles.DOCTOR)
  async send(@UserId() userId: string, @Param('ehrId') ehrId: string) {
    return this.comunicationService.sendToOspidal(ehrId, userId);
  }

  @Get()
  @Roles(UserRoles.DOCTOR)
  async getComunications(
    @UserId() userId: string,
    @Query('type') type: ComunicationType,
  ): Promise<Comunication[]> {
    return this.comunicationService.getComunications(type, userId);
  }
}

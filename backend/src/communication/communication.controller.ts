import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CommunicationService } from './communication.service';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';
import { ComunicationType } from 'src/common/types/comunicationType';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';

@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post(':Id/send')
  @Roles(UserRoles.DOCTOR)
  async send(
    @UserId() userId: string,
    @Param('Id') ehrId: string,
    @Body('hospital') hospital: string,
  ) {
    return this.communicationService.sendToOspidal(ehrId, userId, hospital);
  }

  @Get()
  @Roles(UserRoles.DOCTOR)
  async getComunications(
    @UserId() userId: string,
    @Query('type') type: ComunicationType,
    @Query('page') page: number,
  ): Promise<PaginatedComunicationResponse> {
    return this.communicationService.getComunications(type, userId, page);
  }
}

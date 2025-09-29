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
import { ComiunicationService } from './comunication.service';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';
import { ComunicationType } from 'src/common/types/comunicationType';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';

@Controller('comunication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComunicationController {
  constructor(private readonly comunicationService: ComiunicationService) {}

  @Post(':Id/send')
  @Roles(UserRoles.DOCTOR)
  async send(
    @UserId() userId: string,
    @Param('Id') ehrId: string,
    @Body('hospital') hospital: string,
  ) {
    return this.comunicationService.sendToOspidal(ehrId, userId, hospital);
  }

  @Get()
  @Roles(UserRoles.DOCTOR)
  async getComunications(
    @UserId() userId: string,
    @Query('type') type: ComunicationType,
    @Query('page') page: number,
  ): Promise<PaginatedComunicationResponse> {
    return this.comunicationService.getComunications(type, userId, page);
  }
}

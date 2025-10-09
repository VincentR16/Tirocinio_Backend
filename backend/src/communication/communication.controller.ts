import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CommunicationType } from 'src/common/types/communicationType';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';
import { ExternalCommunicationDto } from './dto/externalCommunication.dto';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CommunicationStatus } from 'src/common/types/communicationStatus';

@Controller('communication')
@UseGuards(ThrottlerGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post(':Id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.DOCTOR)
  async send(
    @UserId() userId: string,
    @Param('Id') ehrId: string,
    @Body('hospital') hospital: string,
  ) {
    return this.communicationService.sendToOspidal(ehrId, userId, hospital);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SkipThrottle()
  @Roles(UserRoles.DOCTOR)
  async getComunications(
    @UserId() userId: string,
    @Query('type') type: CommunicationType,
    @Query('page') page: number,
  ): Promise<PaginatedComunicationResponse> {
    return this.communicationService.getComunications(type, userId, page);
  }

  @Post('/receive')
  @Throttle({ default: { ttl: 30000, limit: 2 } })
  async receiveExternalCommunication(
    @Body() externalCommunicationDto: ExternalCommunicationDto,
  ) {
    return this.communicationService.externalCommunication(
      externalCommunicationDto,
    );
  }

  @Patch(':Id/status')
  @SkipThrottle()
  async updateCommunication(
    @UserId() userId: string,
    @Param('Id') communicationId: string,
    @Body('status') status: CommunicationStatus,
  ) {
    return this.communicationService.update(userId, communicationId, status);
  }
}

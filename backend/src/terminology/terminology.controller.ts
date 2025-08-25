import { Controller, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { TerminologyService } from './terminology.service';
import { TerminologyDto } from './dto/termilogy.dto';
import { TerminologyResponseDto } from './dto/terminologyResponse.dto';

@Controller('terminologies')
export class TerminologyController {
  constructor(private readonly termService: TerminologyService) {}
  @Get('allergy')
  async getAllergies(
    @Query() dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return await this.termService.getAllergies(dto);
  }

  @Get('observation')
  getObservations(
    @Query() dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return this.termService.getObservations(dto);
  }

  @Get('condition')
  getConditions(
    @Query() dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return this.termService.getConditions(dto);
  }
  @Get('procedure')
  getProcedures(
    @Query() dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return this.termService.getProcedures(dto);
  }
  @Get('medication')
  getMedications(
    @Query() dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return this.termService.getMedications(dto);
  }
}

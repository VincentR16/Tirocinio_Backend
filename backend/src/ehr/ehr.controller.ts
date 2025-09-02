import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EHRService } from './ehr.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { EhrDTO } from './dto/ehr.dto';
import { UserId } from 'src/common/decoretor/user-id.decoretor';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRoles } from 'src/common/types/userRoles';
import { Roles } from 'src/common/decoretor/user-role.decoretor';
import { EHR } from './ehr.entity';

@Controller('ehr')
export class EHRController {
  constructor(private readonly ehrService: EHRService) {}

  @Post('create')
  async createEHR(@Body() dto: EhrDTO, @UserId() userId: string) {
    await this.ehrService.create(dto, userId);
    return { message: 'EHR creation success' };
  }

  @Get('doctor')
  getEhrDoctor(@UserId() userId: string): Promise<EHR[]> {
    return this.ehrService.getEhrDoctor(userId);
  }

  @Get('patient')
  @Roles(UserRoles.PATIENT)
  getEhrPatient(@UserId() userId: string) {
    return this.ehrService.getEhrPatient(userId);
  }
  /*@Get(':id/pdf')
  async getPdf(
    @Param('id') ehrId: string,
    @UserId() userId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.ehrService.getPdf(ehrId, userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ehr-${ehrId}.pdf"`,
    );
    res.send(pdfBuffer);
  }*/
}

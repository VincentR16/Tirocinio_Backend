import { Controller, Post } from '@nestjs/common';
import { EHRService } from './ehr.service';

@Controller('EHR')
export class EHRController {
  constructor(private readonly ehrService: EHRService) {}

  @Post('create')
  createEHR() {
    return this.ehrService.create();
  }
}

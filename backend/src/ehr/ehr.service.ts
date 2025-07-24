import { Injectable } from '@nestjs/common';
import { CreateEhrDTO } from './dto/createEHR.dto';

@Injectable()
export class EHRService {
  create(dto: CreateEhrDTO, userId: string) {
    throw new Error('Method not implemented.');
  }
}

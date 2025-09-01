import { Module } from '@nestjs/common';
import { EHRController } from './ehr.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { EHRService } from './ehr.service';
import { Patient } from 'src/patient/patient.entity';
import { Doctor } from 'src/doctor/doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EHR, Patient, Doctor])],
  providers: [EHRService],
  controllers: [EHRController],
})
export class EHRModule {}

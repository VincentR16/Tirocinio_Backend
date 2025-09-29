import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EHR } from 'src/ehr/ehr.entity';
import { Communication } from './communication.entity';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EHR, Doctor, Communication])],
  providers: [CommunicationService],
  controllers: [CommunicationController],
})
export class CommunicationModule {}

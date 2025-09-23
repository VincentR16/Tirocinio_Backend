import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EHR } from 'src/ehr/ehr.entity';
import { Comunication } from './comunication.entity';
import { ComiunicationService } from './comunication.service';
import { ComunicationController } from './comunication.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EHR, Doctor, Comunication])],
  providers: [ComiunicationService],
  controllers: [ComunicationController],
})
export class ComunicationModule {}

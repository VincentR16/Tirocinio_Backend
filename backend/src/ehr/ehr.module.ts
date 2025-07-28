import { Module } from '@nestjs/common';
import { EHRController } from './ehr.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { EHRService } from './ehr.service';
import { User } from 'src/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EHR, User])],
  providers: [EHRService],
  controllers: [EHRController],
})
export class EHRModule {}

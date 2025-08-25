import { Module } from '@nestjs/common';
import { TerminologyService } from './terminology.service';
import { TerminologyController } from './terminology.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [TerminologyService],
  controllers: [TerminologyController],
})
export class TermilogyModule {}

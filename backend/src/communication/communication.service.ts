import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EHR } from 'src/ehr/ehr.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Communication } from './communication.entity';
import { Bundle, OperationOutcome } from 'fhir/r4';
import axios from 'axios';
import { CommunicationType } from 'src/common/types/communicationType';
import { CommunicationStatus } from 'src/common/types/communicationStatus';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication)
    private readonly comunicationRepository: Repository<Communication>,
    @InjectRepository(EHR)
    private readonly ehrRepository: Repository<EHR>,
    @InjectRepository(Doctor)
    private readonly doctorRespository: Repository<Doctor>,
  ) {}

  async createComunication(
    ehrId: string,
    hospital: string,
    type: CommunicationType,
    status: CommunicationStatus,
    doctor: Doctor,
    message: Bundle | OperationOutcome,
  ) {
    const comunication = this.comunicationRepository.create({
      ehr: { id: ehrId } as EHR,
      hospital,
      type,
      status,
      doctor,
      message,
    });

    await this.comunicationRepository.save(comunication);
  }

  async getComunications(
    type: CommunicationType,
    userId: string,
    page: number,
  ): Promise<PaginatedComunicationResponse> {
    const limit = 8;
    const skip = (page - 1) * limit;

    const [comunications, totalItems] = await this.comunicationRepository
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.doctor', 'd')
      .leftJoinAndSelect('d.user', 'user')
      .leftJoinAndSelect('c.ehr', 'ehr')
      .where('d.userId = :userId', { userId })
      .andWhere('c.type = :type', { type })
      .skip(skip)
      .take(limit)
      .orderBy('c.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    return {
      comunications,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        itemsPerPage: limit,
      },
    };
  }

  async sendToOspidal(ehrId: string, doctorId: string, hospital: string) {
    const ehr = await this.ehrRepository.findOne({
      where: { id: ehrId },
    });
    if (!ehr) throw new BadRequestException('EHR non trovata');

    const doctor = await this.doctorRespository.findOne({
      where: { userId: doctorId },
    });
    if (!doctor) throw new InternalServerErrorException('Doctor not found');

    const bundle = ehr.bundle;

    // INVIO a HAPI FHIR (R4)
    const HAPI_R4_BASE = 'https://hapi.fhir.org/baseR4';
    const res = await axios.post<Bundle | OperationOutcome>(
      HAPI_R4_BASE,
      bundle,
      {
        headers: { 'Content-Type': 'application/fhir+json' },
        timeout: 15000,
      },
    );
    await this.createComunication(
      ehrId,
      hospital,
      CommunicationType.OUTGOING,
      CommunicationStatus.DELIVERED,
      doctor,
      res.data,
    );
    return {
      httpStatus: res.status,
      data: res.data,
    };
  }
}

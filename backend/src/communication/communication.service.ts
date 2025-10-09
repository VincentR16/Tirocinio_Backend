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
import { Bundle, OperationOutcome, Patient } from 'fhir/r4';
import axios from 'axios';
import { CommunicationType } from 'src/common/types/communicationType';
import { CommunicationStatus } from 'src/common/types/communicationStatus';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';
import { ExternalCommunicationDto } from './dto/externalCommunication.dto';
import { Fhir } from 'fhir';

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

  async externalCommunication(
    externalCommunicationDto: ExternalCommunicationDto,
  ) {
    const { email, json, hospital } = externalCommunicationDto;
    const doctor = await this.doctorRespository.findOne({
      where: {
        user: {
          email: email,
        },
      },
    });
    if (!doctor) throw new BadRequestException('Email not valid');

    const fhir = new Fhir();
    const result = fhir.validate(json, { errorOnUnexpected: true });

    if (!result.valid) return result.messages;

    const communication = this.comunicationRepository.create({
      type: CommunicationType.INCOMING,
      status: CommunicationStatus.PENDING,
      doctor,
      hospital,
      message: json,
    });
    await this.comunicationRepository.save(communication);
  }

  async update(
    userId: string,
    communicationId: string,
    status: CommunicationStatus,
  ) {
    if (
      status !== CommunicationStatus.CANCELLED &&
      status !== CommunicationStatus.RECEIVED
    ) {
      throw new BadRequestException('Bad request!');
    }

    const communication = await this.comunicationRepository.findOne({
      where: { id: communicationId, status: CommunicationStatus.PENDING },
    });
    if (!communication) throw new BadRequestException('No communication found');

    if (status == CommunicationStatus.CANCELLED) {
      const doctor = await this.doctorRespository.findOne({
        where: { userId },
      });
      if (!doctor) throw new BadRequestException('No doctor found');

      const bundle = communication.message as Bundle;
      const patient = bundle.entry?.[0]?.resource as Patient | undefined;
      const patientEmail =
        patient?.telecom?.find((t) => t.system === 'email')?.value ?? 'N/A';

      const ehr = this.ehrRepository.create({
        patient,
        patientEmail,
        createdBy: doctor,
        bundle: bundle,
      });
      await this.ehrRepository.save(ehr);

      communication.ehr = ehr;
    }
    communication.status = status;
    await this.comunicationRepository.save(communication);
  }
}

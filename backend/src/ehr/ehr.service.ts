import { BadRequestException, Injectable } from '@nestjs/common';
import { EhrDTO } from './dto/ehr.dto';
import PDFDocument from 'pdfkit';
import { InjectRepository } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { Repository } from 'typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EhrPaginationDto } from './dto/pagination.dto';
import { PaginatedResponse } from 'src/common/types/paginationResponse';

@Injectable()
export class EHRService {
  constructor(
    @InjectRepository(EHR)
    private readonly ehrRepository: Repository<EHR>,
    @InjectRepository(Doctor)
    private readonly doctorRespository: Repository<Doctor>,
  ) {}

  async create(dto: EhrDTO, userId: string) {
    // opzionale: collega chi crea
    const doctor = await this.doctorRespository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!doctor) throw new BadRequestException('Doctor non valid');

    const ehr = this.ehrRepository.create({
      createdBy: doctor,
      patientEmail: dto.patientEmail,
      patient: dto.patient,
      encounter: dto.encounter,
      allergies: dto.allergies ?? [],
      observations: dto.observations ?? [],
      condition: dto.condition,
      procedure: dto.procedure,
      medications: dto.medications ?? [],
    });

    await this.ehrRepository.save(ehr);
  }

  async getEhrDoctor(
    userId: string,
    paginationDto: EhrPaginationDto,
  ): Promise<PaginatedResponse> {
    const { page = 1, search } = paginationDto;
    const limit = 5;

    const skip = (page - 1) * limit;

    const queryBuilder = this.ehrRepository
      .createQueryBuilder('ehr')
      .leftJoinAndSelect('ehr.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.user', 'user')
      .where('createdBy.userId = :userId', { userId });

    if (search?.trim().length) {
      queryBuilder
        .where('LOWER(ehr.patientEmail) LIKE LOWER(:search)', {
          search: `%${search}%`,
        })
        .orWhere("ehr.patient->'name'->0->>'family' ILIKE :search", {
          search: `%${search}%`,
        })
        .orWhere("ehr.patient->'name'->0->'given'->>0 ILIKE :search", {
          search: `%${search}%`,
        })
        .orWhere('ehr.patient::text ILIKE :search', {
          search: `%${search}%`,
        });
    }
    const [ehr, totalItems] = await queryBuilder
      .orderBy('ehr.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    return {
      ehr,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  getEhrPatient(userId: string, paginationdto: EhrPaginationDto) {
    return undefined;
  }

  async getPdf(ehrId: string, userId: string): Promise<Buffer> {
    const result = await this.ehrRepository.findOne({
      where: { id: ehrId, createdBy: { userId } },
      relations: ['createdBy'],
    });

    if (!result) throw new BadRequestException('No EHR found');

    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const endPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // ===== HEADER =====
    doc.fontSize(20).text('Electronic Health Record', { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.moveDown(2);

    // ===== EHR METADATA =====
    doc.fontSize(16).text('EHR INFORMATION', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Created by: Dr. ${result.createdBy?.user.surname ?? 'Unknown'}`);
    doc.text(
      `Created on: ${result.createdAt ? result.createdAt.toLocaleDateString() : 'N/A'}`,
    );
    doc.text(`EHR ID: ${ehrId}`);
    doc.moveDown(2);

    // ===== PATIENT INFORMATION =====
    const patient = result.patient;
    if (!patient) throw new Error('Patient information not found');

    doc.fontSize(16).text('PATIENT INFORMATION', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(
      `Name: ${patient.name?.[0]?.given?.join(' ') ?? 'N/A'} ${patient.name?.[0]?.family ?? 'N/A'}`,
    );
    doc.text(`Email: ${result.patientEmail ?? 'N/A'}`);
    doc.text(`Gender: ${patient.gender ?? 'N/A'}`);
    doc.text(
      `Date of Birth: ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'N/A'}`,
    );
    doc.text(
      `Phone: ${patient.telecom?.find((t) => t.system === 'phone')?.value ?? 'N/A'}`,
    );
    doc.text(
      `SSN: ${patient.identifier?.find((i) => i.type?.text === 'SSN')?.value ?? patient.id ?? 'N/A'}`,
    );
    doc.text(
      `Address: ${patient.address?.[0]?.text ?? patient.address?.[0]?.city ?? 'N/A'}`,
    );
    doc.moveDown();

    // ===== ENCOUNTER INFORMATION =====
    if (result.encounter) {
      doc.fontSize(16).text('ENCOUNTER INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);

      const encounter = result.encounter;
      doc.text(`Status: ${encounter.status ?? 'N/A'}`);
      doc.text(
        `Class: ${encounter.class?.display ?? encounter.class?.code ?? 'N/A'}`,
      );
      doc.text(
        `Type: ${encounter.type?.[0]?.text ?? encounter.type?.[0]?.coding?.[0]?.display ?? 'N/A'}`,
      );
      doc.text(
        `Location: ${encounter.location?.[0]?.location?.display ?? 'N/A'}`,
      );
      doc.text(
        `Service Provider: ${encounter.serviceProvider?.display ?? 'N/A'}`,
      );
      doc.text(
        `Start: ${encounter.period?.start ? new Date(encounter.period.start).toLocaleString() : 'N/A'}`,
      );
      doc.text(
        `End: ${encounter.period?.end ? new Date(encounter.period.end).toLocaleString() : 'Ongoing'}`,
      );
      doc.text(`Reason: ${encounter.reasonCode?.[0]?.text ?? 'N/A'}`);
      doc.moveDown();
    }

    // ===== OBSERVATIONS (ARRAY) =====
    if (result.observations && result.observations.length > 0) {
      doc.fontSize(16).text('OBSERVATIONS', { underline: true });
      doc.moveDown(0.5);

      result.observations.forEach((obs, index) => {
        doc
          .fontSize(14)
          .text(
            `${index + 1}. ${obs.code?.text ?? obs.code?.coding?.[0]?.display ?? 'Unknown Observation'}`,
            { underline: true },
          );
        doc.fontSize(12);
        doc.text(`   Status: ${obs.status ?? 'N/A'}`, { indent: 20 });
        doc.text(
          `   Category: ${obs.category?.[0]?.text ?? obs.category?.[0]?.coding?.[0]?.display ?? 'N/A'}`,
          { indent: 20 },
        );
        doc.text(
          `   Value: ${obs.valueQuantity?.value ?? obs.valueString ?? obs.valueBoolean ?? 'N/A'} ${obs.valueQuantity?.unit ?? ''}`,
          { indent: 20 },
        );
        doc.text(`   Code: ${obs.code?.coding?.[0]?.code ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(`   Performer: ${obs.performer?.[0]?.display ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(
          `   Date: ${obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleString() : 'N/A'}`,
          { indent: 20 },
        );

        if (obs.note && obs.note.length > 0) {
          doc.text(`   Comment: ${obs.note[0].text ?? 'N/A'}`, { indent: 20 });
        }

        doc.moveDown(0.5);
      });

      doc.moveDown();
    }

    // ===== ALLERGIES (ARRAY) =====
    if (result.allergies && result.allergies.length > 0) {
      doc.fontSize(16).text('ALLERGIES & INTOLERANCES', { underline: true });
      doc.moveDown(0.5);

      result.allergies.forEach((allergy, index) => {
        doc
          .fontSize(14)
          .text(
            `${index + 1}. ${allergy.code?.text ?? allergy.code?.coding?.[0]?.display ?? 'Unknown Allergen'}`,
            { underline: true },
          );
        doc.fontSize(12);
        doc.text(`   Substance: ${allergy.code?.text ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(
          `   Clinical Status: ${allergy.clinicalStatus?.coding?.[0]?.code ?? allergy.clinicalStatus?.text ?? 'N/A'}`,
          { indent: 20 },
        );
        doc.text(`   Criticality: ${allergy.criticality ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(`   Type: ${allergy.type ?? 'N/A'}`, { indent: 20 });
        doc.text(`   Category: ${allergy.category?.[0] ?? 'N/A'}`, {
          indent: 20,
        });

        if (allergy.reaction && allergy.reaction.length > 0) {
          doc.text(
            `   Reaction: ${allergy.reaction[0].manifestation?.[0]?.text ?? 'N/A'}`,
            { indent: 20 },
          );
          doc.text(`   Severity: ${allergy.reaction[0].severity ?? 'N/A'}`, {
            indent: 20,
          });
        }

        doc.text(
          `   Onset: ${allergy.onsetDateTime ? new Date(allergy.onsetDateTime).toLocaleDateString() : 'N/A'}`,
          { indent: 20 },
        );
        doc.moveDown(0.5);
      });

      doc.moveDown();
    }

    // ===== CONDITIONS =====
    if (result.condition) {
      doc.fontSize(16).text('CONDITIONS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);

      const condition = result.condition;
      doc.text(
        `Condition: ${condition.code?.text ?? condition.code?.coding?.[0]?.display ?? 'N/A'}`,
      );
      doc.text(
        `Clinical Status: ${condition.clinicalStatus?.coding?.[0]?.code ?? condition.clinicalStatus?.text ?? 'N/A'}`,
      );
      doc.text(
        `Verification Status: ${condition.verificationStatus?.coding?.[0]?.code ?? 'N/A'}`,
      );
      doc.text(
        `Severity: ${condition.severity?.text ?? condition.severity?.coding?.[0]?.display ?? 'N/A'}`,
      );
      doc.text(
        `Category: ${condition.category?.[0]?.text ?? condition.category?.[0]?.coding?.[0]?.display ?? 'N/A'}`,
      );
      doc.text(`Body Site: ${condition.bodySite?.[0]?.text ?? 'N/A'}`);
      doc.text(
        `Onset: ${condition.onsetDateTime ? new Date(condition.onsetDateTime).toLocaleDateString() : 'N/A'}`,
      );
      doc.text(
        `Recorded: ${condition.recordedDate ? new Date(condition.recordedDate).toLocaleDateString() : 'N/A'}`,
      );
      doc.text(`Recorder: ${condition.recorder?.display ?? 'N/A'}`);

      if (condition.note && condition.note.length > 0) {
        doc.text(`Notes: ${condition.note[0].text ?? 'N/A'}`);
      }

      doc.moveDown();
    }

    // ===== PROCEDURES =====
    if (result.procedure) {
      doc.fontSize(16).text('PROCEDURES', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);

      const procedure = result.procedure;
      doc.text(
        `Procedure: ${procedure.code?.text ?? procedure.code?.coding?.[0]?.display ?? 'N/A'}`,
      );
      doc.text(`Status: ${procedure.status ?? 'N/A'}`);
      doc.text(
        `Performed: ${procedure.performedDateTime ? new Date(procedure.performedDateTime).toLocaleString() : procedure.performedPeriod?.start ? `${new Date(procedure.performedPeriod.start).toLocaleString()} - ${procedure.performedPeriod.end ? new Date(procedure.performedPeriod.end).toLocaleString() : 'Ongoing'}` : 'N/A'}`,
      );
      doc.text(
        `Performer: ${procedure.performer?.[0]?.actor?.display ?? 'N/A'}`,
      );
      doc.text(`Location: ${procedure.location?.display ?? 'N/A'}`);
      doc.text(
        `Reason: ${procedure.reasonCode?.[0]?.text ?? procedure.reasonReference?.[0]?.display ?? 'N/A'}`,
      );

      if (procedure.note && procedure.note.length > 0) {
        doc.text(`Notes: ${procedure.note[0].text ?? 'N/A'}`);
      }

      doc.moveDown();
    }

    // ===== MEDICATIONS (ARRAY) =====
    if (result.medications && result.medications.length > 0) {
      doc.fontSize(16).text('MEDICATIONS', { underline: true });
      doc.moveDown(0.5);

      result.medications.forEach((med, index) => {
        doc
          .fontSize(14)
          .text(
            `${index + 1}. ${med.medicationCodeableConcept?.text ?? med.medicationCodeableConcept?.coding?.[0]?.display ?? 'Unknown Medication'}`,
            { underline: true },
          );
        doc.fontSize(12);
        doc.text(`   Status: ${med.status ?? 'N/A'}`, { indent: 20 });
        doc.text(
          `   Medication ID: ${med.medicationCodeableConcept?.coding?.[0]?.code ?? 'N/A'}`,
          { indent: 20 },
        );

        if (med.dosageInstruction && med.dosageInstruction.length > 0) {
          doc.text(`   Dosage: ${med.dosageInstruction[0].text ?? 'N/A'}`, {
            indent: 20,
          });
          doc.text(
            `   Route: ${med.dosageInstruction[0].route?.text ?? med.dosageInstruction[0].route?.coding?.[0]?.display ?? 'N/A'}`,
            { indent: 20 },
          );
          doc.text(
            `   Frequency: ${med.dosageInstruction[0].timing?.repeat?.frequency ?? 'N/A'} times per ${med.dosageInstruction[0].timing?.repeat?.period ?? 'N/A'} ${med.dosageInstruction[0].timing?.repeat?.periodUnit ?? ''}`,
            { indent: 20 },
          );
        }

        let startDate: string | undefined;
        let endDate: string | undefined;
        if (med.dosageInstruction && med.dosageInstruction.length > 0) {
          const dosage = med.dosageInstruction[0];

          // Controlla solo repeat.boundsPeriod (che è la struttura corretta)
          if (dosage.timing?.repeat?.boundsPeriod) {
            startDate = dosage.timing.repeat.boundsPeriod.start;
            endDate = dosage.timing.repeat.boundsPeriod.end;
          }
        }
        doc.text(
          `   Start Date: ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}`,
          { indent: 20 },
        );
        doc.text(
          `   End Date: ${endDate ? new Date(endDate).toLocaleDateString() : 'Ongoing'}`,
          { indent: 20 },
        );
        doc.text(
          `   Reason: ${med.reasonCode?.[0]?.text ?? med.reasonReference?.[0]?.display ?? 'N/A'}`,
          { indent: 20 },
        );

        if (med.note && med.note.length > 0) {
          doc.text(`   Notes: ${med.note[0].text ?? 'N/A'}`, { indent: 20 });
        }

        doc.moveDown(0.5);
      });

      doc.moveDown();
    }

    // ===== FOOTER =====
    doc
      .fontSize(10)
      .text(`Generated by EHR System - ${new Date().toLocaleString()}`, {
        align: 'center',
      });
    doc.text(`This document contains confidential medical information.`, {
      align: 'center',
    });

    doc.end();
    return await endPromise;
  }
}

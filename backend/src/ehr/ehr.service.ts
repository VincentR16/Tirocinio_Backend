import { BadRequestException, Injectable } from '@nestjs/common';
import { EhrDTO } from './dto/ehr.dto';
import PDFDocument from 'pdfkit';
import { InjectRepository } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { Repository } from 'typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EhrPaginationDto } from './dto/pagination.dto';
import { PaginatedResponse } from 'src/common/types/paginationResponse';
import axios from 'axios';
import {
  AllergyIntolerance,
  Bundle,
  Condition,
  Encounter,
  MedicationRequest,
  Observation,
  OperationOutcome,
  Patient,
  Procedure,
} from 'fhir/r4';

export type AnyResource =
  | Patient
  | Encounter
  | Condition
  | Procedure
  | Observation
  | MedicationRequest
  | AllergyIntolerance;
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

  async sendToOspidal(ehrId: string) {
    const ehr = await this.ehrRepository.findOne({
      where: { id: ehrId },
    });
    if (!ehr) throw new BadRequestException('EHR non trovata');

    const bundle = this.buildTransactionBundle(ehr);

    // INVIO a HAPI FHIR (R4) — transaction va postata alla BASE URL, non /Bundle
    const HAPI_R4_BASE = 'https://hapi.fhir.org/baseR4';
    const res = await axios.post<Bundle | OperationOutcome>(
      HAPI_R4_BASE,
      bundle,
      {
        headers: { 'Content-Type': 'application/fhir+json' },
        timeout: 15000,
        // validateStatus: () => true, // se vuoi gestire OperationOutcome tu
      },
    );

    return {
      httpStatus: res.status,
      data: res.data, // sarà un Bundle "transaction-response" o OperationOutcome in caso di errore
    };
  }

  private buildTransactionBundle(ehr: EHR) {
    // 1) Prepara le URN (fullUrl) e cattura gli id originali
    const ids = {
      patient: ehr.patient?.id,
      encounter: ehr.encounter?.id,
      condition: ehr.condition?.id,
      procedure: ehr.procedure?.id,
      allergies: (ehr.allergies ?? []).map((a: AllergyIntolerance) => a.id),
      observations: (ehr.observations ?? []).map((o: Observation) => o.id),
      medications: (ehr.medications ?? []).map((m: MedicationRequest) => m.id),
    };

    const urn = {
      patient: 'urn:uuid:patient1',
      encounter: 'urn:uuid:enc1',
      condition: 'urn:uuid:cond1',
      procedure: 'urn:uuid:proc1',
      allergies: ids.allergies.map((_, i) => `urn:uuid:allergy${i + 1}`),
      observations: ids.observations.map((_, i) => `urn:uuid:obs${i + 1}`),
      medications: ids.medications.map((_, i) => `urn:uuid:medreq${i + 1}`),
    };

    // 2) Clona le risorse, rimuovi id, riscrivi reference → URN
    const P = ehr.patient ? this.prepareResource(ehr.patient) : undefined;
    const E = ehr.encounter ? this.prepareResource(ehr.encounter) : undefined;
    const C = ehr.condition ? this.prepareResource(ehr.condition) : undefined;
    const R = ehr.procedure ? this.prepareResource(ehr.procedure) : undefined;
    const A = (ehr.allergies ?? []).map((x: AllergyIntolerance) =>
      this.prepareResource(x),
    );
    const O = (ehr.observations ?? []).map((x: Observation) =>
      this.prepareResource(x),
    );
    const M = (ehr.medications ?? []).map((x: MedicationRequest) =>
      this.prepareResource(x),
    );

    // mappa sostituzioni: "Patient/{id}" -> urn:uuid:patient1, ecc.
    const refMap: Record<string, string> = {};
    if (ids.patient) refMap[`Patient/${ids.patient}`] = urn.patient;
    if (ids.encounter) refMap[`Encounter/${ids.encounter}`] = urn.encounter;
    if (ids.condition) refMap[`Condition/${ids.condition}`] = urn.condition;
    if (ids.procedure) refMap[`Procedure/${ids.procedure}`] = urn.procedure;

    ids.allergies.forEach((id, i) => {
      if (id) refMap[`AllergyIntolerance/${id}`] = urn.allergies[i];
    });
    ids.observations.forEach((id, i) => {
      if (id) refMap[`Observation/${id}`] = urn.observations[i];
    });
    ids.medications.forEach((id, i) => {
      if (id) refMap[`MedicationRequest/${id}`] = urn.medications[i];
    });

    // Riscrivi TUTTE le reference { reference: "Type/id" } -> URN
    if (P) this.replaceReferences(P, refMap);
    if (E) this.replaceReferences(E, refMap);
    if (C) this.replaceReferences(C, refMap);
    if (R) this.replaceReferences(R, refMap);
    A.forEach((r) => this.replaceReferences(r, refMap));
    O.forEach((r) => this.replaceReferences(r, refMap));
    M.forEach((r) => this.replaceReferences(r, refMap));

    // In ogni caso: assicura che i legami minimi ci siano
    if (E && P) E.subject = { reference: urn.patient };
    if (C && P) C.subject = { reference: urn.patient };
    if (R && P) R.subject = { reference: urn.patient };
    if (C && E) C.encounter = { reference: urn.encounter };
    if (R && E) R.encounter = { reference: urn.encounter };
    O.forEach((obs: Observation) => {
      if (P) obs.subject = { reference: urn.patient };
      if (E) obs.encounter = { reference: urn.encounter };
    });
    M.forEach((mr) => {
      if (P) mr.subject = { reference: urn.patient };
      if (E) mr.encounter = { reference: urn.encounter };
    });

    // 3) Costruisci le entry transaction
    const entry: any[] = [];

    const push = (fullUrl: string, resource: any) => {
      if (!resource) return;
      entry.push({
        fullUrl,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        resource,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        request: { method: 'POST', url: resource.resourceType },
      });
    };

    push(urn.patient, P);
    push(urn.encounter, E);
    push(urn.condition, C);
    push(urn.procedure, R);
    urn.allergies.forEach((u, i) => push(u, A[i]));
    urn.observations.forEach((u, i) => push(u, O[i]));
    urn.medications.forEach((u, i) => push(u, M[i]));

    return { resourceType: 'Bundle', type: 'transaction', entry };
  }

  /** Clona profondo, rimuove id e campi vuoti basilari (opzionale) */
  private prepareResource<T extends AnyResource>(r: T): T {
    const x = JSON.parse(JSON.stringify(r)) as T;
    if (x?.id) delete x.id; // in transaction lasciare che il server assegni l'id
    this.stripEmptyStrings(x);
    return x;
  }

  /** Rimpiazza tutte le occorrenze di { reference: "Type/id" } usando refMap */
  private replaceReferences(obj: any, refMap: Record<string, string>) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj))
      return obj.forEach((o) => this.replaceReferences(o, refMap));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.entries(obj).forEach(([k, v]) => {
      if (k === 'reference' && typeof v === 'string' && refMap[v]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        obj[k] = refMap[v];
      } else {
        this.replaceReferences(v, refMap);
      }
    });
  }

  /** Rimuove stringhe vuote ricorrendo (evita errori banali) */
  private stripEmptyStrings(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj))
      return obj.forEach((o) => this.stripEmptyStrings(o));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const [k, v] of Object.entries(obj)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (v === '') delete obj[k];
      else this.stripEmptyStrings(v);
    }
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

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const endPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Helper function per controllare se c'è abbastanza spazio nella pagina
    const checkPageSpace = (requiredSpace: number) => {
      const currentY = doc.y;
      const pageHeight = doc.page.height - doc.page.margins.bottom;

      if (currentY + requiredSpace > pageHeight) {
        doc.addPage();
      }
    };

    // Helper function per aggiungere separatori
    const addSeparator = () => {
      doc.moveDown(0.5);
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      doc.moveDown(0.5);
    };

    // Helper function per i titoli delle sezioni
    const addSectionTitle = (title: string) => {
      checkPageSpace(40);
      doc.fillColor('#2c3e50').fontSize(16).text(title, { underline: true });
      doc.fillColor('#000000'); // Reset colore
      doc.moveDown(0.5);
    };

    // Helper function per sottotitoli
    const addSubTitle = (title: string, spacing: number = 20) => {
      checkPageSpace(30);
      doc
        .fillColor('#34495e')
        .fontSize(14)
        .text(title, { underline: true, indent: spacing });
      doc.fillColor('#000000');
    };

    // ===== HEADER =====
    doc
      .fillColor('#2c3e50')
      .fontSize(24)
      .text('Electronic Health Record', { align: 'center' });

    doc
      .fillColor('#7f8c8d')
      .fontSize(12)
      .text(`Generated on: ${new Date().toLocaleString()}`, {
        align: 'center',
      });

    doc.fillColor('#000000');
    doc.moveDown(2);
    addSeparator();

    // ===== EHR METADATA =====
    addSectionTitle('EHR INFORMATION');
    doc.fontSize(12);
    doc.text(`Created by: Dr. ${result.createdBy?.user.surname ?? 'Unknown'}`);
    doc.text(
      `Created on: ${result.createdAt ? result.createdAt.toLocaleDateString() : 'N/A'}`,
    );
    doc.text(`EHR ID: ${ehrId}`);
    doc.moveDown(1);
    addSeparator();

    // ===== PATIENT INFORMATION =====
    const patient = result.patient;
    if (!patient) throw new Error('Patient information not found');

    addSectionTitle('PATIENT INFORMATION');
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
    doc.moveDown(1);
    addSeparator();

    // ===== ENCOUNTER INFORMATION =====
    if (result.encounter) {
      addSectionTitle('ENCOUNTER INFORMATION');
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
      doc.moveDown(1);
      addSeparator();
    }

    // ===== OBSERVATIONS (ARRAY) =====
    if (result.observations && result.observations.length > 0) {
      // Controlla se c'è spazio per il titolo + almeno la prima osservazione (circa 160 punti)
      checkPageSpace(160);
      addSectionTitle('OBSERVATIONS');

      result.observations.forEach((obs, index) => {
        // Controlla se c'è spazio per l'intera osservazione (circa 120 punti)
        checkPageSpace(120);

        addSubTitle(
          `${index + 1}. ${obs.code?.text ?? obs.code?.coding?.[0]?.display ?? 'Unknown Observation'}`,
        );
        doc.fontSize(12);
        doc.text(`Status: ${obs.status ?? 'N/A'}`, { indent: 20 });
        doc.text(
          `Category: ${obs.category?.[0]?.text ?? obs.category?.[0]?.coding?.[0]?.display ?? 'N/A'}`,
          { indent: 20 },
        );
        doc.text(
          `Value: ${obs.valueQuantity?.value ?? obs.valueString ?? obs.valueBoolean ?? 'N/A'} ${obs.valueQuantity?.unit ?? ''}`,
          { indent: 20 },
        );
        doc.text(`Code: ${obs.code?.coding?.[0]?.code ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(`Performer: ${obs.performer?.[0]?.display ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(
          `Date: ${obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleString() : 'N/A'}`,
          { indent: 20 },
        );

        if (obs.note && obs.note.length > 0) {
          doc.text(`Comment: ${obs.note[0].text ?? 'N/A'}`, { indent: 20 });
        }
        doc.moveDown(0.8);
      });
      addSeparator();
    }

    // ===== ALLERGIES (ARRAY) =====
    if (result.allergies && result.allergies.length > 0) {
      // Controlla se c'è spazio per il titolo + almeno la prima allergia (circa 200 punti)
      checkPageSpace(200);
      addSectionTitle('ALLERGIES & INTOLERANCES');

      result.allergies.forEach((allergy, index) => {
        // Controlla se c'è spazio per l'intera allergia (circa 150 punti)
        checkPageSpace(150);

        addSubTitle(
          `${index + 1}. ${allergy.code?.text ?? allergy.code?.coding?.[0]?.display ?? 'Unknown Allergen'}`,
        );
        doc.fontSize(12);
        doc.text(`Substance: ${allergy.code?.text ?? 'N/A'}`, { indent: 20 });
        doc.text(
          `Clinical Status: ${allergy.clinicalStatus?.coding?.[0]?.code ?? allergy.clinicalStatus?.text ?? 'N/A'}`,
          { indent: 20 },
        );
        doc.text(`Criticality: ${allergy.criticality ?? 'N/A'}`, {
          indent: 20,
        });
        doc.text(`Type: ${allergy.type ?? 'N/A'}`, { indent: 20 });
        doc.text(`Category: ${allergy.category?.[0] ?? 'N/A'}`, { indent: 20 });

        if (allergy.reaction && allergy.reaction.length > 0) {
          doc.text(
            `Reaction: ${allergy.reaction[0].manifestation?.[0]?.text ?? 'N/A'}`,
            { indent: 20 },
          );
          doc.text(`Severity: ${allergy.reaction[0].severity ?? 'N/A'}`, {
            indent: 20,
          });
        }

        doc.text(
          `Onset: ${allergy.onsetDateTime ? new Date(allergy.onsetDateTime).toLocaleDateString() : 'N/A'}`,
          { indent: 20 },
        );
        doc.moveDown(0.8);
      });
      addSeparator();
    }

    // ===== CONDITIONS =====
    if (result.condition) {
      addSectionTitle('CONDITIONS');
      checkPageSpace(120);

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
      doc.moveDown(1);
      addSeparator();
    }

    // ===== PROCEDURES =====
    if (result.procedure) {
      addSectionTitle('PROCEDURES');
      checkPageSpace(120);

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
      doc.moveDown(1);
      addSeparator();
    }

    // ===== MEDICATIONS (ARRAY) =====
    if (result.medications && result.medications.length > 0) {
      // Controlla se c'è spazio per il titolo + almeno il primo farmaco (circa 200 punti)
      checkPageSpace(200);
      addSectionTitle('MEDICATIONS');

      result.medications.forEach((med, index) => {
        // Controlla se c'è spazio per l'intero farmaco (circa 160 punti)
        checkPageSpace(160);

        addSubTitle(
          `${index + 1}. ${med.medicationCodeableConcept?.text ?? med.medicationCodeableConcept?.coding?.[0]?.display ?? 'Unknown Medication'}`,
        );
        doc.fontSize(12);
        doc.text(`Status: ${med.status ?? 'N/A'}`, { indent: 20 });
        doc.text(
          `Medication ID: ${med.medicationCodeableConcept?.coding?.[0]?.code ?? 'N/A'}`,
          { indent: 20 },
        );

        if (med.dosageInstruction && med.dosageInstruction.length > 0) {
          doc.text(`Dosage: ${med.dosageInstruction[0].text ?? 'N/A'}`, {
            indent: 20,
          });
          doc.text(
            `Route: ${med.dosageInstruction[0].route?.text ?? med.dosageInstruction[0].route?.coding?.[0]?.display ?? 'N/A'}`,
            { indent: 20 },
          );
          doc.text(
            `Frequency: ${med.dosageInstruction[0].timing?.repeat?.frequency ?? 'N/A'} times per ${med.dosageInstruction[0].timing?.repeat?.period ?? 'N/A'} ${med.dosageInstruction[0].timing?.repeat?.periodUnit ?? ''}`,
            { indent: 20 },
          );
        }

        let startDate: string | undefined;
        let endDate: string | undefined;

        if (med.dosageInstruction && med.dosageInstruction.length > 0) {
          const dosage = med.dosageInstruction[0];
          if (dosage.timing?.repeat?.boundsPeriod) {
            startDate = dosage.timing.repeat.boundsPeriod.start;
            endDate = dosage.timing.repeat.boundsPeriod.end;
          }
        }

        doc.text(
          `Start Date: ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}`,
          { indent: 20 },
        );
        doc.text(
          `End Date: ${endDate ? new Date(endDate).toLocaleDateString() : 'Ongoing'}`,
          { indent: 20 },
        );
        doc.text(
          `Reason: ${med.reasonCode?.[0]?.text ?? med.reasonReference?.[0]?.display ?? 'N/A'}`,
          { indent: 20 },
        );

        if (med.note && med.note.length > 0) {
          doc.text(`Notes: ${med.note[0].text ?? 'N/A'}`, { indent: 20 });
        }
        doc.moveDown(0.8);
      });
    }

    // ===== FOOTER =====
    // Vai alla fine dell'ultima pagina per il footer
    doc
      .fontSize(10)
      .fillColor('#7f8c8d')
      .text(`Generated by MedTrust System - ${new Date().toLocaleString()}`, {
        align: 'center',
      });
    doc.text('This document contains confidential medical information.', {
      align: 'center',
    });

    doc.end();
    return await endPromise;
  }
}

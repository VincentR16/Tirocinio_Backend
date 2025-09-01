import { BadRequestException, Injectable } from '@nestjs/common';
import { EhrDTO } from './dto/ehr.dto';
/*import PDFDocument from 'pdfkit';
import {
  AllergyIntolerance,
  Bundle,
  Condition,
  Encounter,
  FhirResource,
  MedicationStatement,
  Observation,
  Patient as PatientFhir,
  Procedure,
} from 'fhir/r4';*/
import { InjectRepository } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { Repository } from 'typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { Patient } from 'src/patient/patient.entity';

@Injectable()
export class EHRService {
  constructor(
    @InjectRepository(EHR)
    private readonly ehrRepository: Repository<EHR>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRespository: Repository<Doctor>,
  ) {}
  getEhrDoctor(userId: string): Promise<EHR[]> {
    return this.ehrRepository.find({
      where: {
        createdBy: { userId },
      },
      relations: ['createdBy'],
    });
  }

  async create(dto: EhrDTO, userId: string) {
    // opzionale: collega chi crea
    const doctor = await this.doctorRespository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!doctor) throw new BadRequestException('Doctor non valid');

    const patientRef = await this.patientRepository.findOne({
      where: {
        user: { email: dto.patientEmail },
      },
      relations: ['user'],
    });

    if (!patientRef) throw new BadRequestException('Paziente not valid');

    const ehr = this.ehrRepository.create({
      createdBy: doctor,
      patientRef: patientRef,
      patient: dto.patient,
      encounter: dto.encounter,
      allergies: dto.allergies ?? [],
      observations: dto.observations ?? [],
      procedure: dto.procedure,
      medications: dto.medications ?? [],
    });

    await this.ehrRepository.save(ehr);
  }

  getEhrPatient(userId: string): Promise<EHR[]> {
    return this.ehrRepository.find({
      where: {
        patientRef: { userId },
      },
      relations: ['patient'],
    });
  }

  /*async getPdf(ehrId: string, userId: string): Promise<Buffer> {
    const result = await this.ehrRepository.findOne({
      where: { id: ehrId, createdBy: { userId } },
      relations: ['doctor'],
    });
    if (!result) throw new BadRequestException('No EHR found');

    const bundle = result.data;

    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const endPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    //  Titolo
    doc.fontSize(18).text('Electronic Health Record', { align: 'center' });
    doc.moveDown();

    // Paziente
    if (!bundle.entry) throw new Error('Invalid bundle: no entries found');

    const patient = bundle.entry.find(
      (e) => e.resource?.resourceType === 'Patient',
    )?.resource as PatientFhir;

    doc
      .fontSize(12)
      .text(
        `Patient: ${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0]?.family}`,
      );
    doc.text(`SSN: ${patient?.id}`);
    doc.moveDown();

    //  Sezioni dinamiche
    const printSection = (
      title: string,
      resources: any[],
      render: (res: any) => string,
    ) => {
      if (!resources.length) return;

      doc.fontSize(14).text(title, { underline: true });
      resources.forEach((res, i) => {
        doc.fontSize(11).text(`${i + 1}. ${render(res)}`, { indent: 10 });
      });
      doc.moveDown();
    };

    const filterByType = <T extends FhirResource>(
      bundle: Bundle,
      type: string,
    ): T[] => {
      const entries = bundle.entry ?? [];

      return entries
        .filter((e): e is { resource: T } => e.resource?.resourceType === type)
        .map((e) => e.resource);
    };

    printSection(
      'Observations',
      filterByType<Observation>(bundle, 'Observation'),
      (obs: Observation) =>
        `${obs.code?.text ?? '??'} — ${obs.valueQuantity?.value ?? '?'} ${obs.valueQuantity?.unit ?? ''}`,
    );

    printSection(
      'Conditions',
      filterByType<Condition>(bundle, 'Condition'),
      (c: Condition) =>
        `${c.code?.text ?? '??'} — ${c.clinicalStatus?.text ?? ''}`,
    );

    printSection(
      'Allergies',
      filterByType<AllergyIntolerance>(bundle, 'AllergyIntolerance'),
      (a: AllergyIntolerance) =>
        `${a.code?.text ?? '??'} (${a.clinicalStatus?.text ?? ''})`,
    );

    printSection(
      'Procedures',
      filterByType<Procedure>(bundle, 'Procedure'),
      (p: Procedure) =>
        `${p.code?.text ?? '??'} on ${p.performedDateTime ?? p.performedPeriod?.start ?? ''}`,
    );

    printSection(
      'Encounters',
      filterByType<Encounter>(bundle, 'Encounter'),
      (e: Encounter) =>
        `${e.class?.code ?? '??'}: ${e.period?.start ?? ''} → ${e.period?.end ?? ''}`,
    );

    printSection(
      'Medications',
      filterByType<MedicationStatement>(bundle, 'MedicationStatement'),
      (m: MedicationStatement) =>
        `${m.medicationCodeableConcept?.text ?? '??'} — ${m.dosage?.[0]?.text ?? ''}`,
    );

    doc.end();
    return await endPromise;
  }*/
}

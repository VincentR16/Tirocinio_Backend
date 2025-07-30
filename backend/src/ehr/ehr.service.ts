import { BadRequestException, Injectable } from '@nestjs/common';
import { EhrDTO } from './dto/ehr.dto';
import PDFDocument from 'pdfkit';
import {
  AllergyIntolerance,
  Bundle,
  Condition,
  Encounter,
  FhirResource,
  MedicationStatement,
  Observation,
  Patient,
  Procedure,
} from 'fhir/r4';
import { InjectRepository } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class EHRService {
  constructor(
    @InjectRepository(EHR)
    private readonly ehrRepository: Repository<EHR>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: EhrDTO, userId: string) {
    const user = await this.userRepository.findOne({
      where: [{ id: userId }],
      relations: ['doctor'],
    });
    if (!user) throw new BadRequestException('userId not valid');

    const bundle = this.createEhrBundle(dto);

    const ehr = this.ehrRepository.create({
      createdBy: user.doctor,
      data: bundle,
    });

    await this.ehrRepository.save(ehr);
  }

  getEhrDoctor(userId: string): Promise<EHR[]> {
    return this.ehrRepository.find({
      where: {
        createdBy: { userId },
      },
      relations: ['createdBy'],
    });
  }

  getEhrPatient(userId: string): Promise<EHR[]> {
    return this.ehrRepository.find({
      where: {
        patient: { userId },
      },
      relations: ['patient'],
    });
  }
  async delete(userId: string, ehrId: string) {
    const result = await this.ehrRepository.find({
      where: { id: ehrId, createdBy: { userId } },
      relations: ['doctor'],
    });
    if (!result)
      throw new BadRequestException(
        'EHR not foundor you are not the owner of this EHR',
      );
    await this.ehrRepository.delete(result);
  }

  async patchEhr(userId: string, ehrId: string, dto: EhrDTO) {
    const ehr = await this.ehrRepository.findOne({
      where: {
        id: ehrId,
        createdBy: { userId },
      },
      relations: ['createdBy'],
    });

    if (!ehr) {
      throw new BadRequestException(
        'EHR not found or you are not the owner of this EHR',
      );
    }

    const bundle = this.createEhrBundle(dto);

    ehr.data = bundle;

    await this.ehrRepository.save(ehr);
  }

  //in this code is created the ehr; in hl7 the ehr in just a set of info; in this case i set this info in a bundle(a fhir obj)
  createEhrBundle(dto: EhrDTO): Bundle {
    const ssn = dto.patient.id;
    if (!ssn) {
      throw new BadRequestException('Patient SSN is required as id');
    }

    dto.patient.id = ssn;
    //set of the hl7 type for each field of the dto
    const optionalResources = [
      { type: 'Observation', resource: dto.observation },
      { type: 'Condition', resource: dto.condition },
      { type: 'Encounter', resource: dto.encounter },
      { type: 'Procedure', resource: dto.procedure },
      { type: 'AllergyIntolerance', resource: dto.allergy },
      { type: 'MedicationStatement', resource: dto.medicationStatement },
    ] as { type: string; resource: FhirResource | undefined }[];

    //creation of a obj entries ; the entries obj is a subObj of bundle
    const entries: Bundle['entry'] = [
      {
        fullUrl: `Patient/${ssn}`,
        resource: dto.patient,
      },
      ...optionalResources
        .filter(
          (r): r is { type: string; resource: FhirResource } => !!r.resource,
        )
        .map(({ type, resource }) => {
          const res = resource as Record<string, any>;
          if ('subject' in res) {
            res.subject = { reference: `Patient/${ssn}` };
          } else if ('patient' in res) {
            res.patient = { reference: `Patient/${ssn}` };
          }

          return {
            fullUrl: `${type}/${res.id ?? randomUUID()}`,
            resource,
          };
        }),
    ];
    //creation of the effective bundle
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'document',
      entry: entries,
    };

    return bundle;
  }

  async getPdf(ehrId: string, userId: string): Promise<Buffer> {
    const result = await this.ehrRepository.findOne({
      where: { id: ehrId, createdBy: { userId } },
      relations: ['doctor'],
    });
    if (!result) throw new BadRequestException('No EHR found');

    const bundle: Bundle = result.data;

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
    )?.resource as Patient;

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
  }
}

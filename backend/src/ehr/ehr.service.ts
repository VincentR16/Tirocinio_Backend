import { BadRequestException, Injectable } from '@nestjs/common';
import { EhrDTO } from './dto/EHR.dto';
import { Bundle, FhirResource } from 'fhir/r4';
import { InjectRepository } from '@nestjs/typeorm';
import { EHR } from './ehr.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/user.entity';

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
            fullUrl: `${type}/${res.id ?? '1'}`,
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
}

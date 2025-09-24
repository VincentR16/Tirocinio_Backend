import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/doctor/doctor.entity';
import { EHR } from 'src/ehr/ehr.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Comunication } from './comunication.entity';
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
import axios from 'axios';
import { ComunicationType } from 'src/common/types/comunicationType';
import { ComunicationStatus } from 'src/common/types/comunicationStatus';
import { PaginatedComunicationResponse } from 'src/common/types/paginatedComunicationResponse';

type AnyResource =
  | Patient
  | Encounter
  | Condition
  | Procedure
  | Observation
  | MedicationRequest
  | AllergyIntolerance;

@Injectable()
export class ComiunicationService {
  constructor(
    @InjectRepository(Comunication)
    private readonly comunicationRepository: Repository<Comunication>,
    @InjectRepository(EHR)
    private readonly ehrRepository: Repository<EHR>,
    @InjectRepository(Doctor)
    private readonly doctorRespository: Repository<Doctor>,
  ) {}

  async createComunication(
    hospital: string,
    type: ComunicationType,
    status: ComunicationStatus,
    doctor: Doctor,
    message: Bundle | OperationOutcome,
  ) {
    const comunication = this.comunicationRepository.create({
      hospital,
      type,
      status,
      doctor,
      message,
    });

    await this.comunicationRepository.save(comunication);
  }

  async getComunications(
    type: ComunicationType,
    userId: string,
    page: number,
  ): Promise<PaginatedComunicationResponse> {
    const limit = 10;
    const skip = (page - 1) * limit;

    const [comunications, totalItems] = await this.comunicationRepository
      .createQueryBuilder('c')
      .innerJoin('c.doctor', 'd')
      .where('d.userId = :userId', { userId })
      .andWhere('c.type = :type', { type })
      .skip(skip)
      .take(limit)
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
    //todo implementare la paginazione, ancora non fatto perche non so esttamente quanti ne entrano in una table
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

    const bundle = this.buildTransactionBundle(ehr);

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
      hospital,
      ComunicationType.OUTGOING,
      ComunicationStatus.DELIVERED,
      doctor,
      res.data,
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
}

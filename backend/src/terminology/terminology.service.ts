import { BadRequestException, Injectable } from '@nestjs/common';
import { TerminologyDto } from './dto/termilogy.dto';
import { ApiTerminologyResponse } from 'src/common/types/apiResponse';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TerminologyResponseDto } from './dto/terminologyResponse.dto';

// Enum per i tipi di terminologia
enum TerminologyType {
  ALLERGIES = 'allergies',
  CONDITIONS = 'conditions',
  OBSERVATIONS = 'observations',
  MEDICATIONS = 'medications',
  PROCEDURES = 'procedures',
}

// Configurazione per ogni tipo di terminologia
const TERMINOLOGY_CONFIG = {
  [TerminologyType.ALLERGIES]: {
    url: 'http://hl7.org/fhir/ValueSet/allergyintolerance-code',
    errorMessage: 'No allergens found',
    fetchErrorMessage: 'Failed to fetch allergy data',
  },
  [TerminologyType.CONDITIONS]: {
    url: 'http://hl7.org/fhir/ValueSet/condition-code',
    errorMessage: 'No conditions found',
    fetchErrorMessage: 'Failed to fetch condition data',
  },
  [TerminologyType.OBSERVATIONS]: {
    url: 'http://hl7.org/fhir/ValueSet/observation-codes',
    errorMessage: 'No observations found',
    fetchErrorMessage: 'Failed to fetch observation data',
  },
  [TerminologyType.MEDICATIONS]: {
    url: 'http://snomed.info/sct?fhir_vs=isa/763158003',
    errorMessage: 'No medications found',
    fetchErrorMessage: 'Failed to fetch medication data',
  },
  [TerminologyType.PROCEDURES]: {
    url: 'http://snomed.info/sct?fhir_vs=isa/71388002',
    errorMessage: 'No procedures found',
    fetchErrorMessage: 'Failed to fetch procedure data',
  },
};

@Injectable()
export class TerminologyService {
  constructor(private readonly httpService: HttpService) {}

  // Metodo generico per tutte le ricerche di terminologia
  private async searchTerminology(
    dto: TerminologyDto,
    type: TerminologyType,
  ): Promise<TerminologyResponseDto[]> {
    const { query, limit } = dto;
    const config = TERMINOLOGY_CONFIG[type];

    const url = `https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=${config.url}&filter=${encodeURIComponent(query)}&count=${limit}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ApiTerminologyResponse>(url, {
          timeout: 10000,
          headers: { Accept: 'application/fhir+json' },
        }),
      );

      if (!response.data?.expansion?.contains?.length) {
        throw new BadRequestException(config.errorMessage);
      }

      const results = response.data.expansion.contains
        .filter(
          (item, index, arr) =>
            arr.findIndex((t) => t.code === item.code) === index,
        )
        .map((item) => ({
          code: item.code,
          name: item.display,
        }))
        .slice(0, limit);

      return results;
    } catch {
      throw new BadRequestException(config.fetchErrorMessage);
    }
  }

  async getAllergies(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    return this.searchTerminology(dto, TerminologyType.ALLERGIES);
  }

  async getConditions(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    return this.searchTerminology(dto, TerminologyType.CONDITIONS);
  }

  async getObservations(
    dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    return this.searchTerminology(dto, TerminologyType.OBSERVATIONS);
  }

  async getMedications(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    return this.searchTerminology(dto, TerminologyType.MEDICATIONS);
  }

  async getProcedures(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    return this.searchTerminology(dto, TerminologyType.PROCEDURES);
  }
}

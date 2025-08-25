import { BadRequestException, Injectable } from '@nestjs/common';
import { TerminologyDto } from './dto/termilogy.dto';
import { ApiTerminologyResponse } from 'src/common/types/apiResponse';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TerminologyResponseDto } from './dto/terminologyResponse.dto';

@Injectable()
export class TerminologyService {
  constructor(private readonly httpService: HttpService) {}

  async getAllergies(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    const { query, limit } = dto;

    // ValueSet HL7 ufficiale per codici di allergie
    const url = `https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/allergyintolerance-code&filter=${encodeURIComponent(query)}&count=${limit}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ApiTerminologyResponse>(url, {
          timeout: 10000,
          headers: { Accept: 'application/fhir+json' },
        }),
      );

      if (!response.data?.expansion?.contains?.length) {
        throw new BadRequestException('No allergens found');
      }

      // Risultati già filtrati per allergie dal ValueSet ufficiale
      const results = response.data.expansion.contains
        .filter(
          (item, index, arr) =>
            arr.findIndex((t) => t.code === item.code) === index,
        )
        .map((item) => ({
          code: item.code,
          name: item.display,
        }));

      return results;
    } catch (error) {
      console.error('HL7 ValueSet error:', error);
      throw new BadRequestException('Failed to fetch allergy data');
    }
  }

  getMedications(dto: TerminologyDto) {
    throw new Error('Method not implemented.');
  }

  async getConditions(dto: TerminologyDto): Promise<TerminologyResponseDto[]> {
    const { query, limit } = dto;

    // ValueSet HL7 ufficiale per codici di condizioni cliniche (SNOMED CT)
    const url = `https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/condition-code&filter=${encodeURIComponent(query)}&count=${limit}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ApiTerminologyResponse>(url, {
          timeout: 10000,
          headers: { Accept: 'application/fhir+json' },
        }),
      );

      if (!response.data?.expansion?.contains?.length) {
        throw new BadRequestException('No conditions found');
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
    } catch (error) {
      console.error('HL7 ValueSet error:', error);
      throw new BadRequestException('Failed to fetch condition data');
    }
  }
  async getObservations(
    dto: TerminologyDto,
  ): Promise<TerminologyResponseDto[]> {
    const { query, limit } = dto;

    // ValueSet HL7 ufficiale per codici di osservazioni (LOINC)
    const url = `https://r4.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/observation-codes&filter=${encodeURIComponent(query)}&count=${limit}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ApiTerminologyResponse>(url, {
          timeout: 10000,
          headers: { Accept: 'application/fhir+json' },
        }),
      );

      if (!response.data?.expansion?.contains?.length) {
        throw new BadRequestException('No observations found');
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
    } catch (error) {
      console.error('HL7 ValueSet error:', error);
      throw new BadRequestException('Failed to fetch observation data');
    }
  }

  getProcedures(dto: TerminologyDto) {
    throw new Error('Method not implemented.');
  }
}

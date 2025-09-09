import { EHR } from 'src/ehr/ehr.entity';

export interface PaginatedResponse {
  ehr: EHR[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

import { Comunication } from 'src/comunication/comunication.entity';

export interface PaginatedComunicationResponse {
  comunications: Comunication[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

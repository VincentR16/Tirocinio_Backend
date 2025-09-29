import { Communication } from 'src/communication/communication.entity';

export interface PaginatedComunicationResponse {
  comunications: Communication[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

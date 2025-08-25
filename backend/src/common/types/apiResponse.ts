export interface ApiTerminologyResponse {
  expansion: {
    contains: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
}

export interface ImportFormState {
  error?: string;
  result?: {
    successCount: number;
    errors: { row: number; message: string }[];
  };
}

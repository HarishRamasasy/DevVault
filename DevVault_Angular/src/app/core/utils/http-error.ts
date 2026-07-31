import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/api-response.model';

export const extractErrorMessage = (err: HttpErrorResponse, fallback: string): string => {
  const body = err.error as ApiErrorResponse | undefined;
  return body?.message ?? fallback;
};

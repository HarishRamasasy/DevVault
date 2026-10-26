import { HttpParams } from '@angular/common/http';

// Drops empty values and joins arrays as comma-separated lists (the API's list format).
export const toHttpParams = (params: object): HttpParams => {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    const serialized = Array.isArray(value) ? value.join(',') : value;
    if (serialized !== undefined && serialized !== null && serialized !== '') {
      httpParams = httpParams.set(key, String(serialized));
    }
  }
  return httpParams;
};

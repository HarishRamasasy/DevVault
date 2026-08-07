import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { Folder, FolderPayload } from '../models/folder.model';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/folders`;

  list(): Observable<Folder[]> {
    return this.http
      .get<ApiSuccessResponse<{ folders: Folder[] }>>(this.apiUrl)
      .pipe(map((res) => res.data.folders));
  }

  create(payload: FolderPayload): Observable<Folder> {
    return this.http
      .post<ApiSuccessResponse<{ folder: Folder }>>(this.apiUrl, payload)
      .pipe(map((res) => res.data.folder));
  }

  update(id: string, payload: FolderPayload): Observable<Folder> {
    return this.http
      .put<ApiSuccessResponse<{ folder: Folder }>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((res) => res.data.folder));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiSuccessResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(map(() => undefined));
  }
}

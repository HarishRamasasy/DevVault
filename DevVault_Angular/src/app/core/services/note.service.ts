import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { Note, NotePage, NotePayload, NoteQueryParams } from '../models/note.model';
import { toHttpParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notes`;

  list(params: NoteQueryParams = {}): Observable<NotePage> {
    return this.http
      .get<ApiSuccessResponse<NotePage>>(this.apiUrl, { params: toHttpParams(params) })
      .pipe(map((res) => res.data));
  }

  get(id: string): Observable<Note> {
    return this.http.get<ApiSuccessResponse<{ note: Note }>>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data.note));
  }

  create(payload: NotePayload): Observable<Note> {
    return this.http.post<ApiSuccessResponse<{ note: Note }>>(this.apiUrl, payload).pipe(map((res) => res.data.note));
  }

  update(id: string, payload: NotePayload): Observable<Note> {
    return this.http
      .put<ApiSuccessResponse<{ note: Note }>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((res) => res.data.note));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiSuccessResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(map(() => undefined));
  }

  toggleFavorite(id: string): Observable<Note> {
    return this.http
      .patch<ApiSuccessResponse<{ note: Note }>>(`${this.apiUrl}/${id}/favorite`, {})
      .pipe(map((res) => res.data.note));
  }
}

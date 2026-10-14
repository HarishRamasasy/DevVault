import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { Snippet, SnippetPage, SnippetPayload, SnippetQueryParams } from '../models/snippet.model';
import { toHttpParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class SnippetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/snippets`;

  list(params: SnippetQueryParams = {}): Observable<SnippetPage> {
    return this.http
      .get<ApiSuccessResponse<SnippetPage>>(this.apiUrl, { params: toHttpParams(params) })
      .pipe(map((res) => res.data));
  }

  get(id: string): Observable<Snippet> {
    return this.http
      .get<ApiSuccessResponse<{ snippet: Snippet }>>(`${this.apiUrl}/${id}`)
      .pipe(map((res) => res.data.snippet));
  }

  create(payload: SnippetPayload): Observable<Snippet> {
    return this.http
      .post<ApiSuccessResponse<{ snippet: Snippet }>>(this.apiUrl, payload)
      .pipe(map((res) => res.data.snippet));
  }

  update(id: string, payload: SnippetPayload): Observable<Snippet> {
    return this.http
      .put<ApiSuccessResponse<{ snippet: Snippet }>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((res) => res.data.snippet));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiSuccessResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(map(() => undefined));
  }

  toggleFavorite(id: string): Observable<Snippet> {
    return this.http
      .patch<ApiSuccessResponse<{ snippet: Snippet }>>(`${this.apiUrl}/${id}/favorite`, {})
      .pipe(map((res) => res.data.snippet));
  }
}

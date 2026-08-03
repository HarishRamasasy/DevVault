import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { Bookmark, BookmarkPayload, BookmarkQueryParams } from '../models/bookmark.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/bookmarks`;

  list(params: BookmarkQueryParams = {}): Observable<Bookmark[]> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http
      .get<ApiSuccessResponse<{ bookmarks: Bookmark[] }>>(this.apiUrl, { params: httpParams })
      .pipe(map((res) => res.data.bookmarks));
  }

  create(payload: BookmarkPayload): Observable<Bookmark> {
    return this.http
      .post<ApiSuccessResponse<{ bookmark: Bookmark }>>(this.apiUrl, payload)
      .pipe(map((res) => res.data.bookmark));
  }

  update(id: string, payload: BookmarkPayload): Observable<Bookmark> {
    return this.http
      .put<ApiSuccessResponse<{ bookmark: Bookmark }>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((res) => res.data.bookmark));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiSuccessResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(map(() => undefined));
  }

  toggleFavorite(id: string): Observable<Bookmark> {
    return this.http
      .patch<ApiSuccessResponse<{ bookmark: Bookmark }>>(`${this.apiUrl}/${id}/favorite`, {})
      .pipe(map((res) => res.data.bookmark));
  }
}

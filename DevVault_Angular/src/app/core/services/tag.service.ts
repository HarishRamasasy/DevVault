import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { Tag, TagPayload } from '../models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tags`;

  private cache$: Observable<Tag[]> | null = null;

  list(): Observable<Tag[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<ApiSuccessResponse<{ tags: Tag[] }>>(this.apiUrl).pipe(
        map((res) => res.data.tags),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.cache$;
  }

  create(payload: TagPayload): Observable<Tag> {
    return this.http.post<ApiSuccessResponse<{ tag: Tag }>>(this.apiUrl, payload).pipe(
      map((res) => res.data.tag),
      tap(() => this.invalidateCache()),
    );
  }

  update(id: string, payload: TagPayload): Observable<Tag> {
    return this.http.put<ApiSuccessResponse<{ tag: Tag }>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res) => res.data.tag),
      tap(() => this.invalidateCache()),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiSuccessResponse<{ id: string }>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.invalidateCache()),
    );
  }

  private invalidateCache(): void {
    this.cache$ = null;
  }
}

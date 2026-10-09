import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../models/api-response.model';
import { AuthPayload } from '../models/auth.model';
import { User } from '../models/user.model';

const TOKEN_KEY = 'devvault_token';
const USER_KEY = 'devvault_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  readonly currentUser = signal<User | null>(this.readStoredUser());

  readonly initials = computed(() =>
    (this.currentUser()?.name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );

  register(name: string, email: string, password: string): Observable<ApiSuccessResponse<AuthPayload>> {
    return this.http.post<ApiSuccessResponse<AuthPayload>>(`${this.apiUrl}/register`, { name, email, password });
  }

  login(email: string, password: string): Observable<ApiSuccessResponse<AuthPayload>> {
    return this.http
      .post<ApiSuccessResponse<AuthPayload>>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  fetchCurrentUser(): Observable<ApiSuccessResponse<{ user: User }>> {
    return this.http
      .get<ApiSuccessResponse<{ user: User }>>(`${this.apiUrl}/me`)
      .pipe(tap((res) => this.setUser(res.data.user)));
  }

  updateProfile(changes: Pick<User, 'name' | 'email'>): Observable<ApiSuccessResponse<{ user: User }>> {
    return this.http
      .put<ApiSuccessResponse<{ user: User }>>(`${this.usersUrl}/me`, changes)
      .pipe(tap((res) => this.setUser(res.data.user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiSuccessResponse<object>> {
    return this.http.put<ApiSuccessResponse<object>>(`${this.usersUrl}/me/password`, { currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  private persistSession(payload: AuthPayload): void {
    localStorage.setItem(TOKEN_KEY, payload.token);
    this.setUser(payload.user);
  }

  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}

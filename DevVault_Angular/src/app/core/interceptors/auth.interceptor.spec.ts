import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  const auth = { getToken: vi.fn(), logout: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('adds the bearer token when one is stored', () => {
    auth.getToken.mockReturnValue('abc');
    http.get('/x').subscribe();
    expect(ctrl.expectOne('/x').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', () => {
    auth.getToken.mockReturnValue(null);
    http.get('/x').subscribe();
    expect(ctrl.expectOne('/x').request.headers.has('Authorization')).toBe(false);
  });

  it('logs out and redirects on 401, and still surfaces the error', () => {
    auth.getToken.mockReturnValue('abc');
    let status = 0;
    http.get('/x').subscribe({ error: (e) => (status = e.status) });
    ctrl.expectOne('/x').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(status).toBe(401);
  });

  it('does not log out on other errors', () => {
    auth.getToken.mockReturnValue('abc');
    http.get('/x').subscribe({ error: () => undefined });
    ctrl.expectOne('/x').flush({}, { status: 404, statusText: 'Not Found' });
    expect(auth.logout).not.toHaveBeenCalled();
  });
});

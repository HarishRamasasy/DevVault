import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('route guards', () => {
  const auth = { isAuthenticated: vi.fn() };
  const run = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('authGuard lets an authenticated user through', () => {
    auth.isAuthenticated.mockReturnValue(true);
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard redirects an anonymous user to login', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = run(authGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/auth/login');
  });

  it('guestGuard sends a logged-in user to the dashboard', () => {
    auth.isAuthenticated.mockReturnValue(true);
    const result = run(guestGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard');
  });

  it('guestGuard allows an anonymous user', () => {
    auth.isAuthenticated.mockReturnValue(false);
    expect(run(guestGuard)).toBe(true);
  });
});

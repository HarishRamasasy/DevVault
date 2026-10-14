import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

const SEARCH_DEBOUNCE_MS = 300;
// List pages that run the navbar search against their own resource; everywhere else it searches bookmarks.
const SCOPED_SEARCH_PAGES = ['/notes', '/snippets'];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Output() menuToggle = new EventEmitter<void>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly search$ = new Subject<string>();

  readonly currentUser = this.authService.currentUser;
  readonly initialSearch = this.urlSearch();
  readonly scopedPage = signal(this.currentScopedPage());

  readonly initials = this.authService.initials;

  constructor() {
    this.search$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed()).subscribe((value) => {
      const term = value.trim();
      const target = this.scopedPage() ?? '/bookmarks';
      const onTarget = this.router.url.split('?')[0] === target;
      if (!term && !onTarget) return;

      this.router.navigate([target], {
        queryParams: { search: term || null, page: null },
        queryParamsHandling: 'merge',
        replaceUrl: onTarget,
      });
    });

    // Reflect URL changes made elsewhere (Clear Filters, back/forward) — but never overwrite what the user is typing.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.scopedPage.set(this.currentScopedPage());
        const input = this.searchInput()?.nativeElement;
        if (input && document.activeElement !== input) {
          input.value = this.urlSearch();
        }
      });
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private currentScopedPage(): string | null {
    const path = this.router.url.split('?')[0];
    return SCOPED_SEARCH_PAGES.includes(path) ? path : null;
  }

  private urlSearch(): string {
    return this.router.parseUrl(this.router.url).queryParams['search'] ?? '';
  }
}

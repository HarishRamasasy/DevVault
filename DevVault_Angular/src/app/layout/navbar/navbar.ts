import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

const SEARCH_DEBOUNCE_MS = 300;

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

  readonly initials = this.authService.initials;

  constructor() {
    this.search$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed()).subscribe((value) => {
      const term = value.trim();
      const onBookmarks = this.router.url.startsWith('/bookmarks');
      if (!term && !onBookmarks) return;

      this.router.navigate(['/bookmarks'], {
        queryParams: { search: term || null, page: null },
        queryParamsHandling: 'merge',
        replaceUrl: onBookmarks,
      });
    });

    // Reflect URL changes made elsewhere (Clear Filters, back/forward) — but never overwrite what the user is typing.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
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

  private urlSearch(): string {
    return this.router.parseUrl(this.router.url).queryParams['search'] ?? '';
  }
}

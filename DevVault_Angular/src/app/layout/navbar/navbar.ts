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
  readonly onNotesList = signal(this.router.url.split('?')[0] === '/notes');

  readonly initials = this.authService.initials;

  constructor() {
    this.search$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed()).subscribe((value) => {
      const term = value.trim();
      // The Notes list page searches notes; everywhere else the search targets bookmarks.
      const target = this.onNotesList() ? '/notes' : '/bookmarks';
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
        this.onNotesList.set(this.router.url.split('?')[0] === '/notes');
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

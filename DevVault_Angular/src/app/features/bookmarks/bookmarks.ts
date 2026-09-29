import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookmarkService } from '../../core/services/bookmark.service';
import { FolderService } from '../../core/services/folder.service';
import { TagService } from '../../core/services/tag.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';
import {
  Bookmark,
  BookmarkPagination,
  BookmarkPayload,
  BookmarkQueryParams,
  BookmarkSort,
  BookmarkType,
  BOOKMARK_SORTS,
  BOOKMARK_TYPES,
} from '../../core/models/bookmark.model';
import { Folder } from '../../core/models/folder.model';
import { Tag } from '../../core/models/tag.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { CardSkeleton } from '../../shared/components/card-skeleton/card-skeleton';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { BookmarkCard } from './components/bookmark-card/bookmark-card';
import { BookmarkFormDialog, BookmarkFormDialogData } from './components/bookmark-form-dialog/bookmark-form-dialog';

const PAGE_SIZE = 12;

// The URL is the single source of truth for search/filter state, so refresh and shared links restore it.
const toQuery = (params: ParamMap): BookmarkQueryParams => ({
  search: params.get('search') ?? undefined,
  folder: params.get('folder') ?? undefined,
  tags: params.get('tags')?.split(',').filter(Boolean) ?? [],
  favorite: params.has('favorite') ? params.get('favorite') === 'true' : undefined,
  type: (params.get('type') as BookmarkType | null) ?? undefined,
  sort: (params.get('sort') as BookmarkSort | null) ?? undefined,
  page: Number(params.get('page')) || 1,
  limit: PAGE_SIZE,
});

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, BookmarkCard, CardSkeleton, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmarks.html',
})
export class Bookmarks {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly folderService = inject(FolderService);
  private readonly tagService = inject(TagService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly bookmarkTypes = BOOKMARK_TYPES;
  readonly sortOptions = BOOKMARK_SORTS;

  readonly bookmarks = signal<Bookmark[]>([]);
  readonly pagination = signal<BookmarkPagination | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingFavoriteId = signal<string | null>(null);
  readonly filtersOpen = signal(false);

  readonly folders = toSignal(this.folderService.list(), { initialValue: [] as Folder[] });
  readonly tags = toSignal(this.tagService.list(), { initialValue: [] as Tag[] });

  private readonly query$ = this.route.queryParamMap.pipe(map(toQuery));
  private readonly refresh$ = new Subject<void>();

  readonly query = toSignal(this.query$, { requireSync: true });

  readonly selectedFolder = computed(() => this.folders().find((folder) => folder._id === this.query().folder) ?? null);
  readonly selectedTagIds = computed(() => new Set(this.query().tags));
  readonly selectedTypeLabel = computed(
    () => this.bookmarkTypes.find((option) => option.value === this.query().type)?.label ?? null,
  );
  readonly sortLabel = computed(
    () => this.sortOptions.find((option) => option.value === (this.query().sort ?? 'newest'))?.label ?? 'Sort',
  );

  readonly hasFilters = computed(() => {
    const { search, folder, tags, favorite, type } = this.query();
    return !!(search || folder || tags?.length || favorite !== undefined || type);
  });
  readonly canClear = computed(() => this.hasFilters() || !!this.query().sort || this.query().page! > 1);

  constructor() {
    combineLatest([this.query$, this.refresh$.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(([query]) =>
          this.bookmarkService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const message = extractErrorMessage(err, 'Unable to load bookmarks. Please try again.');
              this.error.set(message);
              this.notify.error(message);
              // Don't leave results from the previous query on screen under the new filters.
              this.bookmarks.set([]);
              this.pagination.set(null);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result) return;

        const { page, totalPages } = result.pagination;
        if (page > totalPages && totalPages > 0) {
          // Deleting the last item on a page (or a stale shared link) leaves us past the end.
          this.goToPage(totalPages);
          return;
        }

        this.bookmarks.set(result.bookmarks);
        this.pagination.set(result.pagination);
      });
  }

  reload(): void {
    this.refresh$.next();
  }

  setFavorite(favorite: boolean | null): void {
    this.updateQuery({ favorite });
  }

  setFolder(folderId: string | null): void {
    this.updateQuery({ folder: folderId });
  }

  toggleTag(tagId: string): void {
    const next = new Set(this.selectedTagIds());
    if (!next.delete(tagId)) {
      next.add(tagId);
    }
    this.updateQuery({ tags: next.size ? [...next].join(',') : null });
  }

  clearTags(): void {
    this.updateQuery({ tags: null });
  }

  setType(type: BookmarkType | null): void {
    this.updateQuery({ type });
  }

  setSort(sort: BookmarkSort): void {
    this.updateQuery({ sort: sort === 'newest' ? null : sort });
  }

  goToPage(page: number): void {
    this.updateQuery({ page: page > 1 ? page : null });
  }

  clearFilters(): void {
    this.router.navigate([], { relativeTo: this.route });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open<BookmarkFormDialog, BookmarkFormDialogData, BookmarkPayload>(BookmarkFormDialog, {
      data: { bookmark: null },
      width: '480px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.bookmarkService.create(payload).subscribe({
        next: () => {
          this.reload();
          this.notify.success('Bookmark created successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to create bookmark.')),
      });
    });
  }

  openEditDialog(bookmark: Bookmark): void {
    const ref = this.dialog.open<BookmarkFormDialog, BookmarkFormDialogData, BookmarkPayload>(BookmarkFormDialog, {
      data: { bookmark },
      width: '480px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.bookmarkService.update(bookmark._id, payload).subscribe({
        next: () => {
          this.reload();
          this.notify.success('Bookmark updated successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to update bookmark.')),
      });
    });
  }

  confirmDelete(bookmark: Bookmark): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete bookmark?',
        message: `"${bookmark.title}" will be permanently removed. This can't be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.bookmarkService.delete(bookmark._id).subscribe({
        next: () => {
          this.reload();
          this.notify.success('Bookmark deleted successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete bookmark.')),
      });
    });
  }

  toggleFavorite(bookmark: Bookmark): void {
    this.pendingFavoriteId.set(bookmark._id);

    this.bookmarkService.toggleFavorite(bookmark._id).subscribe({
      next: (updated) => {
        this.bookmarks.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
        this.pendingFavoriteId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractErrorMessage(err, 'Unable to update favorite status.'));
        this.pendingFavoriteId.set(null);
      },
    });
  }

  // Any filter change returns to page 1; goToPage overrides that by passing its own page.
  private updateQuery(changes: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: null, ...changes },
      queryParamsHandling: 'merge',
    });
  }
}

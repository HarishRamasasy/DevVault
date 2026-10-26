import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { FolderService } from '../../core/services/folder.service';
import { TagService } from '../../core/services/tag.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';
import { BookmarkPagination, BookmarkSort, BOOKMARK_SORTS } from '../../core/models/bookmark.model';
import { Note, NoteQueryParams } from '../../core/models/note.model';
import { Folder } from '../../core/models/folder.model';
import { Tag } from '../../core/models/tag.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { CardSkeleton } from '../../shared/components/card-skeleton/card-skeleton';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { NoteCard } from './components/note-card/note-card';
import { NoteFormDialog, NoteFormDialogData } from './components/note-form-dialog/note-form-dialog';

const PAGE_SIZE = 12;

// Same URL-driven filter model as the Bookmarks page; the navbar search writes ?search= here while on /notes.
const toQuery = (params: ParamMap): NoteQueryParams => ({
  search: params.get('search') ?? undefined,
  folder: params.get('folder') ?? undefined,
  tags: params.get('tags')?.split(',').filter(Boolean) ?? [],
  favorite: params.has('favorite') ? params.get('favorite') === 'true' : undefined,
  sort: (params.get('sort') as BookmarkSort | null) ?? undefined,
  page: Number(params.get('page')) || 1,
  limit: PAGE_SIZE,
});

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, NoteCard, CardSkeleton, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notes.html',
})
export class Notes {
  private readonly noteService = inject(NoteService);
  private readonly folderService = inject(FolderService);
  private readonly tagService = inject(TagService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sortOptions = BOOKMARK_SORTS;

  readonly notes = signal<Note[]>([]);
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
  readonly sortLabel = computed(
    () => this.sortOptions.find((option) => option.value === (this.query().sort ?? 'newest'))?.label ?? 'Sort',
  );

  readonly hasFilters = computed(() => {
    const { search, folder, tags, favorite } = this.query();
    return !!(search || folder || tags?.length || favorite !== undefined);
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
          this.noteService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const message = extractErrorMessage(err, 'Unable to load notes. Please try again.');
              this.error.set(message);
              this.notify.error(message);
              this.notes.set([]);
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
          this.goToPage(totalPages);
          return;
        }

        this.notes.set(result.notes);
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

  setSort(sort: BookmarkSort): void {
    this.updateQuery({ sort: sort === 'newest' ? null : sort });
  }

  goToPage(page: number): void {
    this.updateQuery({ page: page > 1 ? page : null });
  }

  clearFilters(): void {
    this.router.navigate([], { relativeTo: this.route });
  }

  openFormDialog(note: Note | null = null): void {
    this.dialog
      .open<NoteFormDialog, NoteFormDialogData, Note>(NoteFormDialog, {
        data: { note },
        width: '600px',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.reload());
  }

  confirmDelete(note: Note): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete note?',
        message: `"${note.title}" will be permanently removed. This can't be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.noteService.delete(note._id).subscribe({
        next: () => {
          this.reload();
          this.notify.success('Note deleted successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete note.')),
      });
    });
  }

  toggleFavorite(note: Note): void {
    this.pendingFavoriteId.set(note._id);

    this.noteService.toggleFavorite(note._id).subscribe({
      next: (updated) => {
        this.notes.update((list) => list.map((item) => (item._id === updated._id ? updated : item)));
        this.pendingFavoriteId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractErrorMessage(err, 'Unable to update favorite status.'));
        this.pendingFavoriteId.set(null);
      },
    });
  }

  private updateQuery(changes: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: null, ...changes },
      queryParamsHandling: 'merge',
    });
  }
}

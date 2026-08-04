import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BookmarkService } from '../../core/services/bookmark.service';
import { extractErrorMessage } from '../../core/utils/http-error';
import { Bookmark, BookmarkPayload } from '../../core/models/bookmark.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { BookmarkCard } from './components/bookmark-card/bookmark-card';
import { BookmarkFormDialog, BookmarkFormDialogData } from './components/bookmark-form-dialog/bookmark-form-dialog';

type SortBy = 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, BookmarkCard, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.css',
})
export class Bookmarks {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly dialog = inject(MatDialog);

  readonly bookmarks = signal<Bookmark[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingFavoriteId = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly favoritesOnly = signal(false);
  readonly sortBy = signal<SortBy>('createdAt');
  readonly sortOrder = signal<SortOrder>('desc');

  readonly filteredBookmarks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.bookmarks();

    if (this.favoritesOnly()) {
      list = list.filter((bookmark) => bookmark.favorite);
    }

    if (term) {
      list = list.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(term) ||
          bookmark.description.toLowerCase().includes(term) ||
          bookmark.url.toLowerCase().includes(term) ||
          bookmark.tags.some((tag) => tag.includes(term)),
      );
    }

    const order = this.sortOrder() === 'asc' ? 1 : -1;
    const sortBy = this.sortBy();

    return [...list].sort((a, b) =>
      sortBy === 'title'
        ? a.title.localeCompare(b.title) * order
        : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order,
    );
  });

  constructor() {
    this.loadBookmarks();
  }

  loadBookmarks(): void {
    this.loading.set(true);
    this.error.set(null);

    this.bookmarkService.list().subscribe({
      next: (bookmarks) => {
        this.bookmarks.set(bookmarks);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extractErrorMessage(err, 'Unable to load bookmarks. Please try again.'));
        this.loading.set(false);
      },
    });
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
        next: (bookmark) => this.bookmarks.update((list) => [bookmark, ...list]),
        error: (err: HttpErrorResponse) => this.error.set(extractErrorMessage(err, 'Unable to create bookmark.')),
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
        next: (updated) =>
          this.bookmarks.update((list) => list.map((item) => (item._id === updated._id ? updated : item))),
        error: (err: HttpErrorResponse) => this.error.set(extractErrorMessage(err, 'Unable to update bookmark.')),
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
        next: () => this.bookmarks.update((list) => list.filter((item) => item._id !== bookmark._id)),
        error: (err: HttpErrorResponse) => this.error.set(extractErrorMessage(err, 'Unable to delete bookmark.')),
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
        this.error.set(extractErrorMessage(err, 'Unable to update favorite status.'));
        this.pendingFavoriteId.set(null);
      },
    });
  }

  setSort(sortBy: SortBy, sortOrder: SortOrder): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder);
  }
}

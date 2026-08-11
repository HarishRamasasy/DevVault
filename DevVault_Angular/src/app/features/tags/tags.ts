import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TagService } from '../../core/services/tag.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';
import { Tag, TagPayload } from '../../core/models/tag.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { CardSkeleton } from '../../shared/components/card-skeleton/card-skeleton';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { TagCard } from './components/tag-card/tag-card';
import { TagFormDialog, TagFormDialogData } from './components/tag-form-dialog/tag-form-dialog';

@Component({
  selector: 'app-tags',
  standalone: true,
  imports: [MatIconModule, TagCard, CardSkeleton, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tags.html',
})
export class Tags {
  private readonly tagService = inject(TagService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly tags = signal<Tag[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadTags();
  }

  loadTags(): void {
    this.loading.set(true);
    this.error.set(null);

    this.tagService.list().subscribe({
      next: (tags) => {
        this.tags.set(tags);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extractErrorMessage(err, 'Unable to load tags. Please try again.'));
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open<TagFormDialog, TagFormDialogData, TagPayload>(TagFormDialog, {
      data: { tag: null },
      width: '420px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.tagService.create(payload).subscribe({
        next: (tag) => {
          this.tags.update((list) => [...list, tag].sort((a, b) => a.name.localeCompare(b.name)));
          this.notify.success('Tag created successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to create tag.')),
      });
    });
  }

  openEditDialog(tag: Tag): void {
    const ref = this.dialog.open<TagFormDialog, TagFormDialogData, TagPayload>(TagFormDialog, {
      data: { tag },
      width: '420px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.tagService.update(tag._id, payload).subscribe({
        next: (updated) => {
          this.tags.update((list) =>
            list
              .map((item) => (item._id === updated._id ? { ...updated, bookmarkCount: item.bookmarkCount } : item))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.notify.success('Tag updated successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to update tag.')),
      });
    });
  }

  confirmDelete(tag: Tag): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete tag?',
        message: `"${tag.name}" will be permanently removed and unassigned from any bookmarks using it.`,
        confirmLabel: 'Delete',
        danger: true,
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.tagService.delete(tag._id).subscribe({
        next: () => {
          this.tags.update((list) => list.filter((item) => item._id !== tag._id));
          this.notify.success('Tag deleted successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete tag.')),
      });
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FolderService } from '../../core/services/folder.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';
import { Folder, FolderPayload } from '../../core/models/folder.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { CardSkeleton } from '../../shared/components/card-skeleton/card-skeleton';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FolderCard } from './components/folder-card/folder-card';
import { FolderFormDialog, FolderFormDialogData } from './components/folder-form-dialog/folder-form-dialog';

@Component({
  selector: 'app-folders',
  standalone: true,
  imports: [MatIconModule, FolderCard, CardSkeleton, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folders.html',
})
export class Folders {
  private readonly folderService = inject(FolderService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly folders = signal<Folder[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadFolders();
  }

  loadFolders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.folderService.list().subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extractErrorMessage(err, 'Unable to load folders. Please try again.'));
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open<FolderFormDialog, FolderFormDialogData, FolderPayload>(FolderFormDialog, {
      data: { folder: null },
      width: '480px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.folderService.create(payload).subscribe({
        next: (folder) => {
          this.folders.update((list) => [...list, folder].sort((a, b) => a.name.localeCompare(b.name)));
          this.notify.success('Folder created successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to create folder.')),
      });
    });
  }

  openEditDialog(folder: Folder): void {
    const ref = this.dialog.open<FolderFormDialog, FolderFormDialogData, FolderPayload>(FolderFormDialog, {
      data: { folder },
      width: '480px',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;

      this.folderService.update(folder._id, payload).subscribe({
        next: (updated) => {
          this.folders.update((list) =>
            list
              .map((item) => (item._id === updated._id ? { ...updated, bookmarkCount: item.bookmarkCount } : item))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.notify.success('Folder updated successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to update folder.')),
      });
    });
  }

  confirmDelete(folder: Folder): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete folder?',
        message: `"${folder.name}" will be permanently removed. Bookmarks inside it will be kept and unassigned.`,
        confirmLabel: 'Delete',
        danger: true,
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.folderService.delete(folder._id).subscribe({
        next: () => {
          this.folders.update((list) => list.filter((item) => item._id !== folder._id));
          this.notify.success('Folder deleted successfully.');
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete folder.')),
      });
    });
  }
}

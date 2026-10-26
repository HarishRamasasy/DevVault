import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { NoteService } from '../../../core/services/note.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error';
import { Note } from '../../../core/models/note.model';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NoteFormDialog, NoteFormDialogData } from '../components/note-form-dialog/note-form-dialog';

@Component({
  selector: 'app-note-detail',
  standalone: true,
  imports: [MatIconModule, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-detail.html',
})
export class NoteDetail {
  private readonly noteService = inject(NoteService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly note = signal<Note | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly favoritePending = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')!),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.noteService.get(id).pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(
                err.status === 404 || err.status === 403 || err.status === 400
                  ? 'This note does not exist or was deleted.'
                  : extractErrorMessage(err, 'Unable to load note. Please try again.'),
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((note) => {
        this.note.set(note);
        this.loading.set(false);
      });
  }

  edit(note: Note): void {
    this.dialog
      .open<NoteFormDialog, NoteFormDialogData, Note>(NoteFormDialog, {
        data: { note },
        width: '600px',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.note.set(saved));
  }

  toggleFavorite(note: Note): void {
    this.favoritePending.set(true);
    this.noteService.toggleFavorite(note._id).subscribe({
      next: (updated) => {
        this.note.set(updated);
        this.favoritePending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractErrorMessage(err, 'Unable to update favorite status.'));
        this.favoritePending.set(false);
      },
    });
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
          this.notify.success('Note deleted successfully.');
          this.router.navigate(['/notes']);
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete note.')),
      });
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { SnippetService } from '../../../core/services/snippet.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error';
import { Snippet } from '../../../core/models/snippet.model';
import { CodeBlock } from '../../../shared/components/code-block/code-block';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { SnippetFormDialog, SnippetFormDialogData } from '../components/snippet-form-dialog/snippet-form-dialog';

@Component({
  selector: 'app-snippet-detail',
  standalone: true,
  imports: [MatIconModule, DatePipe, RouterLink, CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snippet-detail.html',
})
export class SnippetDetail {
  private readonly snippetService = inject(SnippetService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly snippet = signal<Snippet | null>(null);
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
          this.snippetService.get(id).pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(
                err.status === 404 || err.status === 403 || err.status === 400
                  ? 'This snippet does not exist or was deleted.'
                  : extractErrorMessage(err, 'Unable to load snippet. Please try again.'),
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((snippet) => {
        this.snippet.set(snippet);
        this.loading.set(false);
      });
  }

  edit(snippet: Snippet): void {
    this.dialog
      .open<SnippetFormDialog, SnippetFormDialogData, Snippet>(SnippetFormDialog, {
        data: { snippet },
        width: '700px',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.snippet.set(saved));
  }

  toggleFavorite(snippet: Snippet): void {
    this.favoritePending.set(true);
    this.snippetService.toggleFavorite(snippet._id).subscribe({
      next: (updated) => {
        this.snippet.set(updated);
        this.favoritePending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractErrorMessage(err, 'Unable to update favorite status.'));
        this.favoritePending.set(false);
      },
    });
  }

  confirmDelete(snippet: Snippet): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete snippet?',
        message: `"${snippet.title}" will be permanently removed. This can't be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
      width: '380px',
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.snippetService.delete(snippet._id).subscribe({
        next: () => {
          this.notify.success('Snippet deleted successfully.');
          this.router.navigate(['/snippets']);
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractErrorMessage(err, 'Unable to delete snippet.')),
      });
    });
  }
}

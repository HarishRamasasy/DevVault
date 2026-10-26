import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SnippetService } from '../../../../core/services/snippet.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import {
  Snippet,
  SNIPPET_CODE_MAX,
  SNIPPET_DESCRIPTION_MAX,
  SNIPPET_LANGUAGES,
  SnippetLanguage,
  SnippetPayload,
} from '../../../../core/models/snippet.model';
import {
  FolderOption,
  FolderTagPicker,
  TagOption,
} from '../../../../shared/components/folder-tag-picker/folder-tag-picker';

export interface SnippetFormDialogData {
  snippet: Snippet | null;
}

const notBlank = (control: { value: string | null }) => (control.value?.trim() ? null : { required: true });

// Same save flow as the note dialog: saving state, no duplicate submits, stays open on failure.
@Component({
  selector: 'app-snippet-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, FolderTagPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snippet-form-dialog.html',
})
export class SnippetFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly snippetService = inject(SnippetService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<SnippetFormDialog, Snippet>);
  private readonly data = inject<SnippetFormDialogData>(MAT_DIALOG_DATA);

  readonly codeMax = SNIPPET_CODE_MAX;
  readonly descriptionMax = SNIPPET_DESCRIPTION_MAX;
  readonly languages = SNIPPET_LANGUAGES;
  readonly isEditMode = !!this.data.snippet;
  readonly saving = signal(false);

  readonly selectedFolder = signal<FolderOption | null>(this.data.snippet?.folder ?? null);
  readonly selectedTags = signal<TagOption[]>(this.data.snippet?.tags ?? []);

  readonly form = this.fb.group({
    title: this.fb.control(this.data.snippet?.title ?? '', [notBlank, Validators.maxLength(150)]),
    language: this.fb.control<SnippetLanguage | ''>(this.data.snippet?.language ?? '', Validators.required),
    description: this.fb.control(this.data.snippet?.description ?? '', Validators.maxLength(SNIPPET_DESCRIPTION_MAX)),
    code: this.fb.control(this.data.snippet?.code ?? '', [notBlank, Validators.maxLength(SNIPPET_CODE_MAX)]),
  });

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, language, description, code } = this.form.getRawValue();
    const payload: SnippetPayload = {
      title: title!.trim(),
      language: language as SnippetLanguage,
      description: description!.trim(),
      code: code!, // sent verbatim: indentation and line breaks are part of the snippet
      folder: this.selectedFolder()?._id ?? null,
      tags: this.selectedTags().map((tag) => tag._id),
    };

    const request = this.data.snippet
      ? this.snippetService.update(this.data.snippet._id, payload)
      : this.snippetService.create(payload);

    this.saving.set(true);
    this.dialogRef.disableClose = true;

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (snippet) => {
        this.notify.success(this.isEditMode ? 'Snippet updated successfully.' : 'Snippet created successfully.');
        this.dialogRef.close(snippet);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.notify.error(
          extractErrorMessage(err, this.isEditMode ? 'Unable to update snippet.' : 'Unable to create snippet.'),
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

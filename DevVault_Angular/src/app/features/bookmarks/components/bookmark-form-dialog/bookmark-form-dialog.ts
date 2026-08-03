import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Bookmark, BookmarkPayload, BookmarkType, BOOKMARK_TYPES } from '../../../../core/models/bookmark.model';

export interface BookmarkFormDialogData {
  bookmark: Bookmark | null;
}

@Component({
  selector: 'app-bookmark-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmark-form-dialog.html',
  styleUrl: './bookmark-form-dialog.css',
})
export class BookmarkFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BookmarkFormDialog, BookmarkPayload>);
  private readonly data = inject<BookmarkFormDialogData>(MAT_DIALOG_DATA);

  readonly bookmarkTypes = BOOKMARK_TYPES;
  readonly isEditMode = !!this.data.bookmark;

  readonly form = this.fb.group({
    title: this.fb.control(this.data.bookmark?.title ?? '', [Validators.required, Validators.maxLength(150)]),
    url: this.fb.control(this.data.bookmark?.url ?? '', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/i),
    ]),
    description: this.fb.control(this.data.bookmark?.description ?? '', [Validators.maxLength(500)]),
    type: this.fb.control<BookmarkType>(this.data.bookmark?.type ?? 'other', [Validators.required]),
    tags: this.fb.control(this.data.bookmark?.tags.join(', ') ?? ''),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, url, description, type, tags } = this.form.getRawValue();

    const payload: BookmarkPayload = {
      title: title!.trim(),
      url: url!.trim(),
      description: description?.trim() ?? '',
      type: type!,
      tags: (tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

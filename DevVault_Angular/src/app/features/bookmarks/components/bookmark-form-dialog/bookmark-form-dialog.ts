import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Bookmark, BookmarkPayload, BookmarkType, BOOKMARK_TYPES } from '../../../../core/models/bookmark.model';
import {
  FolderOption,
  FolderTagPicker,
  TagOption,
} from '../../../../shared/components/folder-tag-picker/folder-tag-picker';

export interface BookmarkFormDialogData {
  bookmark: Bookmark | null;
}

@Component({
  selector: 'app-bookmark-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, FolderTagPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmark-form-dialog.html',
})
export class BookmarkFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BookmarkFormDialog, BookmarkPayload>);
  private readonly data = inject<BookmarkFormDialogData>(MAT_DIALOG_DATA);

  readonly bookmarkTypes = BOOKMARK_TYPES;
  readonly isEditMode = !!this.data.bookmark;

  readonly selectedFolder = signal<FolderOption | null>(this.data.bookmark?.folder ?? null);
  readonly selectedTags = signal<TagOption[]>(this.data.bookmark?.tags ?? []);

  readonly form = this.fb.group({
    title: this.fb.control(this.data.bookmark?.title ?? '', [Validators.required, Validators.maxLength(150)]),
    url: this.fb.control(this.data.bookmark?.url ?? '', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/i),
    ]),
    description: this.fb.control(this.data.bookmark?.description ?? '', [Validators.maxLength(500)]),
    type: this.fb.control<BookmarkType>(this.data.bookmark?.type ?? 'other', [Validators.required]),
    favorite: this.fb.control(this.data.bookmark?.favorite ?? false),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, url, description, type, favorite } = this.form.getRawValue();

    const payload: BookmarkPayload = {
      title: title!.trim(),
      url: url!.trim(),
      description: description?.trim() ?? '',
      type: type!,
      tags: this.selectedTags().map((tag) => tag._id),
      favorite: favorite ?? false,
      folder: this.selectedFolder()?._id ?? null,
    };

    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

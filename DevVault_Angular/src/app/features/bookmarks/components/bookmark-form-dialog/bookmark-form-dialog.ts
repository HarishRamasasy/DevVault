import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FolderService } from '../../../../core/services/folder.service';
import { Folder } from '../../../../core/models/folder.model';
import { Bookmark, BookmarkFolderRef, BookmarkPayload, BookmarkType, BOOKMARK_TYPES } from '../../../../core/models/bookmark.model';

export interface BookmarkFormDialogData {
  bookmark: Bookmark | null;
}

type FolderOption = Folder | BookmarkFolderRef;

@Component({
  selector: 'app-bookmark-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatAutocompleteModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmark-form-dialog.html',
  styleUrl: './bookmark-form-dialog.css',
})
export class BookmarkFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly folderService = inject(FolderService);
  private readonly dialogRef = inject(MatDialogRef<BookmarkFormDialog, BookmarkPayload>);
  private readonly data = inject<BookmarkFormDialogData>(MAT_DIALOG_DATA);

  readonly bookmarkTypes = BOOKMARK_TYPES;
  readonly isEditMode = !!this.data.bookmark;

  readonly folders = toSignal(this.folderService.list(), { initialValue: [] as Folder[] });
  readonly selectedFolder = signal<FolderOption | null>(this.data.bookmark?.folder ?? null);
  readonly folderSearchText = signal(this.data.bookmark?.folder?.name ?? '');

  readonly filteredFolders = computed(() => {
    const term = this.folderSearchText().trim().toLowerCase();
    const list = this.folders();
    return term ? list.filter((folder) => folder.name.toLowerCase().includes(term)) : list;
  });

  readonly form = this.fb.group({
    title: this.fb.control(this.data.bookmark?.title ?? '', [Validators.required, Validators.maxLength(150)]),
    url: this.fb.control(this.data.bookmark?.url ?? '', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/i),
    ]),
    description: this.fb.control(this.data.bookmark?.description ?? '', [Validators.maxLength(500)]),
    type: this.fb.control<BookmarkType>(this.data.bookmark?.type ?? 'other', [Validators.required]),
    tags: this.fb.control(this.data.bookmark?.tags.join(', ') ?? ''),
    favorite: this.fb.control(this.data.bookmark?.favorite ?? false),
  });

  onFolderInput(value: string): void {
    this.folderSearchText.set(value);
    if (!value) {
      this.selectedFolder.set(null);
    }
  }

  onFolderSelected(event: MatAutocompleteSelectedEvent): void {
    const folder = event.option.value as FolderOption;
    this.selectedFolder.set(folder);
    this.folderSearchText.set(folder.name);
  }

  clearFolder(): void {
    this.selectedFolder.set(null);
    this.folderSearchText.set('');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, url, description, type, tags, favorite } = this.form.getRawValue();

    const payload: BookmarkPayload = {
      title: title!.trim(),
      url: url!.trim(),
      description: description?.trim() ?? '',
      type: type!,
      tags: (tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      favorite: favorite ?? false,
      folder: this.selectedFolder()?._id ?? null,
    };

    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

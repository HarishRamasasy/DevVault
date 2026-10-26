import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoteService } from '../../../../core/services/note.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../core/utils/http-error';
import { Note, NOTE_CONTENT_MAX, NotePayload } from '../../../../core/models/note.model';
import {
  FolderOption,
  FolderTagPicker,
  TagOption,
} from '../../../../shared/components/folder-tag-picker/folder-tag-picker';

export interface NoteFormDialogData {
  note: Note | null;
}

const notBlank = (control: { value: string | null }) => (control.value?.trim() ? null : { required: true });

// Saves through NoteService itself (unlike the bookmark dialog) so it can show a saving
// state, block duplicate submits and stay open with the user's input when the save fails.
@Component({
  selector: 'app-note-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, FolderTagPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-form-dialog.html',
})
export class NoteFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly noteService = inject(NoteService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<NoteFormDialog, Note>);
  private readonly data = inject<NoteFormDialogData>(MAT_DIALOG_DATA);

  readonly contentMax = NOTE_CONTENT_MAX;
  readonly isEditMode = !!this.data.note;
  readonly saving = signal(false);

  readonly selectedFolder = signal<FolderOption | null>(this.data.note?.folder ?? null);
  readonly selectedTags = signal<TagOption[]>(this.data.note?.tags ?? []);

  readonly form = this.fb.group({
    title: this.fb.control(this.data.note?.title ?? '', [notBlank, Validators.maxLength(150)]),
    content: this.fb.control(this.data.note?.content ?? '', [notBlank, Validators.maxLength(NOTE_CONTENT_MAX)]),
  });

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, content } = this.form.getRawValue();
    const payload: NotePayload = {
      title: title!.trim(),
      content: content!,
      folder: this.selectedFolder()?._id ?? null,
      tags: this.selectedTags().map((tag) => tag._id),
    };

    const request = this.data.note
      ? this.noteService.update(this.data.note._id, payload)
      : this.noteService.create(payload);

    this.saving.set(true);
    this.dialogRef.disableClose = true;

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (note) => {
        this.notify.success(this.isEditMode ? 'Note updated successfully.' : 'Note created successfully.');
        this.dialogRef.close(note);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.notify.error(extractErrorMessage(err, this.isEditMode ? 'Unable to update note.' : 'Unable to create note.'));
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ColorPicker } from '../../../../shared/components/color-picker/color-picker';
import { Tag, TagPayload, TAG_COLORS } from '../../../../core/models/tag.model';

export interface TagFormDialogData {
  tag: Tag | null;
}

@Component({
  selector: 'app-tag-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, ColorPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-form-dialog.html',
})
export class TagFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TagFormDialog, TagPayload>);
  private readonly data = inject<TagFormDialogData>(MAT_DIALOG_DATA);

  readonly colors = TAG_COLORS;
  readonly isEditMode = !!this.data.tag;

  readonly form = this.fb.group({
    name: this.fb.control(this.data.tag?.name ?? '', [Validators.required, Validators.maxLength(30)]),
    color: this.fb.control(this.data.tag?.color ?? TAG_COLORS[0], [Validators.required]),
  });

  selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, color } = this.form.getRawValue();

    const payload: TagPayload = {
      name: name!.trim(),
      color: color!,
    };

    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

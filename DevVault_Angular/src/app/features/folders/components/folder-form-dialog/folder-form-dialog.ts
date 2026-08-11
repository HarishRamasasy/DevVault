import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ColorPicker } from '../../../../shared/components/color-picker/color-picker';
import { Folder, FolderPayload, FOLDER_COLORS, FOLDER_ICONS } from '../../../../core/models/folder.model';

export interface FolderFormDialogData {
  folder: Folder | null;
}

@Component({
  selector: 'app-folder-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule, ColorPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-form-dialog.html',
})
export class FolderFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<FolderFormDialog, FolderPayload>);
  private readonly data = inject<FolderFormDialogData>(MAT_DIALOG_DATA);

  readonly colors = FOLDER_COLORS;
  readonly icons = FOLDER_ICONS;
  readonly isEditMode = !!this.data.folder;

  readonly form = this.fb.group({
    name: this.fb.control(this.data.folder?.name ?? '', [Validators.required, Validators.maxLength(50)]),
    description: this.fb.control(this.data.folder?.description ?? '', [Validators.maxLength(500)]),
    color: this.fb.control(this.data.folder?.color ?? FOLDER_COLORS[0], [Validators.required]),
    icon: this.fb.control(this.data.folder?.icon ?? FOLDER_ICONS[0], [Validators.required]),
  });

  selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, color, icon } = this.form.getRawValue();

    const payload: FolderPayload = {
      name: name!.trim(),
      description: description?.trim() ?? '',
      color: color!,
      icon: icon!,
    };

    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

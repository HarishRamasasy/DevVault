import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error';
import { PasswordVisibility } from '../../../core/utils/password-visibility';
import { passwordMatchValidator } from '../../../core/validators/password-match.validator';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly fields = [
    { key: 'currentPassword', label: 'Current password', autocomplete: 'current-password', visibility: new PasswordVisibility() },
    { key: 'newPassword', label: 'New password', autocomplete: 'new-password', visibility: new PasswordVisibility() },
    { key: 'confirmPassword', label: 'Confirm new password', autocomplete: 'new-password', visibility: new PasswordVisibility() },
  ] as const;

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator('newPassword', 'confirmPassword') },
  );

  onSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.notify.success('Password changed successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.serverError.set(extractErrorMessage(err, 'Unable to change password. Please try again.'));
      },
    });
  }
}

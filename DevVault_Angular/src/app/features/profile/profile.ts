import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly user = this.authService.currentUser;
  readonly initials = this.authService.initials;

  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    // Refresh the cached user so the page never shows stale data from localStorage.
    this.authService.fetchCurrentUser().subscribe({
      next: () => this.loading.set(false),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notify.error(extractErrorMessage(err, 'Unable to load your profile.'));
      },
    });
  }

  startEdit(): void {
    const user = this.user();
    this.form.reset({ name: user?.name ?? '', email: user?.email ?? '' });
    this.serverError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  isUnchanged(): boolean {
    const { name, email } = this.form.getRawValue();
    const user = this.user();
    return name.trim() === user?.name && email.trim().toLowerCase() === user?.email;
  }

  onSubmit(): void {
    if (this.form.invalid || this.isUnchanged() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email } = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);

    this.authService.updateProfile({ name: name.trim(), email: email.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.notify.success('Profile updated successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.serverError.set(extractErrorMessage(err, 'Unable to update profile. Please try again.'));
      },
    });
  }
}

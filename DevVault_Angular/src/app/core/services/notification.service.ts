import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 3000, panelClass: ['app-snackbar', 'app-snackbar--success'] });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 5000, panelClass: ['app-snackbar', 'app-snackbar--error'] });
  }
}

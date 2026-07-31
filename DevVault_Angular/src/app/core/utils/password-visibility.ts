import { signal } from '@angular/core';

export class PasswordVisibility {
  readonly hidden = signal(true);

  toggle(): void {
    this.hidden.update((value) => !value);
  }
}

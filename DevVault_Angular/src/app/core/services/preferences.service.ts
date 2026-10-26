import { effect, Injectable, signal } from '@angular/core';

const COLLAPSED_KEY = 'devvault_sidebar_collapsed';

// Per-device UI preferences, kept in localStorage alongside the session.
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  readonly sidebarCollapsed = signal(localStorage.getItem(COLLAPSED_KEY) === 'true');

  constructor() {
    effect(() => localStorage.setItem(COLLAPSED_KEY, String(this.sidebarCollapsed())));
  }
}

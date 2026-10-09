import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PreferencesService } from '../../core/services/preferences.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
})
export class Settings {
  readonly preferences = inject(PreferencesService);

  readonly accountLinks = [
    { route: '/profile', icon: 'person', label: 'Profile', description: 'Update your name and email address.' },
    { route: '/settings/password', icon: 'lock', label: 'Change password', description: 'Set a new password for your account.' },
  ];
}

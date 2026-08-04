import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
}

const STAT_CARDS: StatCard[] = [
  { label: 'Bookmarks', value: 0, icon: 'bookmark' },
  { label: 'Folders', value: 0, icon: 'folder' },
  { label: 'Notes', value: 0, icon: 'description' },
  { label: 'Snippets', value: 0, icon: 'code' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly stats = STAT_CARDS;
}

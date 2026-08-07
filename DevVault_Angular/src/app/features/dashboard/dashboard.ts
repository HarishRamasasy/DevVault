import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { FolderService } from '../../core/services/folder.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly folderService = inject(FolderService);

  readonly currentUser = this.authService.currentUser;
  readonly stats = signal<StatCard[]>(STAT_CARDS);

  constructor() {
    this.folderService.list().subscribe({
      next: (folders) => this.updateStat('Folders', folders.length),
      error: () => this.updateStat('Folders', 0),
    });
  }

  private updateStat(label: string, value: number): void {
    this.stats.update((cards) => cards.map((card) => (card.label === label ? { ...card, value } : card)));
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { BookmarkService } from '../../core/services/bookmark.service';
import { FolderService } from '../../core/services/folder.service';
import { TagService } from '../../core/services/tag.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/http-error';

interface StatCard {
  label: string;
  value: number;
  icon: string;
}

const STAT_CARDS: StatCard[] = [
  { label: 'Bookmarks', value: 0, icon: 'bookmark' },
  { label: 'Folders', value: 0, icon: 'folder' },
  { label: 'Tags', value: 0, icon: 'label' },
  { label: 'Notes', value: 0, icon: 'description' },
  { label: 'Snippets', value: 0, icon: 'code' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly bookmarkService = inject(BookmarkService);
  private readonly folderService = inject(FolderService);
  private readonly tagService = inject(TagService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.authService.currentUser;
  readonly stats = signal<StatCard[]>(STAT_CARDS);

  constructor() {
    this.loadStat('Bookmarks', this.bookmarkService.list({ limit: 1 }).pipe(map((res) => res.pagination.total)), 'bookmark');
    this.loadStat('Folders', this.folderService.list().pipe(map((folders) => folders.length)), 'folder');
    this.loadStat('Tags', this.tagService.list().pipe(map((tags) => tags.length)), 'tag');
  }

  private loadStat(label: string, request: Observable<number>, resourceName: string): void {
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (count) => this.updateStat(label, count),
      error: (err: HttpErrorResponse) =>
        this.notify.error(extractErrorMessage(err, `Unable to load ${resourceName} count.`)),
    });
  }

  private updateStat(label: string, value: number): void {
    this.stats.update((cards) => cards.map((card) => (card.label === label ? { ...card, value } : card)));
  }
}

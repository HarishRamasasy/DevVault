import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Bookmark, BOOKMARK_TYPES } from '../../../../core/models/bookmark.model';

@Component({
  selector: 'app-bookmark-card',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmark-card.html',
  styleUrl: './bookmark-card.css',
})
export class BookmarkCard {
  @Input({ required: true }) bookmark!: Bookmark;
  @Input() favoritePending = false;

  @Output() edit = new EventEmitter<Bookmark>();
  @Output() remove = new EventEmitter<Bookmark>();
  @Output() toggleFavorite = new EventEmitter<Bookmark>();

  get hostname(): string {
    try {
      return new URL(this.bookmark.url).hostname.replace(/^www\./, '');
    } catch {
      return this.bookmark.url;
    }
  }

  get typeLabel(): string {
    return BOOKMARK_TYPES.find((option) => option.value === this.bookmark.type)?.label ?? 'Other';
  }
}

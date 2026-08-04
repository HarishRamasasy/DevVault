import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-bookmark-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookmark-skeleton.html',
  styleUrl: './bookmark-skeleton.css',
})
export class BookmarkSkeleton {
  @Input() count = 6;

  get placeholders(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}

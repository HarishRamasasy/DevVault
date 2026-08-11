import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type CardSkeletonVariant = 'bookmark' | 'folder' | 'tag';

@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-skeleton.html',
})
export class CardSkeleton {
  @Input() variant: CardSkeletonVariant = 'bookmark';
  @Input() count = 6;

  get placeholders(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}

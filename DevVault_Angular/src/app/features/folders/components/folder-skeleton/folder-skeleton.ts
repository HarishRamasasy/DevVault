import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-folder-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-skeleton.html',
  styleUrl: './folder-skeleton.css',
})
export class FolderSkeleton {
  @Input() count = 6;

  get placeholders(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}

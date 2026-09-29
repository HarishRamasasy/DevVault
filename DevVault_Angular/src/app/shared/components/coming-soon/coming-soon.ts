import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coming-soon.html',
})
export class ComingSoon {
  @Input() title = 'Coming Soon';
  @Input() icon = 'hourglass_empty';
}

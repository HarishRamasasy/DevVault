import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './color-picker.html',
})
export class ColorPicker {
  @Input({ required: true }) colors!: string[];
  @Input() selected: string | null = null;

  @Output() colorSelected = new EventEmitter<string>();
}

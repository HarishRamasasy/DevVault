import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Tag } from '../../../../core/models/tag.model';

@Component({
  selector: 'app-tag-card',
  standalone: true,
  imports: [MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-card.html',
})
export class TagCard {
  @Input({ required: true }) tag!: Tag;

  @Output() edit = new EventEmitter<Tag>();
  @Output() remove = new EventEmitter<Tag>();
}

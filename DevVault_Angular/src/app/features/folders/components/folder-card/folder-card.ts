import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Folder } from '../../../../core/models/folder.model';

@Component({
  selector: 'app-folder-card',
  standalone: true,
  imports: [MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-card.html',
  styleUrl: './folder-card.css',
})
export class FolderCard {
  @Input({ required: true }) folder!: Folder;

  @Output() edit = new EventEmitter<Folder>();
  @Output() remove = new EventEmitter<Folder>();
}

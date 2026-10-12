import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Note } from '../../../../core/models/note.model';

@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-card.html',
})
export class NoteCard {
  @Input({ required: true }) note!: Note;
  @Input() favoritePending = false;

  @Output() edit = new EventEmitter<Note>();
  @Output() remove = new EventEmitter<Note>();
  @Output() toggleFavorite = new EventEmitter<Note>();
}

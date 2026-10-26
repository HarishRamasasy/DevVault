import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Snippet } from '../../../../core/models/snippet.model';
import { CodeBlock } from '../../../../shared/components/code-block/code-block';

@Component({
  selector: 'app-snippet-card',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, DatePipe, RouterLink, CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snippet-card.html',
})
export class SnippetCard {
  @Input({ required: true }) snippet!: Snippet;
  @Input() favoritePending = false;

  @Output() edit = new EventEmitter<Snippet>();
  @Output() remove = new EventEmitter<Snippet>();
  @Output() toggleFavorite = new EventEmitter<Snippet>();
}

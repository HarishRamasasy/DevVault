import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FolderService } from '../../../core/services/folder.service';
import { TagService } from '../../../core/services/tag.service';
import { Folder } from '../../../core/models/folder.model';
import { Tag } from '../../../core/models/tag.model';
import { BookmarkFolderRef, BookmarkTagRef } from '../../../core/models/bookmark.model';

export type FolderOption = Folder | BookmarkFolderRef;
export type TagOption = Tag | BookmarkTagRef;

// Searchable folder autocomplete + multi-select tag chips, shared by the bookmark and note forms.
@Component({
  selector: 'app-folder-tag-picker',
  standalone: true,
  imports: [MatAutocompleteModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-tag-picker.html',
  host: { class: 'block space-y-4' },
})
export class FolderTagPicker {
  private readonly folderService = inject(FolderService);
  private readonly tagService = inject(TagService);

  readonly folder = model<FolderOption | null>(null);
  readonly selectedTags = model<TagOption[]>([]);

  readonly folders = toSignal(this.folderService.list(), { initialValue: [] as Folder[] });
  readonly folderSearchText = signal('');

  readonly filteredFolders = computed(() => {
    const term = this.folderSearchText().trim().toLowerCase();
    const list = this.folders();
    return term ? list.filter((folder) => folder.name.toLowerCase().includes(term)) : list;
  });

  readonly tags = toSignal(this.tagService.list(), { initialValue: [] as Tag[] });
  readonly tagSearchText = signal('');

  readonly filteredTags = computed(() => {
    const term = this.tagSearchText().trim().toLowerCase();
    const selectedIds = new Set(this.selectedTags().map((tag) => tag._id));
    const available = this.tags().filter((tag) => !selectedIds.has(tag._id));
    return term ? available.filter((tag) => tag.name.toLowerCase().includes(term)) : available;
  });

  ngOnInit(): void {
    this.folderSearchText.set(this.folder()?.name ?? '');
  }

  onFolderInput(value: string): void {
    this.folderSearchText.set(value);
    if (!value) {
      this.folder.set(null);
    }
  }

  onFolderSelected(event: MatAutocompleteSelectedEvent): void {
    const folder = event.option.value as FolderOption;
    this.folder.set(folder);
    this.folderSearchText.set(folder.name);
  }

  clearFolder(): void {
    this.folder.set(null);
    this.folderSearchText.set('');
  }

  onTagInput(value: string): void {
    this.tagSearchText.set(value);
  }

  onTagSelected(event: MatAutocompleteSelectedEvent, tagInput: HTMLInputElement): void {
    const tag = event.option.value as TagOption;
    this.selectedTags.update((list) => [...list, tag]);
    this.tagSearchText.set('');
    tagInput.value = '';
  }

  removeTag(tag: TagOption): void {
    this.selectedTags.update((list) => list.filter((item) => item._id !== tag._id));
  }
}

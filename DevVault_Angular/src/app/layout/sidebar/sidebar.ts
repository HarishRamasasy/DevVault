import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Bookmarks', icon: 'bookmark', route: '/bookmarks' },
  { label: 'Folders', icon: 'folder', route: '/folders' },
  { label: 'Tags', icon: 'label', route: '/tags' },
  { label: 'Notes', icon: 'description', route: '/notes' },
  { label: 'Snippets', icon: 'code', route: '/snippets' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() collapsed = false;
  @Output() navigated = new EventEmitter<void>();

  readonly navItems = NAV_ITEMS;

  onNavigate(): void {
    this.navigated.emit();
  }
}

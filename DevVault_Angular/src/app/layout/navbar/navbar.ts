import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatMenuModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Output() menuToggle = new EventEmitter<void>();

  readonly currentUser = this.authService.currentUser;

  readonly initials = computed(() => {
    const name = this.currentUser()?.name ?? '';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { Breadcrumb } from './breadcrumb/breadcrumb';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, Sidebar, Navbar, Breadcrumb],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly isTablet = toSignal(
    this.breakpointObserver.observe(TABLET_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  readonly sidenavOpened = signal(true);
  readonly sidebarCollapsed = signal(false);

  readonly sidenavMode = computed<'over' | 'side'>(() => (this.isMobile() ? 'over' : 'side'));

  constructor() {
    effect(() => {
      if (this.isMobile()) {
        this.sidenavOpened.set(false);
        this.sidebarCollapsed.set(false);
      } else if (this.isTablet()) {
        this.sidenavOpened.set(true);
        this.sidebarCollapsed.set(true);
      } else {
        this.sidenavOpened.set(true);
        this.sidebarCollapsed.set(false);
      }
    });
  }

  toggleSidenav(): void {
    if (this.isMobile()) {
      this.sidenavOpened.update((opened) => !opened);
    } else {
      this.sidebarCollapsed.update((collapsed) => !collapsed);
    }
  }

  closeSidenavOnMobile(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }
}

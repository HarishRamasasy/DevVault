import { Component, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

interface Crumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb {
  private readonly router = inject(Router);

  readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.buildCrumbs()),
    ),
    { initialValue: this.buildCrumbs() },
  );

  private buildCrumbs(): Crumb[] {
    const crumbs: Crumb[] = [];
    let snapshot: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let url = '';

    while (snapshot) {
      const segments = snapshot.url.map((segment) => segment.path).join('/');
      if (segments) {
        url += `/${segments}`;
      }

      const title = snapshot.data['title'];
      if (title) {
        crumbs.push({ label: title, url });
      }

      snapshot = snapshot.firstChild;
    }

    return crumbs;
  }
}

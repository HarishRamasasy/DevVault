import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        data: { title: 'Dashboard' },
      },
      {
        path: 'bookmarks',
        loadComponent: () => import('./features/bookmarks/bookmarks').then((m) => m.Bookmarks),
        data: { title: 'Bookmarks' },
      },
      {
        path: 'folders',
        loadComponent: () => import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Folders', icon: 'folder' },
      },
      {
        path: 'tags',
        loadComponent: () => import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Tags', icon: 'label' },
      },
      {
        path: 'notes',
        loadComponent: () => import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Notes', icon: 'description' },
      },
      {
        path: 'snippets',
        loadComponent: () => import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Snippets', icon: 'code' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Settings', icon: 'settings' },
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];

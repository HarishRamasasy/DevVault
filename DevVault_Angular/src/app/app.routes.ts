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
        loadComponent: () => import('./features/folders/folders').then((m) => m.Folders),
        data: { title: 'Folders' },
      },
      {
        path: 'tags',
        loadComponent: () => import('./features/tags/tags').then((m) => m.Tags),
        data: { title: 'Tags' },
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
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
        data: { title: 'Profile' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
        data: { title: 'Settings' },
      },
      {
        path: 'settings/password',
        loadComponent: () =>
          import('./features/settings/change-password/change-password').then((m) => m.ChangePassword),
        data: { title: 'Change Password' },
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];

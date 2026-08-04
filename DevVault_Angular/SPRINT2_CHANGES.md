# Sprint 2 — Dashboard Shell & Application Layout

Scope: authenticated application shell only — layout, routing, and navigation.
No CRUD, no Bookmarks/Folders logic, no new API endpoints. Authentication and
the backend were not touched.

## What was added

### New components

| Component | Path | Purpose |
|---|---|---|
| `Layout` | `src/app/layout/layout.ts` | Root authenticated shell: renders the sidebar, navbar, breadcrumb, and the routed page in a `mat-sidenav-container`. Owns responsive behavior via `BreakpointObserver` (mobile = drawer `over` mode, tablet = collapsed icon-only `side` mode, desktop = full `side` mode, fixed & always open). |
| `Sidebar` | `src/app/layout/sidebar/sidebar.ts` | Left navigation: Dashboard, Bookmarks, Folders, Tags, Notes, Snippets, Settings. Supports a `collapsed` (icon-only) state with tooltips, and highlights the active route. |
| `Navbar` | `src/app/layout/navbar/navbar.ts` | Fixed top bar: sidebar toggle, search box (UI only, non-functional), notification bell (UI only), and a user menu (avatar + name) with Profile / Settings / Logout. Logout calls the existing `AuthService.logout()` and redirects to `/auth/login`. |
| `Breadcrumb` | `src/app/layout/breadcrumb/breadcrumb.ts` | Reads `route.data.title` off the active route tree and renders a Home → … → current-page trail. Reusable for any future nested routes. |
| `Dashboard` | `src/app/features/dashboard/dashboard.ts` | Rebuilt from the Sprint 1 placeholder. Shows a "Welcome back, `{{ user.name }}`" header and 4 stat cards (Bookmarks, Folders, Notes, Snippets), all hardcoded to `0` — there is no backing API yet. |
| `ComingSoon` | `src/app/shared/components/coming-soon/coming-soon.ts` | Generic placeholder page (`title` + `icon` inputs bound straight from route `data` via `withComponentInputBinding()`). Used by every sidebar route except Dashboard. |

### Routing (`src/app/app.routes.ts`)

- `/dashboard`, `/bookmarks`, `/folders`, `/tags`, `/notes`, `/snippets`, `/settings` are now children of a new parent route (`path: ''`) that lazy-loads `Layout` and is guarded by the existing `authGuard` — so the guard protects the whole shell, not each page individually.
- Every child route (except `dashboard`, which loads the real `Dashboard`) lazy-loads the shared `ComingSoon` component and passes its `title`/`icon` via route `data`.
- Auth routes (`/auth/login`, `/auth/register`) and their `guestGuard` are unchanged.

### `app.config.ts`

- Added `withComponentInputBinding()` to `provideRouter(...)` so route `data` (e.g. `title`, `icon`) binds directly to `@Input()`s on `ComingSoon` without a resolver or manual subscription.

## Design

Tailwind-first, matching the existing auth pages: white/gray palette, blue-600 accents, `rounded-2xl`/`rounded-lg` cards, soft shadows, generous whitespace. Angular Material is used sparingly (icons via the ligature font already loaded in `index.html`, plus `mat-sidenav`, `mat-menu`, `mat-tooltip` for behavior) — structure and visuals stay in Tailwind utility classes, consistent with how `login`/`register` were built.

## Responsive behavior

- **Desktop (≥1024px)** — sidebar fixed open at 260px, navbar fixed, only the `<main>` content area scrolls.
- **Tablet (768–1023px)** — sidebar stays visible but collapses to a 72px icon-only rail; the navbar's menu button expands/collapses it.
- **Mobile (<768px)** — sidebar becomes an overlay drawer (`mat-sidenav mode="over"`), closed by default, opened via the navbar's menu button, and auto-closes after tapping a nav link.

## Not done (intentionally out of scope for this sprint)

- No Bookmarks/Folders/Tags/Notes/Snippets CRUD or data models.
- No new backend endpoints — the stat cards are static `0`s since no `/dashboard/stats`-style API exists yet.
- No changes to `AuthService`, guards, interceptors, or the Node backend.

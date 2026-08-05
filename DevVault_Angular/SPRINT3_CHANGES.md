# Sprint 3 — Bookmark Management

Scope: the full Bookmark Management module — backend API, and the frontend
feature that consumes it. Authentication, the dashboard shell, and protected
routing were not touched. Folders, Tags, Notes, Snippets, Settings, global
search, and analytics remain out of scope (still "Coming Soon" / untouched).

## Backend (`DevVault_Node`)

Filled in the two stub files from earlier scaffolding and added the rest of
the layer stack, following the existing `auth` module's architecture
(model → service → controller → routes, with shared `ApiError`/`ApiResponse`
and `validate`/`protect` middleware):

| File | Purpose |
|---|---|
| `models/Bookmark.js` | Mongoose schema: `title`, `url`, `description`, `type` (enum: article/video/documentation/repository/tool/other), `folder` (optional `ObjectId` ref, nullable — no `Folder` model/CRUD yet, kept forward-compatible), `tags` (string array), `favorite`, `archived`, `user` (owner ref), timestamps. Indexed on `{ user, createdAt }` and `{ user, favorite }` for the common list/filter queries. |
| `validators/bookmark.validator.js` | `express-validator` chains for create/update/list/id, mirroring `auth.validator.js` style. Validates `url` with `isURL({ require_protocol: true })`, enforces `type` enum, `tags` as an array of non-empty strings, Mongo ObjectId shape for `:id`/`folder`. |
| `services/bookmark.service.js` | All DB access and business rules. Every read/update/delete goes through `findOwnedBookmark(id, userId)`, which throws `404` if the bookmark doesn't exist and `403` if it belongs to a different user. Tags are normalized (trimmed, lowercased, deduped) on create/update. `listBookmarks` supports `search` (regex over title/description/url/tags), `favorite`, `type`, `tag`, and `sortBy`/`sortOrder`, and excludes archived bookmarks unless `archived` is explicitly requested. |
| `controllers/bookmark.controller.js` | Thin HTTP layer — delegates to the service, wraps responses in `ApiResponse`, forwards errors to `next()`. |
| `routes/bookmark.routes.js` | Wires validators → `validate` → controller. `router.use(protect)` guards the entire router, so every bookmark route requires a valid JWT. |
| `server.js` | Mounted the new router at `app.use('/api/bookmarks', bookmarkRoutes)`. |

### REST API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/bookmarks` | Create |
| GET | `/api/bookmarks` | List (own bookmarks only; `search`, `favorite`, `type`, `tag`, `sortBy`, `sortOrder` query params) |
| GET | `/api/bookmarks/:id` | Fetch one |
| PUT | `/api/bookmarks/:id` | Update |
| DELETE | `/api/bookmarks/:id` | Delete |
| PATCH | `/api/bookmarks/:id/favorite` | Toggle favorite |

### Backend verification (live, against the real MongoDB Atlas cluster)

Ran the server and drove every endpoint with `curl` end-to-end, then deleted
the test users/bookmarks afterward:

- Create with no token → `401`; create with an invalid URL → `400` with a clear validation message.
- Create, list (verified newest-first default, `search=`, `sortBy=title&sortOrder=asc`), get-by-id, update, favorite toggle (on/off), delete — all round-tripped correctly, tags were deduped/lowercased as expected.
- Get/update/delete with a malformed id → `400`; with a valid but nonexistent id → `404`.
- **Ownership enforcement**: registered a second user, confirmed their bookmark list was empty, and that GET/PUT/DELETE/PATCH-favorite against the first user's bookmark all returned `403 "You are not allowed to access this bookmark"`.

## Frontend (`DevVault_Angular`)

### Core layer

- `core/models/bookmark.model.ts` — `Bookmark`, `BookmarkPayload`, `BookmarkQueryParams` interfaces and the `BOOKMARK_TYPES` option list, matching the backend schema field-for-field.
- `core/services/bookmark.service.ts` — the only place that talks to `/api/bookmarks` (list/create/update/delete/toggleFavorite), each method unwrapping `ApiSuccessResponse<T>` to the plain data the UI needs. Single responsibility: no UI state lives here, matching the existing `AuthService` pattern.

### New components

| Component | Path | Role |
|---|---|---|
| `Bookmarks` | `features/bookmarks/bookmarks.ts` | Container/page. Owns all UI state as signals (list, loading, error, search term, favorites-only, sort), fetches once on init, and applies search/favorite-filter/sort client-side via a single `computed()`. Mutates local state optimistically after create/update/delete/favorite instead of refetching the whole list. `ChangeDetectionStrategy.OnPush`. |
| `BookmarkCard` | `features/bookmarks/components/bookmark-card/` | Presentational only — `@Input bookmark`, emits `edit`/`remove`/`toggleFavorite`. Shows type badge, hostname, title (links out), description, tags, and a favorite star + overflow menu (Edit/Delete). `OnPush`. |
| `BookmarkFormDialog` | `features/bookmarks/components/bookmark-form-dialog/` | `MatDialog` content component used for both create and edit (`data.bookmark: Bookmark \| null` decides the mode). Client-side validates title/url/description length and URL shape; closes with a `BookmarkPayload` the container then sends to the service — the dialog itself never calls HTTP. |
| `ConfirmDialog` | `shared/components/confirm-dialog/` | Generic yes/no `MatDialog` (title/message/labels/`danger` via `MAT_DIALOG_DATA`), resolves `true`/`false`. Used for delete confirmation here, written to be reused by any future feature that needs a confirm step. |
| `EmptyState` | `shared/components/empty-state/` | Generic icon/title/message/optional-action block, reused for both "no bookmarks yet" and "no results match your filters". |

### Routing

`app.routes.ts` — the `/bookmarks` child route now lazy-loads `Bookmarks` instead of the shared `ComingSoon` placeholder. Still nested under the existing `authGuard`-protected `Layout` route, so nothing about protected routing changed.

### Features implemented

Create, edit, delete (with confirmation), favorite toggle, open-in-new-tab, search (title/description/url/tags), sort (newest/oldest/title A–Z/Z–A), and favorites-only filter — search/sort/filter all run client-side over the already-fetched list for instant feedback. Loading state shows skeleton cards; API errors surface as a dismissable-by-retry banner rather than crashing the page.

### Design

Reused the Sprint 1/2 visual language exactly: white/gray palette, blue-600 accents, `rounded-2xl` cards with soft shadows, Tailwind for structure, Material only for icons/menu/dialog/tooltip behavior. Dashboard layout was not touched.

## Not done (intentionally out of scope)

- Folder/Tag CRUD — `folder` is stored on the bookmark (nullable ref) but there's no Folder picker UI or Folder API yet.
- Notes, Snippets, Settings — still `ComingSoon`.
- Global search, analytics — not part of this sprint.
- The Dashboard's "Bookmarks" stat card is still hardcoded to `0` (dashboard layout/logic was explicitly out of scope for this sprint).

## Known limitation in verification

This environment has no browser-automation tool, so the Angular UI (dialogs, search/sort/filter interactions, responsive card grid) could not be visually driven end-to-end — only compiled (`ng build`, full template type-checking, no errors) and code-reviewed. The backend, which carries the higher correctness risk (ownership/authorization, validation), was fully exercised live against the real database as described above. Manual click-through in a browser is still recommended before considering this sprint fully verified.

## Gap-fix pass (2026-08-04)

A follow-up review compared the implementation above against the full Sprint 3 spec line-by-line and closed the gaps found. Nothing about Authentication, the Dashboard layout, or routing was touched.

### Backend (`DevVault_Node`)

| File | Change |
|---|---|
| `validators/bookmark.validator.js` | Added optional `page` (positive integer) and `limit` (1–100) query validators for `GET /api/bookmarks`. |
| `services/bookmark.service.js` | `listBookmarks` now computes `total` via `countDocuments` and returns a `pagination` object (`page`, `limit`, `total`, `totalPages`). Pagination (`skip`/`limit`) is only applied when the caller passes `page` and/or `limit` — omitting both preserves the previous "return everything" behavior so the existing frontend (which fetches the full list once and filters/sorts client-side) is unaffected. |
| `controllers/bookmark.controller.js` | `listBookmarks` response now includes `pagination` alongside `bookmarks`/`count`. |

The spec required the list endpoint to "support pagination"; it previously always returned the full result set with no way to page through it.

### Frontend (`DevVault_Angular`)

| Area | Change |
|---|---|
| `core/models/bookmark.model.ts` | `BookmarkPayload` gained an optional `favorite` field. |
| `bookmark-form-dialog` | The create/edit form was missing the **Favorite** field listed in the spec (Title, URL, Description, Type, Tags, Favorite). Added a checkbox control, wired into the form group and the submitted payload, pre-populated from the bookmark when editing. |
| `bookmark-card` | The card was missing the **Created Date** required on every bookmark card. Added a formatted date (`DatePipe`, `MMM d, y`) with a clock icon next to the "Open" action. |
| `features/bookmarks/components/bookmark-skeleton/` (new) | The spec lists "Loading Skeleton" as its own component; the loading state was previously a few inline pulsing `<div>`s inside `bookmarks.html`. Extracted into a standalone, `OnPush`, reusable `BookmarkSkeleton` component (`@Input count`) that mirrors the real card's layout. |
| `core/services/notification.service.ts` (new) | The spec requires toast/snackbar feedback for create/update/delete/network/validation errors; the page only had a dismiss-on-retry inline red banner and no success feedback at all. Added a small `NotificationService` wrapping `MatSnackBar` (`success()`/`error()`), styled via new `.app-snackbar` classes in `src/styles.css`. |
| `features/bookmarks/bookmarks.ts` | Create/update/delete now show a success snackbar and route failures through `NotificationService.error()` instead of the page-level `error` signal. The inline banner is now reserved for the initial list-load failure only (a page-level state, not a single action). Favorite-toggle failures also surface via snackbar. Search input is now debounced (300ms, `debounceTime` + `distinctUntilChanged`, `takeUntilDestroyed`) before it updates the signal the `computed()` filter reads — the input itself still updates instantly for a responsive feel, only the filtering is debounced. |
| `bookmarks.html` | Swapped the inline skeleton markup for `<app-bookmark-skeleton />` and wired the search box to the new debounced handler. |

### Verification

- `ng build` — compiles cleanly, no new errors or warnings.
- `node --check` on every modified backend file — no syntax errors.
- Live database round-trip of the new pagination params was not re-run in this pass; the query-shape logic (skip/limit computed from validated, bounded inputs) mirrors the existing filter logic that was already verified live.

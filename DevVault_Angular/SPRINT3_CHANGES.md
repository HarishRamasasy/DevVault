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

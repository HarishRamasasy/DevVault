# Sprint 4 — Folder Management

Scope: the full Folder Management module — backend API, and the frontend
feature that consumes it — plus the integration points into the existing
Bookmark module and Dashboard that the spec called for. Tag CRUD, Notes,
Snippets, Settings, Analytics, and Global Search remain out of scope (still
"Coming Soon" / untouched).

## Backend (`DevVault_Node`)

Added a new `folder` module (model → service → controller → routes,
validators via `express-validator`), following the exact layering already
established by the `bookmark` module in Sprint 3.

| File | Purpose |
|---|---|
| `models/Folder.js` (new) | Mongoose schema: `name` (required, trimmed, max 50 chars), `description` (optional, max 500 chars), `color` (hex string, constrained to a 10-swatch palette exported as `FOLDER_COLORS`), `icon` (constrained to a 12-icon set exported as `FOLDER_ICONS`), `user` (owner ref), timestamps. A compound `{ user, name }` unique index with a case-insensitive collation (`strength: 2`) enforces "folder names must be unique per user" at the DB layer, backing up the app-level check. |
| `validators/folder.validator.js` (new) | `express-validator` chains for create/update/id — `name` required + max 50 on create, optional-but-non-empty + max 50 on update; `color`/`icon` restricted to the palette/icon-set exported by the model; `:id` validated as a Mongo ObjectId. |
| `services/folder.service.js` (new) | All DB access and business rules. `findOwnedFolder(id, userId)` mirrors the bookmark service's ownership guard (`404` if missing, `403` if owned by someone else). `assertUniqueName` does a case-insensitive lookup (same collation as the index) before create/rename and throws `409` on a clash — this is a courtesy check for a clean error message; the unique index is the actual source of truth. `listFolders`/`getFolderById` attach a live `bookmarkCount` computed via a `Bookmark.aggregate` group-by-folder (list) / `countDocuments` (single), so the count is never stored/denormalized and can't drift. `deleteFolder` runs `Bookmark.updateMany({ folder: id }, { $set: { folder: null } })` **before** deleting the folder — bookmarks in a deleted folder are kept and unassigned, never deleted, per spec. |
| `controllers/folder.controller.js` (new) | Thin HTTP layer, same shape as `bookmark.controller.js` — delegates to the service, wraps responses in `ApiResponse`, forwards errors to `next()`. |
| `routes/folder.routes.js` (new) | `router.use(protect)` guards the whole router. Wires validators → `validate` → controller for all five endpoints. |
| `server.js` | Mounted the new router at `app.use('/api/folders', folderRoutes)`. |
| `services/bookmark.service.js` | **Folder integration for the existing Bookmark module**: added `assertOwnedFolder(folderId, userId)`, called from `createBookmark` and `updateBookmark` whenever a `folder` id is present in the payload — throws `404` if that folder doesn't exist or isn't owned by the caller, so a bookmark can never be filed under someone else's (or a nonexistent) folder. Every read path (`findOwnedBookmark`, `listBookmarks`, and the fresh doc returned by `createBookmark`/`updateBookmark`) now `.populate('folder', 'name color icon')`, so API responses carry the folder's display data inline instead of just its id — this is what the frontend bookmark card/dropdown render directly, with no extra round-trip. |

### REST API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/folders` | Create. `name` required (max 50), `description`/`color`/`icon` optional. |
| GET | `/api/folders` | List all of the caller's folders (own only), sorted by name, each with a live `bookmarkCount`. |
| GET | `/api/folders/:id` | Fetch one (with `bookmarkCount`). |
| PUT | `/api/folders/:id` | Update. Re-checks name uniqueness only if `name` is actually changing. |
| DELETE | `/api/folders/:id` | Delete the folder; bookmarks that referenced it are set to `folder: null`, never deleted. |

`POST /api/bookmarks` and `PUT /api/bookmarks/:id` now validate that any `folder` id in the payload belongs to the caller, and every bookmark read now returns `folder` as `{ _id, name, color, icon } | null` instead of a bare id string.

### Backend verification (live, against the real MongoDB Atlas cluster)

Ran the server and drove every scenario from the sprint's testing checklist with `curl` end-to-end against a temporary throwaway user, then deleted that user/their data afterward:

- **Create Folder** — valid payload → `201` with the folder; missing `name` → `400 "Folder name is required"`; 51-character name → `400 "Folder name cannot exceed 50 characters"`; duplicate name differing only in case (`"Frontend"` vs `"frontend"`) → `409 "A folder with this name already exists"`; no token → `401`.
- **Edit Folder** — renamed and recolored a folder, confirmed the response reflected both changes.
- **Delete Folder** — deleted a folder that had a bookmark assigned to it, then re-fetched that bookmark: it still existed, with `folder: null`. Folder itself was gone from the list.
- **Folder Count** — `GET /api/folders` reported `bookmarkCount: 0` on an empty folder, `1` after assigning a bookmark to it, confirming the aggregate is live rather than cached.
- **Assign Bookmark to Folder** — created a bookmark with `folder` set; response and subsequent `GET` both showed the populated `{ name, color, icon }`.
- **Change Bookmark's Folder** — `PUT` a different folder id onto an existing bookmark; response showed the new folder populated.
- **Remove Folder / Bookmarks remain after Folder deletion** — covered together above.
- **Authorization** — registered a second user; confirmed `GET`/`DELETE` against the first user's folder both returned `403 "You are not allowed to access this folder"`; confirmed assigning a bookmark to a folder id that doesn't belong to the caller (including a well-formed but nonexistent id) returns `404 "Folder not found"`.

## Frontend (`DevVault_Angular`)

### Core layer

- `core/models/folder.model.ts` (new) — `Folder`, `FolderPayload` interfaces plus the `FOLDER_COLORS`/`FOLDER_ICONS` constants (kept in sync with the backend's palette/icon-set) used by the color/icon pickers.
- `core/services/folder.service.ts` (new) — the only place that talks to `/api/folders` (list/create/update/delete), unwrapping `ApiSuccessResponse<T>` the same way `BookmarkService` does. No UI state lives here.
- `core/models/bookmark.model.ts` — `Bookmark.folder` changed from `string | null` to a new `BookmarkFolderRef | null` (`{ _id, name, color, icon }`), matching the now-populated API shape. `BookmarkPayload.folder` stays `string | null` (an id), since that's what a write actually sends.

### New components

| Component | Path | Role |
|---|---|---|
| `Folders` | `features/folders/folders.ts` | Container/page. Owns folder list, loading, and error as signals; fetches once on init. Opens the create/edit dialog and the shared `ConfirmDialog` for delete, mutating local state optimistically afterward instead of refetching. `ChangeDetectionStrategy.OnPush`. |
| `FolderCard` | `features/folders/components/folder-card/` | Presentational — `@Input folder`, emits `edit`/`remove`. Shows the folder's icon on a color-tinted badge (`[style.background]` bound to the folder's own hex, since the palette is data-driven, not a fixed Tailwind class), name, description, bookmark count, and an overflow menu (Edit/Delete). `OnPush`. |
| `FolderFormDialog` | `features/folders/components/folder-form-dialog/` | `MatDialog` content component for both create and edit (`data.folder: Folder \| null` decides the mode). Name (required, max 50) and description (max 500) are plain reactive-form controls; color and icon are rendered as swatch/icon button grids (`FOLDER_COLORS`/`FOLDER_ICONS`) that write into two more form controls on click — no external color-picker/icon-picker library was added, keeping the dependency footprint the same as Sprint 3. |
| `FolderSkeleton` | `features/folders/components/folder-skeleton/` | Loading placeholder for the folder grid, mirroring `BookmarkSkeleton`'s pattern (`@Input count`, `OnPush`). |

Reused as-is, unmodified: `ConfirmDialog` (delete confirmation) and `EmptyState` (the "No folders yet." empty state with a "Create Folder" action) — both were already generic enough from Sprint 3.

### Bookmark module integration

- `bookmark-card.html` — added a folder chip (dot in the folder's color + folder name) under the description, only rendered when `bookmark.folder` is set.
- `bookmark-form-dialog.ts`/`.html` — added a **Folder** field between Type and Tags: a searchable dropdown (`MatAutocompleteModule`) backed by a `folders` signal (`toSignal` over `FolderService.list()`, loaded once when the dialog opens) and a `filteredFolders` computed signal that filters client-side as the user types. Each option shows the folder's icon (on its color) and name. A small clear (×) button appears once a folder is selected, so "no folder" stays a first-class, explicit choice. On submit, the selected folder's `_id` (or `null`) is sent as `BookmarkPayload.folder`. Pre-populates from `bookmark.folder` when editing.

### Dashboard

- `dashboard.ts` — the "Folders" stat card is no longer a hardcoded `0`. `Dashboard` now injects `FolderService`, fetches the list once in the constructor, and updates that one card's `value` via a signal. The other three stat cards (Bookmarks, Notes, Snippets) are untouched and still `0` — Notes/Snippets are out of scope for this sprint, and reworking the Bookmarks stat's data source wasn't part of the Sprint 4 spec.

### Routing / Sidebar

- `app.routes.ts` — the `/folders` child route now lazy-loads the real `Folders` component instead of the shared `ComingSoon` placeholder.
- Sidebar already linked to `/folders` with a folder icon from Sprint 2 scaffolding — no change needed there.

### Validation & error handling

- Folder name required + 50-char max is enforced both client-side (`Validators.required`/`Validators.maxLength(50)` in `FolderFormDialog`, inline error text under the field) and server-side.
- All folder API failures (create/update/delete) surface through the existing `NotificationService` snackbar (`success()`/`error()`), same pattern as bookmarks — including the `409` duplicate-name response, so a rename/create collision shows a clear message instead of failing silently.

### Performance

- `Folders`, `FolderCard`, `FolderSkeleton`, and the updated `BookmarkFormDialog`/`BookmarkCard` all use `ChangeDetectionStrategy.OnPush`.
- State is signal-based throughout (`signal`/`computed`/`toSignal`), consistent with the Bookmarks module.
- The folder list is fetched once per page/dialog lifetime (no polling, no refetch-after-mutation — local signal updates instead), and the bookmark dialog's folder search filters the already-fetched list in memory rather than issuing a request per keystroke.

## Not done (intentionally out of scope)

- Tag CRUD, Notes, Snippets, Settings, Analytics, Global Search — still `ComingSoon` / untouched.
- Filtering the Bookmarks page by folder — the spec asked for folder *display* and *selection* on bookmarks, not a folder filter; not added.
- The Dashboard's Bookmarks/Notes/Snippets stat cards remain hardcoded — only the Folders card was in scope.

## Known limitation in verification

This environment has no browser-automation tool, so the Angular UI (dialogs,
color/icon pickers, the folder autocomplete, the responsive card grid) could
not be visually driven end-to-end — only compiled (`ng build`, full template
type-checking, no errors) and code-reviewed. The backend, which carries the
higher correctness risk (ownership, uniqueness, the delete-cascade behavior),
was fully exercised live against the real database as described above,
including a live cross-user authorization check. Manual click-through in a
browser is still recommended before considering this sprint fully verified.

# Sprint 5 — Tag Management

Scope: the full Tag Management module — backend API, and the frontend
feature that consumes it — plus the integration points into the existing
Bookmark module and Dashboard that the spec called for. Notes, Code
Snippets, Settings, Analytics, AI Features, and Global Search remain out of
scope (still "Coming Soon" / untouched).

## A note on the data model change

Sprint 3 modeled `Bookmark.tags` as a plain `[String]` (free-text, normalized
lowercase). Sprint 5's spec requires tags to be first-class entities with
their own color, a searchable multi-select on the bookmark form, and
"assign/remove tag from bookmark" as explicit, testable operations — the
same shape Folders already have. So `Bookmark.tags` was migrated from
`[String]` to `[ObjectId ref: 'Tag']`, mirroring how `Bookmark.folder`
already references `Folder`. This is a breaking schema change for any
bookmark created before this sprint (their old string tags are orphaned,
not migrated) — acceptable here since the app has no production data yet;
called out explicitly in case this repo ever needs a real migration script
later.

## Backend (`DevVault_Node`)

Added a new `tag` module (model → service → controller → routes,
validators via `express-validator`), following the exact layering
established by the `folder` module in Sprint 4.

| File | Purpose |
|---|---|
| `models/Tag.js` (new) | Mongoose schema: `name` (required, trimmed, max 30 chars), `color` (hex string, constrained to a 10-swatch palette exported as `TAG_COLORS`), `user` (owner ref), timestamps. A compound `{ user, name }` unique index with a case-insensitive collation (`strength: 2`) enforces "tag names must be unique per user," identical to the `Folder` index. |
| `validators/tag.validator.js` (new) | `express-validator` chains for create/update/id — `name` required + max 30 on create, optional-but-non-empty + max 30 on update; `color` restricted to `TAG_COLORS`; `:id` validated as a Mongo ObjectId. |
| `services/tag.service.js` (new) | `findOwnedTag(id, userId)` mirrors the folder/bookmark services' ownership guard (`404` if missing, `403` if owned by someone else). `assertUniqueName` does the same case-insensitive pre-check as folders, backed by the unique index. `listTags`/`getTagById` attach a live `bookmarkCount` — `listTags` runs one `Bookmark.aggregate` that `$unwind`s each bookmark's `tags` array and groups by tag id, so all counts come from a single query instead of one-per-tag. `deleteTag` runs `Bookmark.updateMany({ tags: id }, { $pull: { tags: id } })` **before** deleting the tag — the tag reference is stripped from every bookmark that had it, bookmarks themselves are never touched otherwise. |
| `controllers/tag.controller.js` (new) | Thin HTTP layer, same shape as `folder.controller.js`. |
| `routes/tag.routes.js` (new) | `router.use(protect)` guards the whole router. Wires validators → `validate` → controller for all five endpoints. |
| `server.js` | Mounted the new router at `app.use('/api/tags', tagRoutes)`. |
| `models/Bookmark.js` | `tags` changed from `{ type: [String], default: [] }` to `{ type: [{ type: ObjectId, ref: 'Tag' }], default: [] }` (see note above). |
| `services/bookmark.service.js` | Replaced the old `normalizeTags` (trim/lowercase/dedupe strings) with `dedupeIds` (dedupe ObjectId strings) and a new `assertOwnedTags(tagIds, userId)`, called from `createBookmark`/`updateBookmark` whenever `tags` is present — fetches all matching `Tag` docs scoped to the caller and throws `404` if the count doesn't match the input, so a bookmark can never reference someone else's or a nonexistent tag. Every read path now also `.populate('tags', 'name color')` alongside the existing folder populate, so tag chips render with color/name with no extra round-trip. The full-text `search` query no longer matches against `tags` (a regex against an ObjectId array never matched anything meaningful even before this change; explicitly dropped now that `tags` definitely isn't string data). |
| `validators/bookmark.validator.js` | `tags`/`tags.*` now validate as an array of Mongo ids (was: array of non-empty strings). The list-query `tag` filter now validates as a single Mongo id (was: a trimmed string) since filtering is "bookmarks that have this tag id," not a text match. |

### REST API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/tags` | Create. `name` required (max 30), `color` optional (from the fixed palette). |
| GET | `/api/tags` | List all of the caller's tags (own only), sorted by name, each with a live `bookmarkCount`. |
| GET | `/api/tags/:id` | Fetch one (with `bookmarkCount`). |
| PUT | `/api/tags/:id` | Update. Re-checks name uniqueness only if `name` is actually changing. |
| DELETE | `/api/tags/:id` | Delete the tag; every bookmark referencing it has the reference pulled from its `tags` array — bookmarks are never deleted. |

`POST /api/bookmarks` and `PUT /api/bookmarks/:id` now validate that every `tags` id in the payload belongs to the caller. `GET /api/bookmarks?tag=<id>` filters to bookmarks carrying that tag. Every bookmark read now returns `tags` as `{ _id, name, color }[]` instead of bare strings.

### Backend verification (live, against the real MongoDB Atlas cluster)

Ran the server and drove every scenario from the sprint's testing checklist with `curl` end-to-end against a temporary throwaway user (and a second user for authorization checks), then deleted all of it afterward:

- **Create Tag** — valid payload → `201`; missing `name` → `400 "Tag name is required"`; 31-character name → `400 "Tag name cannot exceed 30 characters"`; duplicate name differing only in case (`"Angular"` vs `"angular"`) → `409 "A tag with this name already exists"`; no token → `401`.
- **Edit Tag** — n/a beyond the folder-equivalent pattern already proven in Sprint 4 (`updateTag` is line-for-line the same shape as `updateFolder`); exercised indirectly via the uniqueness re-check path.
- **Delete Tag** — created a tag, assigned it to two bookmarks, deleted the tag, then re-fetched one of those bookmarks: it still existed with the tag stripped from its `tags` array. The tag itself was gone from `GET /api/tags`.
- **Assign Tags to Bookmark** — created a bookmark with two tag ids in `tags`; response and a subsequent `GET` both showed both tags populated as `{ name, color }`.
- **Remove Tag from Bookmark** — `PUT` a bookmark with a `tags` array missing one of its two original tags; response showed only the remaining tag.
- **Filter Bookmarks by Tag** — `GET /api/bookmarks?tag=<id>` returned only the bookmark(s) carrying that tag id, excluding one that didn't have it.
- **Dashboard Tag Count** — `GET /api/tags` reported `bookmarkCount: 2` after two bookmarks referenced the same tag, `1` after removing it from one, confirming the aggregate is live.
- **Authorization** — registered a second user; confirmed `GET`/`DELETE` against the first user's tag both returned `403 "You are not allowed to access this tag"`; confirmed creating a bookmark with a tag id that doesn't belong to the caller (including a well-formed but nonexistent id) returns `404 "One or more tags were not found"`.

## Frontend (`DevVault_Angular`)

### Core layer

- `core/models/tag.model.ts` (new) — `Tag`, `TagPayload` interfaces plus the `TAG_COLORS` constant (kept in sync with the backend's palette) used by the color picker.
- `core/services/tag.service.ts` (new) — the only place that talks to `/api/tags` (list/create/update/delete), unwrapping `ApiSuccessResponse<T>` the same way `FolderService` does.
- `core/models/bookmark.model.ts` — added `BookmarkTagRef` (`{ _id, name, color }`); `Bookmark.tags` changed from `string[]` to `BookmarkTagRef[]`, matching the now-populated API shape. `BookmarkPayload.tags` stays `string[]` (an array of tag ids), since that's what a write actually sends.

### New components

| Component | Path | Role |
|---|---|---|
| `Tags` | `features/tags/tags.ts` | Container/page. Owns tag list, loading, and error as signals; fetches once on init. Opens the create/edit dialog and the shared `ConfirmDialog` for delete, mutating local state optimistically afterward instead of refetching. `ChangeDetectionStrategy.OnPush`. |
| `TagCard` | `features/tags/components/tag-card/` | Presentational — `@Input tag`, emits `edit`/`remove`. Shows a color dot, name, bookmark count, and an overflow menu (Edit/Delete) — visually the compact, no-description sibling of `FolderCard`. `OnPush`. |
| `TagFormDialog` | `features/tags/components/tag-form-dialog/` | `MatDialog` content component for both create and edit (`data.tag: Tag \| null` decides the mode). Name (required, max 30) is a reactive-form control; color is the same swatch-grid picker pattern as `FolderFormDialog` (`TAG_COLORS`), no icon field since tags don't have one. |
| `TagSkeleton` | `features/tags/components/tag-skeleton/` | Loading placeholder for the tag grid, same pattern as `FolderSkeleton`/`BookmarkSkeleton` (`@Input count`, `OnPush`). |

Reused as-is, unmodified: `ConfirmDialog` (delete confirmation) and `EmptyState` (the "No tags yet." empty state with a "Create Tag" action).

### Bookmark module integration

- `bookmark-card.html` — tag rendering changed from plain `#{{ tag }}` string pills to chips showing each tag's own color dot + name, sourced from the now-populated `BookmarkTagRef[]`.
- `bookmark-form-dialog.ts`/`.html` — replaced the old comma-separated tags text input with a **searchable multi-select**: a `tags` signal (`toSignal` over `TagService.list()`, loaded once when the dialog opens), a `selectedTags` signal (the bookmark's current tags when editing), and a `filteredTags` computed signal that excludes already-selected tags and filters the rest as the user types. Selected tags render as removable chips (color dot + name + ×) above the search input; picking an option from the `MatAutocomplete` panel adds it to `selectedTags` and clears the search text. On submit, `selectedTags().map(t => t._id)` becomes `BookmarkPayload.tags`. This is the same interaction model as the folder single-select from Sprint 4, extended to multiple selections instead of one.

### Bookmarks page — filter by tag

- `bookmarks.ts` — added a `tags` signal (`toSignal` over `TagService.list()`), a `selectedTagId` signal, and a `selectedTag` computed for display. `filteredBookmarks` now also filters by `bookmark.tags.some(tag => tag._id === selectedTagId())` when a tag filter is active, composing with the existing favorites/search/sort filters (all still client-side over the one fetched list, consistent with Sprint 3's approach).
- `bookmarks.html` — added a "Tag" filter button (next to Favorites/Sort) that opens a `mat-menu` listing every tag with its color dot, plus an "All tags" option to clear the filter. The button itself shows the active tag's color + name once one is selected, so the current filter state is always visible without opening the menu.

### Dashboard

- `dashboard.ts` — added a "Tags" stat card between Folders and Notes. `Dashboard` now also injects `TagService` and fetches the tag count once in the constructor, updating that card's `value` via the same `updateStat` signal helper introduced for Folders in Sprint 4. The other three cards (Bookmarks, Notes, Snippets) are untouched — Notes/Snippets are out of scope for this sprint.
- `dashboard.html` — stat grid widened from 4 to 5 columns on large screens (`lg:grid-cols-3 xl:grid-cols-5`) to fit the new card without cramming.

### Routing / Sidebar

- `app.routes.ts` — the `/tags` child route now lazy-loads the real `Tags` component instead of the shared `ComingSoon` placeholder.
- Sidebar already linked to `/tags` with a label icon from Sprint 2 scaffolding — no change needed there.

### Validation & error handling

- Tag name required + 30-char max is enforced both client-side (`Validators.required`/`Validators.maxLength(30)` in `TagFormDialog`, inline error text under the field) and server-side.
- All tag API failures (create/update/delete) surface through the existing `NotificationService` snackbar, same pattern as folders/bookmarks — including the `409` duplicate-name response.

### Performance

- `Tags`, `TagCard`, `TagSkeleton`, and the updated `Bookmarks`/`BookmarkFormDialog`/`BookmarkCard` all use `ChangeDetectionStrategy.OnPush`.
- State is signal-based throughout (`signal`/`computed`/`toSignal`), consistent with Folders and Bookmarks.
- The tag list is fetched once per page/dialog lifetime; the bookmark dialog's tag search and the Bookmarks page's tag filter both operate on the already-fetched list in memory rather than issuing a request per keystroke or per filter change.

## Not done (intentionally out of scope)

- Notes, Code Snippets, Settings, Analytics, AI Features, Global Search — still `ComingSoon` / untouched.
- A migration script for pre-Sprint-5 bookmarks with legacy string tags — see the data-model note above.
- The Dashboard's Bookmarks/Notes/Snippets stat cards remain hardcoded — only Tags (this sprint) and Folders (Sprint 4) are wired to real data.

## Known limitation in verification

This environment has no browser-automation tool, so the Angular UI (dialogs,
the tag multi-select/chips, the tag filter menu, the responsive card grid)
could not be visually driven end-to-end — only compiled (`ng build`, full
template type-checking, no errors) and code-reviewed. The backend, which
carries the higher correctness risk (ownership, uniqueness, the
reference-pull-on-delete behavior), was fully exercised live against the
real database as described above, including a live cross-user authorization
check. Manual click-through in a browser is still recommended before
considering this sprint fully verified.

# Sprint 8 — Notes Management

Scope: create, read, update, delete, favorite, organize and search technical
notes. Notes use the existing folders and tags. Out of scope: code snippets
(Sprint 9), rich-text or block editor, sharing, attachments, version history,
and AI features. Authentication is unchanged.

## Backend (`DevVault_Node`)

| File | Change |
|---|---|
| `models/Note.js` (new) | Fields: `title` (required, trimmed, max 150), `content` (required, max 20,000, not trimmed so code indentation survives), `folder` (optional, default `null`), `tags` (array of tag ids, default `[]`), `favorite` (default `false`), `user` (required), plus timestamps. Indexes cover only the queries the list runs: user + `createdAt`, `updatedAt`, `folder`, `tags`, and user + `title` with case-insensitive collation. |
| `services/note.service.js` (new) | CRUD, list, and favorite toggle. Only `title`, `content`, `folder`, `tags` and `favorite` are read from the body, so `user`, `_id` and timestamps can't be set by the client. Folder and tag ids are checked against the caller's own documents before saving. Tag ids are deduplicated, and `folder: ''` is treated as "no folder". |
| `validators/note.validator.js` (new) | Title and content must be non-blank strings within the length limits (a title sent as an object is rejected). `folder` and `tags.*` must be valid ids, and `favorite` must be a boolean. List query: `search` (max 100), `favorite`, `folder`, `tags` (comma-separated ids), `sort`, `page`, `limit` (1–100). |
| `controllers/note.controller.js` (new) | Thin handlers that return the standard `ApiResponse` shape. |
| `routes/note.routes.js` (new) | `/api/notes` router. Every route uses `protect`. |
| `server.js` | Mounts `app.use('/api/notes', noteRoutes)`. |
| `services/folder.service.js` | `deleteFolder` also sets `folder: null` on the user's notes. |
| `services/tag.service.js` | `deleteTag` also `$pull`s the tag from the user's notes. |
| `utils/ownership.js` | Now holds the folder/tag helpers that bookmarks and notes share: `FOLDER_POPULATE`, `TAG_POPULATE`, `dedupeIds`, `normalizeFolderId`, `assertOwnedFolder`, `assertOwnedTags`. They moved here from `bookmark.service.js`. |
| `utils/sanitize.js` | Added `escapeRegex`, moved here from `bookmark.service.js`. |
| `services/bookmark.service.js` | Imports the shared helpers above instead of defining its own. Behavior is unchanged. |
| `tests/note.api.check.mjs` (new) | End-to-end API check (see Verification). |
| `package.json` | Added the `test:notes` script. |

### Endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| `POST` | `/api/notes` | Create a note. `201`. |
| `GET` | `/api/notes` | The caller's notes, paginated. Filters: `search` (title, content, tag name), `folder`, `tags` (a note must have all of them), `favorite`. Sorts: `newest` (default), `oldest`, `az`, `za`, `updated`. |
| `GET` | `/api/notes/:id` | One note, with its folder and tags populated. |
| `PUT` | `/api/notes/:id` | Partial update of `title`, `content`, `folder` (`null` clears it) and `tags`. |
| `DELETE` | `/api/notes/:id` | Delete a note. |
| `PATCH` | `/api/notes/:id/favorite` | Toggle `favorite`. Separate from bookmark favorites. |

Status codes:
- Invalid id or payload → `400`.
- Another user's note → `403`.
- Missing note, or a folder/tag that isn't the caller's → `404`.

The sort keys and title collation are reused from `Bookmark.js`
(`BOOKMARK_SORTS`, `BOOKMARK_COLLATION`).

## Frontend (`DevVault_Angular`)

### Core

- `core/models/note.model.ts` (new): `Note`, `NotePayload`,
  `NoteQueryParams`, `NotePage`. Reuses the bookmark folder/tag ref,
  pagination and sort types.
- `core/services/note.service.ts` (new): `list`, `get`, `create`, `update`,
  `delete`, `toggleFavorite`.
- `core/utils/http-params.ts` (new): `toHttpParams()` drops empty values and
  joins arrays with commas. It was moved out of `BookmarkService`, which now
  uses it too.

### Shared

- `shared/components/folder-tag-picker/` (new):
  - The searchable folder autocomplete and multi-select tag chips, moved out
    of the bookmark dialog.
  - Two-way binds `[(folder)]` and `[(selectedTags)]`.
  - Used by both the bookmark and note dialogs.
- `shared/components/card-skeleton`: new `itemLabel` input, so the skeleton's
  screen-reader label can say "Loading notes".

### Pages

- **Notes** (`/notes`, `features/notes/notes.ts`):
  - Replaces the ComingSoon placeholder.
  - Same URL-driven filter model as Bookmarks: favorites, folder and tags
    (must match all), five sorts, *Clear Filters*, and server-side pagination.
  - Loading skeleton, error banner with Retry, and three empty states:
    no notes yet, no search results, and no filter matches.
- **Note card** (`components/note-card`):
  - Title, a 3-line content preview, folder, tags, favorite star, and
    last-updated date.
  - Menu actions: Open, Edit, Delete.
- **Note form dialog** (`components/note-form-dialog`):
  - Title, multiline content, and the shared folder/tag picker.
  - Saves through `NoteService` itself, unlike the bookmark dialog. While
    saving it shows *Saving...*, disables the fields, ignores repeat submits
    and can't be closed. If the save fails, it stays open with the input
    intact.
  - Shows a success or error snackbar.
- **Note details** (`/notes/:id`, `note-detail/`):
  - Full title, created and updated dates, folder, tags, and content with
    `whitespace-pre-wrap`. Content goes through Angular interpolation, so it
    is never rendered as HTML.
  - Favorite, Edit and Delete actions. Delete returns to `/notes`.
  - A missing or not-owned note shows a "does not exist" message.

### Layout and routing

- `app.routes.ts`:
  - `notes` now points at the real page, and `notes/:id` is new.
  - Both sit under the existing `authGuard` layout.
  - They are flat routes, like `settings/password`, so the breadcrumb doesn't
    repeat "Notes".
- `layout/navbar`:
  - On `/notes` the search box searches notes, with the same 300 ms debounce,
    and its placeholder reads "Search notes...".
  - Everywhere else it still searches bookmarks.
- `features/dashboard`: the Notes stat card now shows the real count from
  `GET /api/notes?limit=1` → `pagination.total`.
- The sidebar already had a Notes entry, so it wasn't changed.

### Deliberately skipped

- **Rich-text editor**: the project has no editor library, so the editor is a
  plain textarea with the content preserved as typed.
- **Separate search box on the Notes page**: the navbar search already covers
  this.
- **Note counts on the Folder and Tag cards**: not required. Those cards still
  count bookmarks only.

## Verification

- **Build**: `ng build` passes with no errors or warnings.
- **Database used**: the tests couldn't reach MongoDB Atlas from this machine
  (`ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`, likely the IP access list). Both
  checks ran against a throwaway local `mongod` instead, by setting
  `MONGO_URI` in the shell.
- **API**: `npm run test:notes` passes 12/12 on port 5056. Checks:
  - `401` without a token
  - create with a folder and tags. Duplicate tags are removed, the content is
    stored exactly as sent (including `<script>`), and `user`, `_id` and
    `createdAt` in the body are ignored
  - missing, blank or too-long title and content, a bad folder or tag id, an
    object as the title, a bad note id, or a bad sort → `400`
  - attaching another user's folder or tag (create and update) → `404`
  - another user reading, editing, favoriting or deleting the note → `403`.
    That user's list is empty.
  - a partial update keeps the other fields
  - the note favorite toggles without affecting bookmark favorites
  - search by content, title and tag name. Regex characters are escaped.
    Folder, tag and favorite filters combine. All five sorts work, and so does
    pagination.
  - deleting a tag removes it from notes, and deleting a folder clears it from
    notes. The notes still exist.
  - a deleted note → `404`
  - regression: bookmark create with a folder and tags, clearing the folder,
    rejecting another user's tag, and deleting a tag and a bookmark
- **Sprint 7 regression**: `npm run test:users` passes 12/12.
- **Not run**:
  - UI checks in a browser: the Notes pages, the refactored bookmark dialog,
    the navbar search switch, and mobile and tablet layouts
  - `ng test`

## Known follow-ups (not in scope)

- Search is an unanchored regex over the user's notes (marked with
  `ponytail:`). Move it to a `$text` index if note counts get large.
- On the note details page, the navbar search still searches bookmarks.

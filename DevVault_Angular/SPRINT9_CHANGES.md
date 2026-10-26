# Sprint 9 — Code Snippets Management

Scope: create, read, update, delete, favorite, copy, organize and search
reusable code snippets. Snippets use the existing folders and tags. Out of
scope: AI features, code execution, collaborative editing, public sharing,
GitHub/GitLab sync, and version history. Authentication is unchanged.

The module follows the Sprint 8 Notes module file for file. The new parts are
the `language` and `description` fields, a language filter, and highlight.js
for read-only code views.

## Backend (`DevVault_Node`)

| File | Change |
|---|---|
| `models/Snippet.js` (new) | Fields: `title` (required, trimmed, max 150), `description` (optional, trimmed, max 500, default `''`), `code` (required, max 50,000, never trimmed so indentation, tabs and trailing newlines survive), `language` (required, enum of `SNIPPET_LANGUAGES`, default `plaintext`), `folder` (optional, default `null`), `tags` (array of tag ids, default `[]`), `favorite` (default `false`), `user` (required), plus timestamps. Same indexes as notes: user + `createdAt`, `updatedAt`, `folder`, `tags`, and user + `title` with case-insensitive collation. |
| `services/snippet.service.js` (new) | CRUD, list, and favorite toggle. Only `title`, `description`, `code`, `language`, `folder`, `tags` and `favorite` are read from the body, so `user`, `_id` and timestamps can't be set by the client. Folder and tag ids are checked against the caller's own documents through the shared `utils/ownership.js` helpers. `description: null` becomes `''`. |
| `validators/snippet.validator.js` (new) | Title and code must be non-blank strings within the length limits. `language` must be in the supported list. `description` must be a string of 500 characters or fewer. `folder` and `tags.*` must be valid ids, and `favorite` must be a boolean. List query: `search` (max 100), `language`, `favorite`, `folder`, `tags` (comma-separated ids), `sort`, `page`, `limit` (1–100). |
| `controllers/snippet.controller.js` (new) | Thin handlers that return the standard `ApiResponse` shape. |
| `routes/snippet.routes.js` (new) | `/api/snippets` router. Every route uses `protect`. |
| `server.js` | Mounts `app.use('/api/snippets', snippetRoutes)`. |
| `services/folder.service.js` | `deleteFolder` also sets `folder: null` on the user's snippets. |
| `services/tag.service.js` | `deleteTag` also `$pull`s the tag from the user's snippets. |
| `tests/snippet.api.check.mjs` (new) | End-to-end API check (see Verification). |
| `package.json` | Added the `test:snippets` script. |

### Endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| `POST` | `/api/snippets` | Create a snippet. `201`. |
| `GET` | `/api/snippets` | The caller's snippets, paginated. Filters: `search` (title, description, code, language, tag name), `language`, `folder`, `tags` (a snippet must have all of them), `favorite`. Sorts: `newest` (default), `oldest`, `az`, `za`, `updated`. |
| `GET` | `/api/snippets/:id` | One snippet, with its folder and tags populated. |
| `PUT` | `/api/snippets/:id` | Partial update of `title`, `description`, `code`, `language`, `folder` (`null` or `''` clears it) and `tags`. |
| `DELETE` | `/api/snippets/:id` | Delete a snippet. |
| `PATCH` | `/api/snippets/:id/favorite` | Toggle `favorite`. |

Status codes:
- Invalid id, payload or language → `400`.
- Another user's snippet → `403`.
- Missing snippet, or a folder/tag that isn't the caller's → `404`.

### Supported languages

`plaintext`, `javascript`, `typescript`, `html`, `css`, `scss`, `json`,
`python`, `java`, `csharp`, `cpp`, `c`, `go`, `rust`, `php`, `ruby`, `kotlin`,
`swift`, `sql`, `bash`, `powershell`, `yaml`, `xml`, `markdown`, `dockerfile`.

To add a language, update `SNIPPET_LANGUAGES` in both `models/Snippet.js` and
`core/models/snippet.model.ts`, then register its grammar in
`shared/components/code-block/code-block.ts`.

## Frontend (`DevVault_Angular`)

### Dependency

- `highlight.js@^11.11.1` (new):
  - Uses the core build with only the 24 offered languages registered.
  - Loaded only in the lazy snippets chunks, so the initial bundle is
    unchanged.
  - Theme: `github-dark.min.css`, added to `angular.json` styles.
- No code-editor library. The editor is a styled monospace textarea.

### Core

- `core/models/snippet.model.ts` (new): `Snippet`, `SnippetPayload`,
  `SnippetQueryParams`, `SnippetPage`, `SNIPPET_LANGUAGES` (value + label), and
  `languageLabel()`, which falls back to the raw value.
- `core/services/snippet.service.ts` (new): `list`, `get`, `create`, `update`,
  `delete`, `toggleFavorite`.

### Shared

- `shared/components/code-block/` (new):
  - Read-only code view with a language badge and a Copy button.
  - Highlights with highlight.js when the language is registered (`html` is an
    alias for `xml`). Otherwise it falls back to plain `{{ }}` interpolation,
    so an unknown language never crashes the view.
  - highlight.js escapes every text node, so HTML or `<script>` in a snippet
    renders as text.
  - The `maxLines` input previews only the first N lines, but Copy always
    copies the full code.
  - Copy uses `navigator.clipboard.writeText` and shows a success or error
    snackbar.
  - Long lines scroll horizontally.
- `shared/components/coming-soon/`: deleted, because Snippets was its last
  user.

### Pages

- **Snippets** (`/snippets`, `features/snippets/snippets.ts`):
  - Replaces the ComingSoon placeholder.
  - Same URL-driven filter model as Notes, plus a **language** filter menu.
  - Loading skeleton, error banner with Retry, and three empty states.
- **Snippet card** (`components/snippet-card`):
  - Title, 2-line description preview, an 8-line highlighted code preview with
    a language badge and Copy, folder, tags, favorite star, and last-updated
    date.
  - Menu actions: Open, Edit, Delete.
  - `min-w-0` keeps long code lines scrolling inside the card instead of
    stretching the grid.
- **Snippet form dialog** (`components/snippet-form-dialog`):
  - Title, language dropdown, optional description, and a code textarea.
    The textarea uses `wrap="off"` with horizontal scrolling, and
    spellcheck/autocapitalize are off.
  - Uses the shared folder/tag picker.
  - Code is sent verbatim. Other fields are trimmed.
  - Same save behavior as the note dialog: *Saving...*, no duplicate submits,
    and it stays open on error.
- **Snippet details** (`/snippets/:id`, `snippet-detail/`):
  - Title, description, created and updated dates, folder, tags, and the full
    highlighted code.
  - Copy, Favorite, Edit and Delete actions.
  - A missing or not-owned snippet shows a "does not exist" message.

### Layout and routing

- `app.routes.ts`: `snippets` now points at the real page, and
  `snippets/:id` is new. Both sit under the existing `authGuard` layout.
- `layout/navbar`:
  - The single `/notes` check became `SCOPED_SEARCH_PAGES = ['/notes', '/snippets']`.
  - On those pages the search box searches that resource, and the placeholder
    and aria-label follow ("Search snippets...").
  - Everywhere else it still searches bookmarks.
- `features/dashboard`: the Snippets stat card now shows the real count from
  `GET /api/snippets?limit=1` → `pagination.total`.
- The sidebar already had a Snippets entry, so it wasn't changed.

### Deliberately skipped

- **Full code editor** (CodeMirror/Monaco): a textarea covers editing, and
  highlighting is only needed in read-only views.
- **Tab key inserting a tab character**: Tab keeps moving focus, for keyboard
  accessibility.
- **Snippet counts on the Folder and Tag cards**: not required.

## Verification

- **Build**: `ng build` passes with no errors or warnings.
- **Unit tests**: `ng test --watch=false` passes 8/8. The new
  `code-block.spec.ts` checks:
  - HTML and `<script>` stay inert text for `html`, `javascript`, `plaintext`
    and an unknown language
  - supported languages are highlighted, and whitespace is preserved exactly
  - `maxLines` truncates the preview
- **API**: `npm run test:snippets` passes 12/12 on port 5057. Checks:
  - all six routes return `401` without a token
  - create keeps code byte-for-byte (tabs, indentation, trailing newlines,
    `<script>`). Duplicate tags are removed, and `user`, `_id` and `createdAt`
    in the body are ignored.
  - description, folder and tags are optional
  - 11 invalid create payloads → `400`: missing title, blank code, missing
    language, unknown language, too-long title, description or code, bad
    folder or tag id, object title, array code. Also a bad update language,
    bad id, bad sort and bad language filter.
  - attaching another user's folder or tag (create and update) → `404`
  - another user reading, editing, favoriting or deleting the snippet → `403`.
    That user's list is empty.
  - a partial update keeps the other fields. `description: null` and
    `folder: ''` clear those fields.
  - favorite toggles
  - search by code, description, title, language and tag name. Regex
    characters are escaped. Language, folder, tag and favorite filters combine
    with search. All five sorts work, and so does pagination.
  - deleting a tag removes it from snippets and notes, and deleting a folder
    clears it from snippets. The snippets still exist.
  - a deleted snippet → `404`
- **Regressions**: `npm run test:notes` passes 12/12, including bookmark,
  folder and tag CRUD. `npm run test:users` passes 12/12, including register
  and login.
- **Not run**:
  - UI checks in a browser: the Snippets pages, copy-to-clipboard, the navbar
    search switch, mobile and tablet layouts, and earlier pages

## Known follow-ups (not in scope)

- Search is an unanchored regex over the user's snippets, including code
  (marked with `ponytail:`). Move it to a `$text` index if snippet counts get
  large.
- Copy needs a secure context (HTTPS or `localhost`). Anywhere else it shows
  the error snackbar.
- On the snippet details page, the navbar search still searches bookmarks.

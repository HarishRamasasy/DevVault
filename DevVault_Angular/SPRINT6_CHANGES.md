# Sprint 6 — Global Search & Advanced Filters

Scope: global bookmark search from the navbar, plus folder / tag / favorite /
type filters, sorting, and server-side pagination on the Bookmarks page. All
state lives in the URL. No new resource types — Notes, Snippets, and AI
features remain out of scope, and the auth flow is untouched.

## Backend (`DevVault_Node`)

| File | Change |
|---|---|
| `models/Bookmark.js` | Added `BOOKMARK_SORTS` (the sort key → Mongo sort map) and `BOOKMARK_COLLATION` (`{ locale: 'en' }`). Added two indexes that back the new sorts (see below). |
| `services/bookmark.service.js` | Rewrote `listBookmarks`: new `folder` and `tags` filters, search extended to tag names, regex input escaped, pagination always on, and `countDocuments` + `find` run in parallel. |
| `validators/bookmark.validator.js` | `listBookmarksValidator` now validates `folder`, `tags`, and `sort`, and caps `search` at 100 chars (a single string value only). Removed `tag`, `sortBy`, and `sortOrder`. |

### `GET /api/bookmarks` — query parameters

| Param | Values | Behavior |
|---|---|---|
| `search` | string (max 100) | Case-insensitive match on title, URL, description, **or tag name**. Regex metacharacters are escaped, so they're literal (`?search=(` no longer returns 500). |
| `folder` | folder id | Bookmarks in that folder. |
| `tags` | comma-separated tag ids | **AND semantics** — the bookmark must carry *every* listed tag (`$all`). |
| `favorite` | `true` / `false` | Favorites / not favorites. Omit for all. |
| `type` | an existing `BOOKMARK_TYPES` value | Exact type match. |
| `sort` | `newest` (default), `oldest`, `az`, `za`, `updated` | A–Z/Z–A sorting ignores case. |
| `page` | int ≥ 1, default `1` | |
| `limit` | 1–100, default `12` | |

Response `data`: `{ bookmarks, count, pagination: { page, limit, total, totalPages } }`.

Every query is scoped to `req.user.id`. Tag-name search only looks at the
caller's own tags, so another user's tag names can never match. Invalid ids,
sorts, types, pages, and limits return `400 Validation failed`.

**Breaking:** `tag`, `sortBy`, and `sortOrder` were removed, and results are
now always paginated (previously the full list came back when no
`page`/`limit` was sent). The Angular app was the only consumer and has been
updated.

### Indexes

| Index | Serves |
|---|---|
| `{ user: 1, updatedAt: -1 }` (new) | `sort=updated` |
| `{ user: 1, title: 1, _id: 1 }`, collation `en` (new) | `sort=az` / `sort=za` |
| `{ user: 1, createdAt: -1 }` (existing) | `sort=newest` / `sort=oldest` |

Verified with `explain()`: all five sorts are served by an index, with no
in-memory `SORT` stage. Two things make that work:

- The collation is applied **only** to title sorts. A query-level collation
  stops the default-collation date indexes from serving a sort.
- Only title sorts tie-break on `_id` (titles repeat; ms timestamps
  effectively don't), which keeps page boundaries stable.

Text search uses an unanchored regex, which can't use an index. It scans only
the user's bookmarks — fine at current volumes, and marked with a `ponytail:`
comment pointing to `$text`/Atlas Search if that changes.

## Frontend (`DevVault_Angular`)

### Core

- `core/models/bookmark.model.ts` — `BookmarkQueryParams` now includes
  `folder`, `tags: string[]`, `sort`, `page`, and `limit`. Added
  `BookmarkSort`, `BookmarkPagination`, `BookmarkPage`, and the
  `BOOKMARK_SORTS` label list.
- `core/services/bookmark.service.ts` — `list()` returns `BookmarkPage`
  (`{ bookmarks, pagination }`) instead of `Bookmark[]`, and joins array
  params with commas. It's still the only place that calls the bookmarks API.

### Global search (navbar)

- `layout/navbar/navbar.ts`/`.html` — wired up the existing search input
  (placeholder is now "Search bookmarks..."). Input is debounced 300 ms, then
  navigates to `/bookmarks?search=…` from any page. It uses `replaceUrl` when
  already on Bookmarks, so typing doesn't flood browser history.
- The box re-syncs from the URL on navigation (Clear Filters, back/forward)
  but **never while it has focus**, so a late navigation can't overwrite what
  the user is typing.

### Bookmarks page

- **The URL is the single source of truth.** `bookmarks.ts` derives its query
  from `ActivatedRoute.queryParamMap` (`toQuery`), exposes it as a `query`
  signal for the template, and fetches with
  `combineLatest([query$, refresh$]) → switchMap(list)` — one flat stream, no
  nested subscriptions, and stale requests are cancelled. Filter handlers
  only update the URL, so refreshing or sharing a link restores the exact
  view. Any filter change resets to page 1.
- **Filters** (menus beside each other, reusing the existing button look):
  - Favorites: All / Favorites / Not favorites
  - Folder: All folders + the user's folders
  - Tags: multi-select with checkboxes. The menu stays open between toggles,
    a note at the top says "Shows bookmarks with all selected tags", and the
    button reads "Tags (n)".
  - Type: All types + the existing bookmark types
  - Sort: Newest, Oldest, A–Z, Z–A, Recently updated
- **Clear Filters** resets search, folder, tags, favorite, type, sort, and
  page (and the navbar box) by navigating to bare `/bookmarks`.
- **Results line**: "N bookmarks found", plus "Results for: <term>" while
  searching.
- **Pagination**: Previous / "Page X of Y" / Next, shown when there's more
  than one page. Deleting the last item on a page, or opening a stale link
  past the end, moves back to the last valid page.
- **Empty states** (each with an action):
  - no bookmarks at all: "No bookmarks yet." (Add Bookmark)
  - search with no results: "No bookmarks found." (Clear Filters)
  - filters with no results: "No bookmarks match your filters." (Clear
    Filters)
- **Loading**: skeleton on first load, or when nothing is on screen. On later
  loads the current grid dims (`opacity-60`, `aria-busy`) instead of swapping
  to a skeleton, which avoids flicker.
- **Errors**: API failures (network, invalid filter or id in the URL) show a
  snackbar plus an inline banner with **Retry**, and clear stale results.
- **Mutations**: create, edit, and delete now refetch the current page, since
  with server-side filters and pagination the item may no longer belong on
  it. Favorite toggling still updates the card in place.
- The page's own search input was removed; the navbar search replaces it.
  Client-side filtering and sorting were removed in favor of the server.

### Responsive

- Desktop and tablet: filters sit inline and wrap as needed.
- Mobile (`< sm`): filters collapse behind a full-width **Filters** button
  (highlighted when any filter is active) that toggles the panel. The navbar
  search stays visible.

### Styles

- `styles.css` — added `.filter-btn` / `.filter-btn-active` inside
  `@layer components`. The layer matters: unlayered custom classes beat
  Tailwind's layered utilities, which stopped `sm:hidden` from hiding the
  mobile Filters button on desktop.

### Dashboard

- `dashboard.ts` — the Bookmarks count now comes from
  `list({ limit: 1 }).pagination.total` instead of downloading every bookmark
  and taking `.length`. `loadStat` now takes an `Observable<number>`.

## Verification

Run against a throwaway local MongoDB database, which was dropped afterwards.
The Atlas URI in `environment.env` currently fails DNS resolution, so it
couldn't be used.

- **Build**: `ng build` passes with strict templates.
- **API (16 checks)**: default and page-2 pagination with metadata; search by
  title, URL, description, and tag name (case-insensitive); regex
  metacharacters are literal; folder filter; multi-tag AND; favorite
  true/false; type; combined filters; all five sorts; 400s for invalid
  folder/tags/sort/type/page/limit/favorite/repeated search; 401 without a
  token; user isolation (no cross-user results by search, tag id, tag name,
  or folder id).
- **Regression (API)**: register/login/`me`; folder, tag, and bookmark CRUD;
  favorite toggle; folder unassignment; deleting a tag removes it from its
  bookmarks without deleting them.
- **UI (headless Chrome, 15 checks)**: dashboard counts; navbar search from
  the dashboard; tag-name search; pagination; URL state restored on reload;
  folder and type menus; combined-filter empty state; Clear Filters; multi-tag
  menu; search empty state and navbar box reset; invalid-id error banner and
  snackbar; desktop and mobile layouts (no horizontal scroll); Folders, Tags,
  and Dashboard pages still render; no console errors.

## Known follow-ups (not in scope)

- `PUT` on bookmarks, folders, and tags still accepts a `user` field, which
  lets an owner reassign their own resource to another user (from the
  Sprint 5 audit).
- `TagService`/`FolderService` list caches aren't invalidated when bookmarks
  change, so `bookmarkCount` on the Tags and Folders pages can be stale until
  reload.
- The `folder` filter takes an id, not a folder name.

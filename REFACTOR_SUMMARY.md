# DevVault — Refactor Summary

Companion document to [`CODE_REVIEW_REPORT.md`](./CODE_REVIEW_REPORT.md). That
report captured every finding from the Phase 1–7 audit; this document records
what was actually applied. Scope approved: **Bucket A** (zero behavior-risk
cleanup/DRY extraction) + **Bucket B** (bug fixes toward already-intended
behavior). Bucket C (new dependencies: `helmet`, `express-rate-limit`, global
401 handling, fail-fast env validation) was **not** applied — it remains a
scoped, ready-to-approve follow-up in the review report.

No API contracts, routes, or UI behavior changed. Every fix was verified
either by `ng build` / `node --check`, or live against the real MongoDB Atlas
cluster with a throwaway user (cleaned up afterward), or both.

## Files modified

**Backend (`DevVault_Node`)** — 9 modified, 5 new:

| File | Change |
|---|---|
| `models/Bookmark.js` | Added `{user,folder}` / `{user,tags}` compound indexes. |
| `models/Folder.js` | `FOLDER_COLORS` now sources from the shared palette. |
| `services/folder.service.js` | Uses `findOwnedDocument`/`assertUniqueName`; strips empty-string `color`/`icon` before persisting. |
| `services/bookmark.service.js` | Uses `findOwnedDocument`; normalizes `folder: ''` → `null` before persisting/validating ownership. |
| `services/tag.service.js` *(untracked — Sprint 5 file, edited in place)* | Uses `findOwnedDocument`/`assertUniqueName`; strips empty-string `color`. |
| `validators/bookmark.validator.js` | Uses shared `descriptionValidator`. |
| `validators/folder.validator.js` | Uses shared `descriptionValidator`. |
| `middleware/error.middleware.js` | 500s always logged server-side; generic message forced in production. |
| `config/db.js` | DNS override scoped to `win32` only. |
| `utils/ownership.js` *(new)* | `findOwnedDocument(Model, id, userId, label, populate?)` — shared 404/403 ownership guard. |
| `utils/uniqueName.js` *(new)* | `assertUniqueName(Model, userId, name, label, excludeId?)` — shared case-insensitive uniqueness check. |
| `utils/colorPalette.js` *(new)* | `RESOURCE_COLORS` — single source for the Folder/Tag color palette. |
| `utils/sanitize.js` *(new)* | `stripEmptyStrings(payload, fields)` — drops empty-string keys so schema defaults apply. |
| `validators/shared.validator.js` *(new)* | Shared `descriptionValidator`. |

**Frontend (`DevVault_Angular`)** — 24 modified, 4 new, 22 deleted:

| File | Change |
|---|---|
| `src/styles.css` | Added consolidated `:host`-equivalent display rules, `.form-input`/`.btn-primary`/`.btn-secondary`. |
| `src/app/app.ts` | Added `standalone: true`, `OnPush`; dropped `styleUrl`. |
| `src/app/features/auth/login/login.ts`, `register/register.ts` | Added `OnPush`; dropped `styleUrl`. |
| `src/app/layout/layout.ts`, `navbar/navbar.ts`, `sidebar/sidebar.ts`, `breadcrumb/breadcrumb.ts` | Added `OnPush`; dropped `styleUrl`. |
| `src/app/layout/navbar/navbar.html` | Added `aria-label` to the search input. |
| `src/app/shared/components/coming-soon/coming-soon.ts` | Added `OnPush`; dropped `styleUrl`. |
| `src/app/shared/components/confirm-dialog/*`, `empty-state/*` | Dropped `styleUrl`; buttons now use `.btn-primary`/`.btn-secondary`. |
| `src/app/features/dashboard/dashboard.ts` | Now fetches the real Bookmarks count (previously stuck at 0); errors routed through `NotificationService` instead of swallowed; `takeUntilDestroyed` added; dropped `styleUrl`. |
| `src/app/features/dashboard/dashboard.html` | Stat grid widened to fit the Tags card added in Sprint 5. |
| `src/app/features/bookmarks/bookmarks.ts` / `.html` | Uses shared `CardSkeleton`; `aria-label` on search input; dropped `styleUrl`. |
| `src/app/features/bookmarks/components/bookmark-card/*` | Tag/folder chips; dropped `styleUrl`. |
| `src/app/features/bookmarks/components/bookmark-form-dialog/*` | Inputs/buttons use shared classes; dropped `styleUrl` and the dead `.bottom_btn` rule. |
| `src/app/features/folders/folders.ts` / `.html`, `components/folder-card/*`, `components/folder-form-dialog/*` | Uses shared `CardSkeleton`/`ColorPicker`; shared input/button classes; dropped `styleUrl`. |
| `src/app/core/services/folder.service.ts` | Added `shareReplay` cache on `list()`, invalidated on create/update/delete. |
| `src/app/core/models/bookmark.model.ts` | *(from Sprint 5, untouched further this pass)* |
| `src/app/shared/components/card-skeleton/` *(new)* | Replaces `bookmark-skeleton`, `folder-skeleton`, `tag-skeleton`. |
| `src/app/shared/components/color-picker/` *(new)* | Replaces the duplicated swatch-picker markup in the folder/tag dialogs. |
| 22 component `.css` files | **Deleted** — see below. |

Not touched in this pass (already correct, or Sprint 5 files edited in place without further review-driven changes): `tags.ts`/`.html`, `tag-card`, `tag-form-dialog` — these picked up the shared `CardSkeleton`/`ColorPicker`/class extractions as part of the same edits described above for their Folder counterparts, applied identically.

## Dead code removed

- 22 component `.css` files, every one either empty or containing only `:host { display: block; }` (a few with `height: 100%`) — consolidated into ~15 lines of shared selectors in `styles.css`.
- The dead `.bottom_btn { margin-right: 12px; }` CSS rule in `bookmark-form-dialog.css` (never referenced by any template) — removed along with the whole file.
- `bookmark-skeleton`, `folder-skeleton`, `tag-skeleton` components (3 files each, byte-identical TypeScript) — replaced by one `CardSkeleton` with a `variant` input.
- The duplicated color-swatch-picker markup in `folder-form-dialog.html`/`tag-form-dialog.html` — replaced by one `ColorPicker` component.
- `findOwnedBookmark`/`findOwnedFolder`/`findOwnedTag` (3 duplicate implementations of the same 404/403 guard) — replaced by one `findOwnedDocument` helper.
- `assertUniqueName` duplicated in `folder.service.js` and `tag.service.js` — replaced by one shared helper.
- Byte-identical `FOLDER_COLORS`/`TAG_COLORS` arrays — now both source from one `RESOURCE_COLORS` constant.
- Duplicated `descriptionValidator` in `bookmark.validator.js`/`folder.validator.js` — now one shared validator.
- The same Tailwind input-class string (5 occurrences), primary-button class (5 occurrences), and secondary-button class (4 occurrences) hand-copied across dialog templates — now `.form-input`/`.btn-primary`/`.btn-secondary`.
- An unused generic callback parameter in `Dashboard.loadStat()` that was always called with the same `(x) => x.length` argument at all 3 call sites (found during the `/simplify` pass) — removed.

## Bug fixes (Bucket B)

- **Dashboard "Bookmarks" stat was permanently 0** — `BookmarkService` was never injected; now fetched alongside Folders/Tags.
- **Dashboard folder/tag load failures were silently swallowed** — now surface via `NotificationService`, consistent with every other page in the app.
- **`folder: ""` on a bookmark crashed with a 500** (empty string reached Mongoose as an invalid ObjectId cast) — now normalized to `null` (clears the folder), verified live: create, update-to-clear, and the original crash path all confirmed working.
- **`color: ""` / `icon: ""` on a folder or tag silently persisted as an empty string**, invisible in the UI and bypassing the intended enum constraint — now stripped so the schema default applies on create, and left untouched (no accidental overwrite) on update. Verified live on both create and update paths.
- **500-level errors leaked raw internal exception messages to API clients in production** (`NODE_ENV=production`) — now forced to a generic "Internal server error" message; ApiError-driven 400/401/403/404/409 responses are unaffected (verified their messages pass through unchanged).
- **500-level errors were never logged in production** — now always logged server-side regardless of environment.
- **The Windows DNS-resolver workaround applied unconditionally on every platform** — now scoped to `win32` only, so it can't interfere with DNS in containerized/Linux deployments.
- **Redundant `FolderService`/`TagService.list()` HTTP calls** — every consumer (Dashboard, Bookmarks page, Folders/Tags pages, the bookmark form dialog) now shares one cached, `shareReplay`-backed request, invalidated automatically on create/update/delete.

*Note on process:* the first attempt at the folder/color/icon empty-string fix used an `express-validator` `.customSanitizer()`, which live testing showed did **not** reliably propagate to Mongoose. It was reverted and replaced with explicit, directly-verifiable normalization in the service layer — called out here because it's a case where the initial fix didn't work as designed and was corrected before being counted as done.

## Performance improvements

- Added `{user,folder}` and `{user,tags}` compound indexes on `Bookmark` — the folder-delete cascade, tag-delete cascade, and per-folder/per-tag bookmark counts were doing collection scans without them.
- Eliminated redundant `GET /folders` / `GET /tags` requests across the app via response caching (see above) — opening the bookmark create dialog repeatedly no longer re-fetches folder/tag lists that rarely change.
- Added `ChangeDetectionStrategy.OnPush` to 8 components that previously ran default (dirty-checking) change detection: `App`, `Login`, `Register`, `Layout`, `Navbar`, `Sidebar`, `Breadcrumb`, `ComingSoon`. `Layout` wraps every routed page, so this has the broadest effect.
- `Dashboard`'s three stat requests already fired concurrently; confirmed (not changed) during the `/simplify` pass.

## Security improvements

- Production error responses no longer leak internal exception details (stack traces, Mongoose cast/driver error text).
- Unexpected server errors are now always logged, closing an observability gap in production.
- The empty-string validation bypass (see Bug fixes) also had a minor security dimension: it let malformed/empty style data reach the database unfiltered.

Deliberately **not** applied (Bucket C, needs a separate approval — new dependencies or larger behavior changes): `helmet`, `express-rate-limit` on auth routes, regex-escaping the bookmark search input, global 401 → forced logout in the Angular HTTP interceptor, and fail-fast required-env-var validation at boot. All four remain fully specified in `CODE_REVIEW_REPORT.md` Phase 5/8.

## Architecture improvements

- Backend: introduced a `utils/` sub-layer of small, single-purpose, cross-module helpers (`ownership.js`, `uniqueName.js`, `colorPalette.js`, `sanitize.js`) that the Bookmark/Folder/Tag services now share, instead of three parallel copies of the same logic evolving independently.
- Frontend: introduced two shared presentational components (`CardSkeleton`, `ColorPicker`) in `shared/components/`, and shared control classes in `styles.css` — reducing the Bookmark/Folder/Tag feature modules' divergence risk now that they share their common visual/structural pieces instead of each maintaining its own copy.
- No changes to the overall `config/controllers/middleware/models/routes/services/utils/validators` (backend) or `core/shared/features/layout` (frontend) folder structure — both were already correctly organized per the Phase 7 review; this pass only reduced duplication *within* that structure.

## Code quality improvements

- Removed all editable, hand-maintained duplication identified in the audit (helpers, validators, constants, CSS, skeleton components, color pickers, Tailwind class strings) — see Dead Code Removed above for the full list.
- Consistent `OnPush` usage across all 23 standalone components (was 15/23).
- Consistent `standalone: true` across all 23 components (was 22/23; `App` was the outlier).
- One `/simplify` pass applied after the main fixes caught and removed one piece of accidental over-genericity (`Dashboard.loadStat`'s unused callback parameter).

## Estimated maintainability improvement

Qualitative, based on what changes going forward now touch:

- **Before:** renaming the folder/tag color palette, changing the "not found" or "not allowed" wording, or restyling a dialog's input/button required editing the same logic in up to 5 separate files, with no compiler/test signal if one copy was missed.
- **After:** each of those is a one-file change (`utils/colorPalette.js`, `utils/ownership.js`, `styles.css`), and the 3 CRUD feature modules (Bookmarks/Folders/Tags) share their skeleton and color-picker UI instead of maintaining parallel copies that can silently drift out of sync (as the `bookmark-skeleton` vs. `folder-skeleton`/`tag-skeleton` `:host` CSS already had, before this pass).
- Net line-count change is modest (this was a consolidation pass, not a rewrite), but the number of places a future bug fix or design change needs to be applied dropped meaningfully in exactly the areas flagged by the Phase 1 audit as highest-duplication.

## Verification performed

- `node --check` on every modified/new backend file.
- `ng build` after every batch of frontend changes (4 full builds across this pass, all clean).
- Live end-to-end verification against the real MongoDB Atlas cluster with a throwaway user: folder/tag CRUD, uniqueness (409), cross-user authorization (403/404), bookmark↔folder/tag integration, and — specifically — the empty-string bug fixes (folder clear-to-null, color/icon fallback-to-default on create, color/icon left-unchanged on update). All test data was deleted afterward.
- A `/simplify` pass (reuse/simplification/efficiency/altitude) over the full diff, which found and fixed one over-generalized helper; everything else checked out already at the right altitude.

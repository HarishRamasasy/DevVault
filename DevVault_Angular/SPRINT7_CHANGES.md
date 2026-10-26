# Sprint 7 — User Profile & Settings

Scope: view and edit your own profile, change your password, and a Settings
page with one working preference. No OAuth, 2FA, avatar upload, account
deletion, or dark mode. Login and registration are unchanged.

## Backend (`DevVault_Node`)

| File | Change |
|---|---|
| `routes/user.routes.js` (new) | `/api/users` router. Every route uses `protect`. |
| `controllers/user.controller.js` (new) | `getProfile`, `updateProfile`, `changePassword`. Only `name`/`email` and `currentPassword`/`newPassword` are read from the body. `getProfile` reuses `authService.getUserById`. |
| `services/user.service.js` (new) | `updateProfile`: whitelisted `$set` with `runValidators`, and maps duplicate-key `11000` to `409 Email is already in use`. `changePassword`: checks the current password with bcrypt, rejects reusing it, and saves through the existing pre-save hash hook. |
| `validators/user.validator.js` (new) | Name: optional, non-empty, max 100. Email: optional, valid. Current password: required. New password: at least 8 characters, same rule as registration. |
| `server.js` | Mounts `app.use('/api/users', userRoutes)`. |
| `tests/user.api.check.mjs` (new) | End-to-end API check (see Verification). |
| `package.json` | Added the `test:users` script. |

No schema changes. The existing `User` fields (`name`, `email`, `password`
with `select: false`, `avatar`, timestamps) were enough. The `toJSON`
transform already strips `password` and `__v`.

### Endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| `GET` | `/api/users/me` | Current user's profile. `/api/auth/me` still works. |
| `PUT` | `/api/users/me` | Updates `name` and/or `email`. Email is trimmed and lowercased (schema setters, same as registration). Duplicate email → `409`. Empty body or invalid values → `400`. Any other field (`_id`, `password`, `role`, …) is ignored. |
| `PUT` | `/api/users/me/password` | Body: `{ currentPassword, newPassword }`. Wrong current password → `400` (not `401`: the session is fine, so the client shouldn't treat it as logged out). New password shorter than 8 characters or the same as the current one → `400`. |

The user is always `req.user.id` from the JWT, never from the request.

## Frontend (`DevVault_Angular`)

### Core

- `core/services/auth.service.ts`:
  - Added `updateProfile()`. It writes the returned user into the existing
    `currentUser` signal and localStorage, so the navbar updates straight
    away.
  - Added `changePassword()`.
  - Moved the `initials` computed here from the navbar, so the navbar and the
    Profile page share it.
- `core/services/preferences.service.ts` (new): a `sidebarCollapsed` signal,
  saved to localStorage (`devvault_sidebar_collapsed`) by an `effect`.

### Pages

- **Profile** (`/profile`, `features/profile/`):
  - Avatar initials, name, email, and "Member since".
  - Refreshes the user on load, with a skeleton while loading.
  - **Edit Profile** switches the card to an inline Reactive Form. Save is
    disabled while the form is invalid, unchanged (compared after trim and
    lowercasing the email), or saving. Server errors show inline; a
    successful save shows a snackbar.
  - Account information card: registered email, created date, last updated,
    and a link to Change password.
- **Change Password** (`/settings/password`, `features/settings/change-password/`):
  - Current, new, and confirm fields, each with a show/hide toggle.
  - Reuses `passwordMatchValidator` and `PasswordVisibility` from registration.
  - Submitting twice while saving is blocked.
  - The form resets after success. API errors (for example "Current password
    is incorrect") show inline.
- **Settings** (`/settings`, `features/settings/`):
  - Replaces the ComingSoon placeholder.
  - Account section: links to Profile and Change Password.
  - Preferences section: a **Compact sidebar** toggle (icon-only sidebar on
    desktop), saved per device.

### Layout and routing

- `app.routes.ts`: added `profile` and `settings/password`. `settings` now
  points at the real page. All three sit under the existing `authGuard`
  layout and set breadcrumb titles.
- `layout/navbar`: the user menu's **Profile** item now links to `/profile`.
- `layout/layout.ts`: on desktop, the sidebar collapsed state comes from
  `PreferencesService`. Mobile and tablet behavior is unchanged.
- `styles.css`: added `app-profile`, `app-settings`, and `app-change-password`
  to the `display: block` host list.

### Deliberately skipped

- **Dark mode**: every template hardcodes `bg-white`/`text-gray-*`, so a toggle
  would need a redesign. No placeholder toggle was added.
- **Avatar upload/URL**: there's no safe image source. Initials are shown
  instead.
- **Account status**: there's no reliable status field.
- **Account deletion**: out of scope.

## Verification

- **Build**: `ng build` passes with no warnings. `ng test` passes 2/2.
- **API**: `npm run test:users` passes 12/12, against the configured Atlas
  database on port 5055. It uses two temporary `@example.test` users and
  deletes them afterwards. Checks:
  - `401` without a token or with an invalid token
  - the profile response contains no `password` or bcrypt hash
  - name trimmed, email trimmed and lowercased, and login works with the new
    email
  - duplicate email (in a different case) → `409`
  - invalid, empty, and over-long input → `400`
  - a body with another user's `_id`/`userId` plus `password`/`role` changes
    only the caller's name; the other user, the password hash, and the role
    are untouched
  - wrong current password, reused password, short password, and missing
    fields → `400`
  - after a valid change the new password is stored as a bcrypt hash, the old
    password fails login, and the new one works
  - regression: `/auth/me`, tag create/list/delete, and bookmark and folder
    list
- **Not run**: UI checks in a browser (pages, responsive layouts,
  logout/expiry, guards, Sprint 6 search UI).

## Known follow-ups (not in scope)

- Changing the password doesn't revoke other sessions. Existing JWTs stay
  valid until they expire (7 days). Fixing this needs a `tokenVersion` (or
  `passwordChangedAt`) checked in `protect`.
- The Compact sidebar preference is per device, not stored with the account.

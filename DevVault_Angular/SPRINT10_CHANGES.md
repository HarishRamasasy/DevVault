# Sprint 10 — Production Readiness (in progress)

Scope: harden what exists, add tests, document deployment. No new features. Nothing was deployed.

## Verdict: READY AFTER MINOR FIXES

Not ready to publish yet. The remaining items are manual or need a browser or database (see "Not done").

## Initial audit

| Area | Finding |
|---|---|
| Working | Auth, dashboard, bookmarks, folders, tags, search, profile/settings, notes, snippets all exist and are routed. Backend ownership checks (`utils/ownership.js`), validators, bcrypt hashing and password-hash exclusion were already correct. Error handler already hides 500 details in production. |
| Defect | `DevVault_Node/node_modules` was committed (595 files; no `.gitignore` in that folder). |
| Security | No security headers, no rate limiting on login/register, no explicit body limit. `CLIENT_URL` unset would make `cors` allow every origin. No startup validation of env vars. |
| Defect | Frontend never reacted to a server `401` (rotated secret, deleted user): the user stayed "logged in" and saw errors. |
| Blocker | No health endpoint, no `.env.example`, no deployment docs, no SPA fallback file, production `apiUrl` is a placeholder. |
| Tests | Backend API checks ran against whatever `MONGO_URI` is configured (no isolation option). Frontend had 2 spec files. |
| Secrets | `environment.env` is git-ignored and was never committed (checked history). No credentials in tracked files. |

## Changes

**Backend (`DevVault_Node`)**
- `config/env.js`: exits with a clear message if `MONGO_URI`, `JWT_SECRET` or `CLIENT_URL` is missing (names only, never values); production requires a `JWT_SECRET` of 32+ characters.
- `app.js` (new): the Express app moved out of `server.js` so it can be tested without a database. Adds `helmet`, `express-rate-limit` on `/api/auth/login` and `/register` (10 failed attempts per 15 min per IP; successes don't count), 256kb JSON/urlencoded limit, `trust proxy` in production, and `GET /api/health` (200 ok / 503 when the database is down; no internals exposed).
- `server.js`: starts the app; closes the HTTP server and the DB connection on `SIGTERM`.
- `.gitignore` (new): `node_modules/`, `environment.env`, `.env`, `*.log`. `git rm --cached` was run on `DevVault_Node/node_modules` (index only; files are still on disk, history not rewritten).
- `environment.env.example` (new): placeholders only.
- `tests/hardening.check.mjs` + `npm run test:hardening` (new): database-free check.
- `tests/*.api.check.mjs`: honour `TEST_MONGO_URI` so checks can target a disposable database.
- Dependencies added: `helmet`, `express-rate-limit` (security headers and rate limiting; not worth hand-rolling). `npm audit fix` cleared 3 advisories (1 critical, 1 high, 1 moderate, transitive) in the backend lockfile.

**Frontend (`DevVault_Angular`)**
- `auth.interceptor.ts`: on `401` it logs out and redirects to `/auth/login`, and still passes the error on.
- `auth.interceptor.spec.ts`, `guards.spec.ts` (new): interceptor and guard tests.
- `public/_redirects` (new): SPA fallback for Netlify-style hosts.
- `npm audit fix` applied to the lockfile (semver-compatible only).

**Docs**: `DEPLOYMENT.md` (new, repo root); README status, env, health endpoint, Testing and Deployment sections.

## Test results (executed 2026-10-26)

| Check | Result |
|---|---|
| `npm run test:hardening` | Passed: env validation (missing vars, short prod secret, no values printed), health 503 without DB, helmet headers, no `X-Powered-By`, CORS (only `CLIENT_URL`), 401 without token, 413 body limit, 404, 429 after 10 failed logins |
| Real server boot against the configured Atlas DB | Started, connected, `GET /api/health` returned 200 (read-only; no data written) |
| `ng test --watch=false` | 16 / 16 passed (4 files; 8 were already there) |
| `ng build` (production) | Passed; initial bundle 176 kB raw / 42 kB transfer; `_redirects` present in the output |
| `npm audit --omit=dev` | Backend 0 vulnerabilities. Frontend: 1 moderate remains (`@angular/common` `HttpTransferCache`, SSR-only; DevVault does not use SSR) |

**Not run**
- `test:users`, `test:notes`, `test:snippets` after the `app.js` refactor. They write to the configured database and no disposable one is available here. They should be run against a `TEST_MONGO_URI` before release; the boot test above only shows the server starts.
- Browser checks: responsive layouts, keyboard/focus/contrast, console errors, the 401 redirect in a real session.
- The end-to-end smoke journey (checklist is in `DEPLOYMENT.md`).
- Frontend tests for bookmark/note/snippet/profile forms and search controls (not written).
- Performance profiling and coverage measurement. No coverage figure is claimed.
- No lint script exists in either package; none was run.

## Security notes
Confirmed: bcrypt hashing, hash excluded from responses, JWT checked on every protected route, ownership enforced in the backend (not only by guards), mass assignment blocked (earlier sprints' tests), code rendered as text.

Remaining risks:
- Rate-limit store is in memory (per instance).
- JWT lasts 7 days, has no revocation, and `protect` does not check that the user still exists.
- Token is kept in `localStorage` (readable by any XSS; mitigated by rendering user content as text).
- Only one CORS origin is supported.
- Snippet search is an unanchored regex over the user's own snippets.

## Before going public
1. Set `apiUrl` in `environment.production.ts`.
2. Create Atlas, API host and static host per `DEPLOYMENT.md`.
3. Run the three API checks against a test database.
4. Walk the smoke checklist in a browser, including a mobile viewport.

Suggested commit: `chore: production hardening (env validation, helmet, auth rate limit, health endpoint), 401 handling, tests, deployment docs`

# DevVault Deployment Guide

Nothing has been deployed from this repository. These are the manual steps.

**Recommended:** MongoDB Atlas (database) + Render web service (API) + Netlify (Angular static site). All three have free tiers and HTTPS by default. The repo is not tied to them: any Node host and any static host works.

## 1. MongoDB Atlas
1. Create a cluster and a database user with read/write access to one database (e.g. `devvault`). Do not use an admin user.
2. Network Access: allow the API host's outbound IPs. Render free-tier IPs change, so most people use `0.0.0.0/0` and rely on the strong DB password. That is a conscious trade-off; tighten it if the host offers static IPs.
3. Copy the `mongodb+srv://` string, add the database name before the `?`.
4. Indexes are created by Mongoose when the API starts (unique `User.email`, plus the per-resource indexes in `models/`). Check them in Atlas on first run.
5. Backups: enable Atlas backups (paid tiers) or run `mongodump` on a schedule. Test a restore before you rely on it.

## 2. Backend (Render web service)
- Root directory `DevVault_Node`, build `npm install`, start `npm start`.
- Health check path: `/api/health` (returns 503 when the database is disconnected, so the host restarts the service).
- Environment variables (set in the dashboard, never in Git):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | 32+ random chars: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | Exact frontend origin, e.g. `https://devvault.netlify.app` (no trailing slash) |
| `PORT` | Set by the host; do not hardcode |

The server exits at startup if `MONGO_URI`, `JWT_SECRET` or `CLIENT_URL` is missing, or if the production secret is under 32 characters.

## 3. Frontend (Netlify)
1. Edit `DevVault_Angular/src/environments/environment.production.ts`: set `apiUrl` to `https://<your-api-host>/api`. It currently holds the placeholder `https://api.devvault.example.com/api`. The Angular build bakes it in; nothing secret belongs here.
2. Base directory `DevVault_Angular`, build `npm run build`, publish `dist/DevVault_Angular/browser`.
3. SPA fallback: `public/_redirects` (`/* /index.html 200`) is copied into the build, so refreshing `/snippets/123` works on Netlify. On another host add the equivalent rewrite to `index.html`.

## 4. CORS
`CLIENT_URL` on the API must equal the browser's origin exactly (scheme + host, no path or trailing slash). Only one origin is allowed. A mismatch shows up as a CORS error in the browser console.

## 5. Smoke test (against the deployed URLs, with a throwaway account)
1. `GET https://<api>/api/health` returns `{"status":"ok","db":"connected"}`.
2. Open the site, register, log in, see the dashboard.
3. Create a folder, a tag, a bookmark (with both), a note and a snippet; edit one and delete one.
4. Update the profile and change the password; log out; log in with the new password.
5. Refresh on a deep link such as `/snippets`; it should load, not 404.
6. Visit `/dashboard` logged out; it should redirect to login.
7. With a second account, confirm the first account's items are not visible, and that API calls to their ids return 403.

## 6. Common failures
| Symptom | Cause |
|---|---|
| API exits with `Missing required environment variables` | Variable not set on the host |
| Browser: CORS error | `CLIENT_URL` wrong, has a trailing slash, or `http` vs `https` |
| Frontend calls `api.devvault.example.com` | `environment.production.ts` not updated before building |
| `MongoDB connection failed` | Atlas IP allow-list, wrong password (URL-encode special characters), or missing DB name |
| 404 on page refresh | SPA fallback missing on the static host |
| `429 Too many attempts` | 10 failed login/register attempts in 15 min from one IP; wait |
| First request slow | Free-tier hosts sleep when idle |

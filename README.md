# DevVault

![Status](https://img.shields.io/badge/status-Sprint%207%20Complete-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Angular](https://img.shields.io/badge/Angular-22-dd0031)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)

> A modern developer resource management platform for organizing bookmarks, notes, code snippets, and development resources.

DevVault gives developers a single, secure place to save and structure the tools, links, and references they rely on day to day. This repository contains the full-stack implementation: an Angular frontend and a Node.js/Express/MongoDB backend.

---

## Current Status

DevVault has completed **Sprint 9**.

**Completed**

- ✅ Authentication Module
- ✅ Dashboard Shell & Layout
- ✅ Bookmarks
- ✅ Folders
- ✅ Tags
- ✅ Global Search & Filters
- ✅ User Profile & Settings
- ✅ Notes
- ✅ Code Snippets

---

## Features Implemented

### Authentication

- User Registration
- User Login
- JWT Authentication
- Password Hashing (bcrypt)
- Protected Routes
- Guest Guard (redirects authenticated users away from login/register)
- Route Guard (redirects unauthenticated users away from protected pages)
- Authentication Persistence (session survives page refresh)
- Logout
- Form Validation (client-side and server-side)
- Error Handling (consistent API error responses)

### User Profile & Settings (Sprint 7)

- **Profile page** (`/profile`) — avatar initials, name, email, member-since date, and account information (registered email, created / last-updated dates). Reachable from the navbar user menu.
- **Edit profile** — update name and email with validation; Save is disabled while the form is invalid, unchanged, or saving. The navbar updates immediately, no re-login needed. A changed email becomes the sign-in email.
- **Change password** (`/settings/password`) — current / new / confirm fields with show-hide toggles. The backend verifies the current password with bcrypt, enforces 8+ characters, rejects reusing the current password, and hashes the new one. Fields clear on success.
- **Settings page** (`/settings`) — links to Profile and Change Password, plus a *Compact sidebar* preference (icon-only sidebar on desktop) stored in `localStorage` on the current device.

### Notes (Sprint 8)

- **Notes page** (`/notes`) — card grid showing title, a 3-line content preview, folder, tags, favorite star and last-updated date. Create, open, edit, delete (with confirmation) and favorite from each card. Loading, empty, no-results and error states.
- **Create / edit dialog** — title (≤150 chars) and multiline content (≤20,000 chars) with validation, plus the same searchable folder picker and multi-select tag chips used by bookmarks (shared `FolderTagPicker` component). The dialog saves itself, shows *Saving...*, ignores duplicate submits and stays open on errors.
- **Note details** (`/notes/:id`) — full title and content (line breaks and indentation preserved, rendered as plain text — never as HTML), folder, tags, created/updated dates, and favorite/edit/delete actions.
- **Search, filters and sorting** — the navbar search box searches notes while on `/notes` (title, content and tag names, debounced). Filter by favorites, folder and tags (all selected tags must match); sort newest, oldest, A–Z, Z–A or recently updated; server-side pagination. All state lives in the URL, and *Clear Filters* resets it.
- **Folder / tag integration** — a note has zero or one folder and any number of tags, all checked server-side to belong to the current user. Deleting a folder clears it from notes; deleting a tag removes it from notes. Notes themselves are never deleted.
- **Dashboard** — the Notes count comes from the API.

### Code Snippets (Sprint 9)

- **Snippets page** (`/snippets`) — card grid showing title, description preview, language, a highlighted 8-line code preview, folder, tags, favorite star and last-updated date. Create, open, edit, copy, delete (with confirmation) and favorite from each card. Loading, empty, no-results and error states.
- **Create / edit dialog** — title (≤150 chars), language dropdown, optional description (≤500 chars) and a monospace code editor (≤50,000 chars, no line wrapping, horizontal scroll). Code is saved exactly as typed: indentation, tabs and line breaks are never trimmed. Uses the shared `FolderTagPicker` for folder and tag chips.
- **Snippet details** (`/snippets/:id`) — title, description, language, full syntax-highlighted code, folder, tags, created/updated dates, and copy/favorite/edit/delete actions.
- **Syntax highlighting** — [highlight.js](https://highlightjs.org/) core build with only the 24 offered languages registered, loaded in the lazy snippets chunk. Its output escapes all code text, so `<script>` or HTML in a snippet shows as text and never runs. Languages without a grammar (`plaintext`, or an unexpected value) fall back to plain escaped text.
- **Copy code** — uses the browser Clipboard API and copies the full, exact source (even from the truncated card preview), with success/failure snackbars. Clipboard access needs HTTPS or `localhost`.
- **Search, filters and sorting** — the navbar search box searches snippets while on `/snippets` (title, description, code, language and tag names, debounced). Filter by language, favorites, folder and tags; same sort options, pagination and URL-driven state as Notes.
- **Folder / tag integration** — same rules as Notes: ownership checked server-side, deleting a folder clears it from snippets, deleting a tag removes it from snippets, and snippets themselves are never deleted.
- **Dashboard** — the Snippets count comes from the API.

**Supported languages:** `plaintext`, `javascript`, `typescript`, `html`, `css`, `scss`, `json`, `python`, `java`, `csharp`, `cpp`, `c`, `go`, `rust`, `php`, `ruby`, `kotlin`, `swift`, `sql`, `bash`, `powershell`, `yaml`, `xml`, `markdown`, `dockerfile`. The backend rejects any other value with `400`. To add one, update `SNIPPET_LANGUAGES` in both `DevVault_Node/models/Snippet.js` and `DevVault_Angular/src/app/core/models/snippet.model.ts`, and register its grammar in `shared/components/code-block/code-block.ts`.

---

## Tech Stack

**Frontend**

| Technology | Purpose |
|---|---|
| Angular 22 | Application framework (standalone components) |
| Angular Router | Client-side routing and route guards |
| Reactive Forms | Form state and validation |
| HttpClient | HTTP communication with the backend |
| Tailwind CSS | Utility-first styling |
| Angular Material | Icons and Material component primitives |
| highlight.js | Read-only syntax highlighting for code snippets |

**Backend**

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | HTTP server and routing |
| MongoDB Atlas | Cloud-hosted database |
| Mongoose | MongoDB object modeling |
| jsonwebtoken | JWT generation and verification |
| bcryptjs | Password hashing |

---

## Project Structure

```
DevVault/
├── DevVault_Angular/              # Angular frontend
│   └── src/app/
│       ├── core/
│       │   ├── guards/            # authGuard, guestGuard
│       │   ├── interceptors/      # JWT auth interceptor
│       │   ├── models/            # User, auth, and API response types
│       │   ├── services/          # AuthService
│       │   ├── utils/             # Shared helpers (error parsing, password visibility)
│       │   └── validators/        # Custom form validators
│       └── features/
│           ├── auth/
│           │   ├── login/         # Login page
│           │   └── register/      # Register page
│           └── dashboard/         # Protected placeholder dashboard
│
└── DevVault_Node/                 # Express backend
    ├── config/                    # Environment loading and MongoDB connection
    ├── controllers/                # Request handlers (thin, delegate to services)
    ├── services/                   # Business logic
    ├── models/                     # Mongoose schemas
    ├── routes/                     # Express route definitions
    ├── middleware/                 # Auth guard, validation, error handling
    ├── validators/                  # express-validator rule sets
    ├── utils/                      # ApiResponse, ApiError, JWT helper
    └── server.js                   # Application entry point
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Harish-ramasamy/DevVault.git
cd DevVault
```

### 2. Install backend dependencies

```bash
cd DevVault_Node
npm install
```

### 3. Install frontend dependencies

```bash
cd DevVault_Angular
npm install
```

### 4. Run the backend

```bash
cd DevVault_Node
npm run dev
```

The API will start on `http://localhost:5000`.

### 5. Run the frontend

```bash
cd DevVault_Angular
npm start
```

The app will be available at `http://localhost:4200`.

---

## Environment Variables

### Backend

Create an `environment.env` file inside `DevVault_Node/` with the following keys:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:4200
```

> ⚠️ Never commit this file or real secrets to version control. `environment.env` is already excluded via `.gitignore`.

### Frontend

The frontend does not use a runtime `.env` file. The API base URL is configured at build time in:

- `src/environments/environment.ts` (development)
- `src/environments/environment.production.ts` (production)

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
};
```

---

## Authentication Flow

```
Register
   ↓
Login
   ↓
JWT Generated
   ↓
Token stored & attached to requests (HTTP Interceptor)
   ↓
Protected Routes (Route Guard)
   ↓
Dashboard
```

Unauthenticated users are redirected away from protected routes to the login page. Authenticated users are redirected away from the login/register pages to the dashboard (Guest Guard). Sessions persist across page refreshes until the token expires or the user logs out.

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate a user and receive a JWT | No |
| `GET` | `/api/auth/me` | Get the currently authenticated user | Yes |
| `GET` | `/api/users/me` | Get the current user's profile | Yes |
| `PUT` | `/api/users/me` | Update the current user's `name` and/or `email` (other fields are ignored) | Yes |
| `PUT` | `/api/users/me/password` | Change password — body: `currentPassword`, `newPassword` | Yes |

Profile endpoints always act on the user identified by the JWT; no user ID is accepted from the request. `PUT /api/users/me` returns `409` if the email is already in use. `PUT /api/users/me/password` returns `400` for an incorrect current password, a new password shorter than 8 characters, or a new password identical to the current one.

To re-run the profile/password API checks: `cd DevVault_Node && npm run test:users`. This starts the server on port 5055 against the configured `MONGO_URI`, creates two temporary `@example.test` users, and deletes them afterwards.

### Notes endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/notes` | Create a note — body: `title`, `content`, optional `folder`, `tags[]` | Yes |
| `GET` | `/api/notes` | List the current user's notes — query: `search`, `folder`, `tags` (comma-separated ids), `favorite`, `sort` (`newest`, `oldest`, `az`, `za`, `updated`), `page`, `limit` (≤100) | Yes |
| `GET` | `/api/notes/:id` | Get one note | Yes |
| `PUT` | `/api/notes/:id` | Update `title`, `content`, `folder`, `tags` (partial updates allowed) | Yes |
| `DELETE` | `/api/notes/:id` | Delete a note | Yes |
| `PATCH` | `/api/notes/:id/favorite` | Toggle the note's favorite flag | Yes |

Only `title`, `content`, `folder`, `tags` and `favorite` are read from the body; `user`, `_id` and timestamps are ignored. Invalid ids or payloads return `400`, another user's note returns `403`, and a missing note — or a `folder`/`tag` that doesn't belong to the user — returns `404`. Note content is stored as plain text.

To re-run the notes API checks: `cd DevVault_Node && npm run test:notes`. This uses port 5056, otherwise works like `test:users`, and also cleans up the test users' notes, folders, tags and bookmarks. Either script can run against a local MongoDB by setting `MONGO_URI` in the shell first (dotenv doesn't override an existing variable).

### Snippets endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/snippets` | Create a snippet — body: `title`, `code`, `language`, optional `description`, `folder`, `tags[]` | Yes |
| `GET` | `/api/snippets` | List the current user's snippets — query: `search`, `language`, `folder`, `tags` (comma-separated ids), `favorite`, `sort` (`newest`, `oldest`, `az`, `za`, `updated`), `page`, `limit` (≤100) | Yes |
| `GET` | `/api/snippets/:id` | Get one snippet | Yes |
| `PUT` | `/api/snippets/:id` | Update `title`, `description`, `code`, `language`, `folder`, `tags` (partial updates allowed) | Yes |
| `DELETE` | `/api/snippets/:id` | Delete a snippet | Yes |
| `PATCH` | `/api/snippets/:id/favorite` | Toggle the snippet's favorite flag | Yes |

Only the fields above (plus `favorite`) are read from the body; `user`, `_id` and timestamps are ignored. Invalid ids, payloads or languages return `400`; another user's snippet returns `403`; a missing snippet, or a `folder`/`tag` that doesn't belong to the user, returns `404`. Code is stored verbatim as plain text and is never executed.

To re-run the snippets API checks: `cd DevVault_Node && npm run test:snippets` (port 5057, same setup and cleanup as `test:notes`). The frontend `CodeBlock` safe-rendering spec runs with `cd DevVault_Angular && npx ng test --watch=false`.

All responses follow a consistent structure:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {}
}
```

```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": []
}
```

---

## Screenshots

### Login

_Screenshot coming soon_

### Register

_Screenshot coming soon_

### Dashboard (Coming Soon)

_Screenshot coming soon_

---

## Roadmap

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Authentication | ✅ Complete |
| Sprint 2 | Dashboard Layout | ✅ Complete |
| Sprint 3 | Bookmarks CRUD | ✅ Complete |
| Sprint 4 | Folder Management | ✅ Complete |
| Sprint 5 | Tag Management | ✅ Complete |
| Sprint 6 | Search | ✅ Complete |
| Sprint 7 | User Profile & Settings | ✅ Complete |
| Sprint 8 | Notes Management | ✅ Complete |
| Sprint 9 | Code Snippets | ✅ Complete |

---

## Future Enhancements

- Social login (GitHub / Google OAuth)
- Browser extension for quick bookmarking
- Team / workspace collaboration
- Import from existing bookmarking tools
- Dark mode
- Public, shareable snippet links

---

## License

This project is licensed under the [MIT License](LICENSE).

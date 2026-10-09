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

DevVault has completed **Sprint 7**.

**Completed**

- ✅ Authentication Module
- ✅ Dashboard Shell & Layout
- ✅ Bookmarks
- ✅ Folders
- ✅ Tags
- ✅ Global Search & Filters
- ✅ User Profile & Settings

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
| Sprint 8 | Deployment | Planned |

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

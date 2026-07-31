# DevVault

![Status](https://img.shields.io/badge/status-Sprint%201%20Complete-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Angular](https://img.shields.io/badge/Angular-22-dd0031)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)

> A modern developer resource management platform for organizing bookmarks, notes, code snippets, and development resources.

DevVault gives developers a single, secure place to save and structure the tools, links, and references they rely on day to day. This repository contains the full-stack implementation: an Angular frontend and a Node.js/Express/MongoDB backend.

---

## Current Status

DevVault is currently in **Sprint 1**.

**Completed**

- ✅ Authentication Module

**Upcoming**

- Dashboard
- Bookmarks
- Folders
- Tags
- Search
- Favorites

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
| Sprint 2 | Dashboard Layout | Planned |
| Sprint 3 | Bookmarks CRUD | Planned |
| Sprint 4 | Folder Management | Planned |
| Sprint 5 | Tag Management | Planned |
| Sprint 6 | Search | Planned |
| Sprint 7 | Favorites | Planned |
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

# Tanulószoba

Tanulószoba is a small educational web application made for the EPAM web application demo task. The app lets visitors browse learning materials, while teachers can create topics and lesson notes. Admin users can manage roles and teacher profile settings.

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router
- State management: React Context API for authentication state
- Backend: Node.js, Express
- Authentication: JWT bearer tokens
- Storage: local JSON file for demo data (`backend/data/db.json`, generated at runtime)
- Styling: custom responsive CSS

## Requirement Mapping

- Meaningful React UI: public material catalog, reader view, teacher editor, admin panel
- Routing: `react-router-dom` routes for catalog, material detail, login, teacher, admin
- State management: `AuthContext` stores user, token, role helpers and login/logout actions
- Backend API: Express endpoints under `/api`
- JWT auth/authz: login returns JWT, protected endpoints check `ADMIN` and `TEACHER` roles
- Responsive design: CSS grid layout collapses for smaller screens

## Demo Accounts

|   Role  |           Email             |    Password   |
|   ---   |            ---              |      ---      |
| Admin   | `admin@tanuloszoba.local`   | `Admin123!`   |
| Teacher | `teacher@tanuloszoba.local` | `Teacher123!` |
| Student | `student@tanuloszoba.local` | `Student123!` |

## Run Locally

```powershell
cd D:\000uni\06\webalk\Beadando\tanuloszoba-main
npm install
npm run install:all
npm run dev
```

Frontend: `http://localhost:5174`

Backend: `http://localhost:4000`

## Useful Scripts

```powershell
npm run dev
npm run build
npm run start
```

## Environment Variables

The backend can be configured with environment variables. For local demo use, the defaults work without creating an `.env` file.

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5174
JWT_SECRET=replace-this-with-a-long-random-secret-in-real-use
```

## API Overview

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/subjects`
- `GET /api/teachers`
- `GET /api/topics`
- `GET /api/materials`
- `GET /api/materials/:id`
- `POST /api/topics` requires `TEACHER` or `ADMIN`
- `POST /api/materials` requires `TEACHER` or `ADMIN`
- `PUT /api/materials/:id` requires owner teacher or `ADMIN`
- `DELETE /api/materials/:id` requires owner teacher or `ADMIN`
- `GET /api/admin/users` requires `ADMIN`
- `PATCH /api/admin/users/:id/roles` requires `ADMIN`

## Security Notes

Passwords are stored as PBKDF2 hashes with per-user salts in the demo JSON store. JWT tokens are signed on the backend and are stored by the browser in local storage for the demo. Real deployment should use a strong `JWT_SECRET`, HTTPS, stricter CORS, rate limiting, and a real database.

## AI Usage

OpenAI ChatGPT was used as development assistance for planning, scaffolding, code generation and documentation. The final code was reviewed and adapted for the project requirements.#
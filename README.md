# Veritas ERP — College Attendance Management System

A university-grade attendance management system for **Srinivas University**. Manages batches (A1–A4), students, lecturers, subjects, a weekly timetable, and interactive roll-call attendance marking with role-based dashboards (Student / Lecturer / Admin) and analytics charts.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 6, Tailwind CSS v4, Recharts, lucide-react, motion (Framer Motion)
- **Backend:** Vercel Serverless Functions (`@vercel/node`), written in TypeScript
- **Database:** Supabase (Postgres) via `@supabase/supabase-js`
- **Auth:** JWT (HS256) signed by `/api/login`, verified by every authenticated endpoint. Passwords hashed with bcrypt.

## Roles

| Role     | Capabilities                                                                       |
| -------- | ---------------------------------------------------------------------------------- |
| Student  | View own attendance, subject-wise % + 75% threshold tracking, view own timetable  |
| Lecturer | Take attendance (roll-call workflow), view/edit timetable, view attendance history |
| Admin    | Full CRUD on students/lecturers/subjects/timetable, view full attendance ledger    |

## Project Structure

```
api/                       # Vercel serverless functions
  _auth.ts                 # JWT verification helpers (requireAuth/requireRole)
  _db.ts                   # Lazy Supabase singleton + sequence-based nextId()
  _password.ts             # bcrypt hashing helpers
  _lib/
    default_timetable.ts   # Embedded base64 default Excel sheet
    timetable_parser.ts    # Excel parser + DB seeder
  auth/
    signup/student.ts      # Student self-signup
    forgot-password.ts     # Issue reset token
    reset-password.ts      # Validate token + update password
  admin/
    lecturers.ts           # Add/delete lecturer (admin only)
    students.ts            # Add/delete student (admin only)
    timetable/
      index.ts             # Timetable + subject CRUD (lecturer/admin)
      import.ts            # Excel importer (lecturer/admin)
  attendance.ts            # GET history / GET student / POST mark
  data.ts                  # Generic data fetch (students/subjects/lecturers/timetable/batches)
  login.ts                 # Login for student/lecturer/admin
  timetable.ts             # Role-aware timetable read
src/
  App.tsx                  # Session + theme shell
  main.tsx                 # Vite entry point
  types.ts                 # Shared TypeScript types
  lib/apiFetch.ts          # Authenticated fetch wrapper
  components/
    LoginPortal.tsx
    StudentDashboard.tsx
    LecturerDashboard.tsx
    AdminDashboard.tsx
    StudentCharts.tsx
    TimetableView.tsx
    TimetableEditor.tsx
SUPABASE_FULL_SCHEMA.sql   # Complete DB schema (idempotent — safe to re-run)
```

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Rohan-kotyan/Necron-.git
cd Necron-
npm install
```

### 2. Configure environment variables

Create `.env.local` (gitignored) with:

```bash
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
JWT_SECRET="<openssl rand -hex 32>"
```

### 3. Apply the database schema

Open the Supabase SQL Editor and run [`SUPABASE_FULL_SCHEMA.sql`](./SUPABASE_FULL_SCHEMA.sql). The script is idempotent — safe to re-run. It creates:

- Tables: `students`, `lecturers`, `subjects`, `timetable`, `attendance`, `admins`, `password_resets`
- Constraints: unique `email`, unique `registration_number`, unique `(student_id, subject_id, date)` for attendance upserts, FK from `timetable.subject_id` → `subjects.id`
- RLS policies: defence-in-depth — direct client queries blocked; server uses `service_role` to bypass
- Per-table sequences + a `next_sequential_id(prefix, table)` Postgres function for safe ID generation
- A seeded admin account: `admin@college.edu` / `ChangeMe!2026` — **change this password immediately after first login**

### 4. Run locally

```bash
npm run dev
```

## Security

- **Passwords are bcrypt-hashed** — never stored or compared in plaintext.
- **JWT-based auth** — every endpoint except `/api/login` and `/api/auth/signup/student` requires a valid Bearer token.
- **Role-scoped access** — students can only read their own data; lecturers/admins get broader access as appropriate.
- **No wildcard injection** — login uses exact `.eq()` lookups, not `ilike`.
- **Defence-in-depth RLS** — direct Supabase queries from the client are blocked at the database layer.
- **Constant-time password comparison** for legacy plaintext migration.

## License

MIT

## Deployment

This project deploys directly to Vercel. No CI/CD pipeline is required — Vercel
handles the build automatically on every push.

To deploy manually:

```bash
npm i -g vercel
vercel
# Add env vars in the Vercel dashboard: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
```

## Development

```bash
npm install
npm run dev        # start Vite dev server
npm run typecheck  # TypeScript type check (no emit)
npm run build      # production build to dist/
```

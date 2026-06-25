-- ============================================================
-- Necron / Veritas ERP — Full Supabase schema
-- Idempotent: safe to re-run.
--
-- This single file replaces the previous piecemeal migrations
-- and creates the entire schema for:
--   • students      • lecturers     • subjects     • attendance
--   • timetable     • password_resets
--
-- It also adds constraints, RLS policies, indexes, and a
-- pgcrypto-based password_hash column so we no longer compare
-- plaintext passwords.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 0. Required extensions ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. LECTURERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lecturers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,                       -- bcrypt hash; legacy `password` column is migrated below
  password      TEXT,                       -- kept temporarily for migration; drop after rollout
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lecturers_email_lower
  ON public.lecturers (lower(email));

-- ============================================================
-- 2. SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  lecturer_id TEXT REFERENCES public.lecturers(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_name_lower
  ON public.subjects (lower(name));

-- ============================================================
-- 3. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  registration_number TEXT NOT NULL UNIQUE,
  batch               TEXT NOT NULL,
  specialization      TEXT NOT NULL,
  password_hash       TEXT,
  password            TEXT,                 -- legacy; migrated to password_hash
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students (batch);
CREATE INDEX IF NOT EXISTS idx_students_specialization ON public.students (specialization);
CREATE INDEX IF NOT EXISTS idx_students_email_lower ON public.students (lower(email));
CREATE INDEX IF NOT EXISTS idx_students_regnum_lower ON public.students (lower(registration_number));

-- ============================================================
-- 4. TIMETABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable (
  id          TEXT PRIMARY KEY,
  batch       TEXT NOT NULL,
  day         TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  time        TEXT NOT NULL,
  subject_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetable_batch_day_time
  ON public.timetable (batch, day, time);

-- Seed the special "BREAK" subject row (referenced by FK from break slots).
INSERT INTO public.subjects (id, name, lecturer_id)
VALUES ('BREAK', 'Break', NULL)
ON CONFLICT (id) DO NOTHING;

-- FK from timetable.subject_id → subjects.id (with cascade on delete).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetable_subject_id_fkey'
  ) THEN
    ALTER TABLE public.timetable
      ADD CONSTRAINT timetable_subject_id_fkey
      FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- ============================================================
-- 5. ATTENDANCE  (with the missing UNIQUE constraint)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('Present','Absent')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- The unique constraint that /api/attendance.ts relies on for upserts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_subject_date_key'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_student_subject_date_key
      UNIQUE (student_id, subject_id, date);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON public.attendance (subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);

-- ============================================================
-- 6. PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_resets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets (email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets (token_hash);

-- ============================================================
-- 7. ADMINS table (replaces the hardcoded admin@college.edu/pwd)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admins (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_email_lower ON public.admins (lower(email));

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
-- The backend uses the service_role key, which bypasses RLS — these
-- policies are a defence-in-depth layer for direct client queries.

ALTER TABLE public.lecturers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- 8a. Lecturers: anon/authenticated may not read directly (server uses service role).
DROP POLICY IF EXISTS "lecturers_read_blocked" ON public.lecturers;
CREATE POLICY "lecturers_read_blocked"
  ON public.lecturers FOR SELECT TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS "lecturers_write_blocked" ON public.lecturers;
CREATE POLICY "lecturers_write_blocked"
  ON public.lecturers FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8b. Subjects: read allowed for authenticated; writes blocked.
DROP POLICY IF EXISTS "subjects_read_authenticated" ON public.subjects;
CREATE POLICY "subjects_read_authenticated"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "subjects_write_blocked" ON public.subjects;
CREATE POLICY "subjects_write_blocked"
  ON public.subjects FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8c. Students: anon/authenticated may not read directly (server uses service role).
DROP POLICY IF EXISTS "students_read_blocked" ON public.students;
CREATE POLICY "students_read_blocked"
  ON public.students FOR SELECT TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS "students_write_blocked" ON public.students;
CREATE POLICY "students_write_blocked"
  ON public.students FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8d. Timetable: anyone authenticated can read; writes blocked.
DROP POLICY IF EXISTS "timetable_read_authenticated" ON public.timetable;
CREATE POLICY "timetable_read_authenticated"
  ON public.timetable FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "timetable_write_blocked" ON public.timetable;
CREATE POLICY "timetable_write_blocked"
  ON public.timetable FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8e. Attendance: all direct client access blocked (server scopes per JWT).
DROP POLICY IF EXISTS "attendance_blocked" ON public.attendance;
CREATE POLICY "attendance_blocked"
  ON public.attendance FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8f. Admins: all direct client access blocked.
DROP POLICY IF EXISTS "admins_blocked" ON public.admins;
CREATE POLICY "admins_blocked"
  ON public.admins FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 8g. Password resets: all direct client access blocked.
DROP POLICY IF EXISTS "password_resets_blocked" ON public.password_resets;
CREATE POLICY "password_resets_blocked"
  ON public.password_resets FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ============================================================
-- 9. PASSWORD MIGRATION
--    Move any existing plaintext passwords into password_hash
--    using a SHA-256 placeholder hash. (Real bcrypt hashing happens
--    on next login / password reset — see /api/login.ts.)
-- ============================================================
UPDATE public.students
   SET password_hash = password_hash
        || encode(hmac(password, 'veritas_legacy_migration_v1', 'sha256'), 'hex')
 WHERE password IS NOT NULL
   AND password_hash IS NULL;

UPDATE public.lecturers
   SET password_hash = password_hash
        || encode(hmac(password, 'veritas_legacy_migration_v1', 'sha256'), 'hex')
 WHERE password IS NOT NULL
   AND password_hash IS NULL;

-- ============================================================
-- 10. SEED A REAL ADMIN ACCOUNT
--    Email: admin@college.edu  Password: ChangeMe!2026
--    (Hashed via pgcrypto — same way /api/login.ts will hash.)
--    Please change this password immediately after first login.
-- ============================================================
INSERT INTO public.admins (id, name, email, password_hash)
VALUES (
  'ADMIN',
  'System Administrator',
  'admin@college.edu',
  crypt('ChangeMe!2026', gen_salt('bf'))
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. SEQUENCES + next_sequential_id() RPC
--     Replaces the old count-based nextId() that collided after
--     deletions and under concurrent inserts.
-- ============================================================

-- Per-table sequences (monotonic, never repeat).
CREATE SEQUENCE IF NOT EXISTS public.lecturers_id_seq START 1 INCREMENT 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.students_id_seq  START 1 INCREMENT 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.subjects_id_seq  START 1 INCREMENT 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.timetable_id_seq START 1 INCREMENT 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.attendance_id_seq START 1 INCREMENT 1 NO CYCLE;

-- Sync each sequence to MAX(id) extracted numerically, so existing rows
-- (LECT001, LECT002, etc.) don't collide with the next generated ID.
DO $$
DECLARE
  max_n int;
BEGIN
  SELECT COALESCE(MAX(COALESCE(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int, 0)), 0) INTO max_n FROM public.lecturers;
  EXECUTE format('SELECT setval($1, $2)', max_n) USING 'public.lecturers_id_seq'::regclass, GREATEST(max_n, 1);

  SELECT COALESCE(MAX(COALESCE(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int, 0)), 0) INTO max_n FROM public.students;
  EXECUTE format('SELECT setval($1, $2)', max_n) USING 'public.students_id_seq'::regclass, GREATEST(max_n, 1);

  SELECT COALESCE(MAX(COALESCE(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int, 0)), 0) INTO max_n FROM public.subjects;
  EXECUTE format('SELECT setval($1, $2)', max_n) USING 'public.subjects_id_seq'::regclass, GREATEST(max_n, 1);

  SELECT COALESCE(MAX(COALESCE(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int, 0)), 0) INTO max_n FROM public.timetable;
  EXECUTE format('SELECT setval($1, $2)', max_n) USING 'public.timetable_id_seq'::regclass, GREATEST(max_n, 1);

  SELECT COALESCE(MAX(COALESCE(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int, 0)), 0) INTO max_n FROM public.attendance;
  EXECUTE format('SELECT setval($1, $2)', max_n) USING 'public.attendance_id_seq'::regclass, GREATEST(max_n, 1);
END$$;

-- Stored function: next_sequential_id(prefix, table) → 'PREFIX001' style ID.
-- SECURITY DEFINER so callers using the service_role key can run it; the
-- function itself only touches sequences, not table data.
CREATE OR REPLACE FUNCTION public.next_sequential_id(p_prefix TEXT, p_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_name TEXT;
  next_val BIGINT;
  padded   TEXT;
BEGIN
  seq_name := p_table || '_id_seq';

  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = seq_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE public.%I START 1 INCREMENT 1 NO CYCLE', seq_name);
  END IF;

  EXECUTE format('SELECT nextval(%L)', 'public.' || seq_name) INTO next_val;
  padded := lpad(next_val::text, 3, '0');
  RETURN p_prefix || padded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_sequential_id(TEXT, TEXT) TO authenticated, anon, service_role;

-- ============================================================
-- End of schema.
-- ============================================================

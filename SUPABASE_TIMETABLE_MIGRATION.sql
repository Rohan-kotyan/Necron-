-- ============================================================
-- Necron — Timetable module schema migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- after running the original SUPABASE_SETUP.sql that came with the
-- migration zip. This adds the timetable-specific tables, constraints,
-- RLS policies, and the special BREAK subject row.
-- ============================================================

-- ─── 1. Ensure the `timetable` table exists ───────────────────────
-- (Created by the original setup; declared here as idempotent.)
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

-- ─── 2. Seed the special "BREAK" subject row (id = 'BREAK') ──────
-- The timetable editor uses subject_id = 'BREAK' to mark break slots.
-- This row is referenced by foreign key, so it must exist before any
-- break slot can be inserted. We use ON CONFLICT so re-running is safe.
INSERT INTO public.subjects (id, name, lecturer_id)
VALUES ('BREAK', 'Break', NULL)
ON CONFLICT (id) DO NOTHING;

-- Note: if your subjects table doesn't allow NULL lecturer_id, run:
--   ALTER TABLE public.subjects ALTER COLUMN lecturer_id DROP NOT NULL;
-- (Most setups already allow NULL.)

-- ─── 3. Foreign key from timetable.subject_id → subjects.id ──────
-- This was not enforced by the original schema. Add it now so deletes
-- cascade cleanly. (Skip if it already exists.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_subject_id_fkey'
  ) THEN
    ALTER TABLE public.timetable
      ADD CONSTRAINT timetable_subject_id_fkey
      FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- ─── 4. Row-Level Security (role-based access) ────────────────────
-- The backend uses the service role key, which bypasses RLS, so these
-- policies are a defence-in-depth layer for direct client queries (e.g.
-- if the anon key is ever leaked). Enable RLS but allow the service role
-- to do everything via the default `service_role` bypass.
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT policy: anyone authenticated can read.
DROP POLICY IF EXISTS "timetable_read_authenticated" ON public.timetable;
CREATE POLICY "timetable_read_authenticated"
  ON public.timetable FOR SELECT
  TO authenticated
  USING (true);

-- 4b. INSERT/UPDATE/DELETE: deny the anon + authenticated roles from
-- writing directly. All writes must go through the serverless API
-- (which uses the service role key and performs its own role check
-- against the JWT).
DROP POLICY IF EXISTS "timetable_write_blocked" ON public.timetable;
CREATE POLICY "timetable_write_blocked"
  ON public.timetable FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ─── 5. Optional: extend students table with `batch` index ───────
-- Speeds up the "fetch all students in batch X" queries.
CREATE INDEX IF NOT EXISTS idx_students_batch
  ON public.students (batch);

-- ============================================================
-- End of timetable migration.
-- ============================================================

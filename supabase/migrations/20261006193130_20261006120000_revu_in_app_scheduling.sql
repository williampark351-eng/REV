/*
# Add ReV in-app scheduling

1. Purpose
   - Replace the external Calendly link with a first-party booking experience inside the ReV Coaching Hub.
   - Store coach weekly availability and booking preferences in Supabase so the calendar is not driven by hardcoded values.

2. New Tables
   - `coach_availability`
     - `id` — unique availability row identifier.
     - `coach_id` — coach who owns the time window.
     - `weekday` — ISO weekday number from 0 (Sunday) through 6 (Saturday).
     - `start_time` — local start time in HH:MM format.
     - `end_time` — local end time in HH:MM format.
     - `active` — whether this time window is published for booking.
   - `booking_settings`
     - `id` — unique settings row identifier.
     - `coach_id` — coach who owns these settings.
     - `timezone` — IANA timezone used to display and book slots.
     - `duration_min` — length of each coaching call.
     - `buffer_min` — gap between consecutive calls.
     - `window_days` — number of future days students may book.

3. Modified Tables
   - `coaches`
     - `booking_enabled` — controls whether students can book with the coach.

4. Security
   - RLS is enabled on both new tables.
   - Four separate CRUD policies allow the existing single-tenant app roles (`anon`, `authenticated`) to use shared scheduling data.
   - Availability rows are intentionally shared within this single-company coaching hub.
   - A unique partial index prevents two booked calls for the same coach at the same start time.

5. Important Notes
   - All changes are additive and preserve existing calls, recordings, and accounts.
   - The booking UI validates slots before insert and handles the database uniqueness constraint if two people choose the same time.
*/

CREATE TABLE IF NOT EXISTS coach_availability (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

ALTER TABLE coach_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_availability_select" ON coach_availability;
CREATE POLICY "coach_availability_select" ON coach_availability FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "coach_availability_insert" ON coach_availability;
CREATE POLICY "coach_availability_insert" ON coach_availability FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "coach_availability_update" ON coach_availability;
CREATE POLICY "coach_availability_update" ON coach_availability FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "coach_availability_delete" ON coach_availability;
CREATE POLICY "coach_availability_delete" ON coach_availability FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_weekday ON coach_availability(coach_id, weekday);

CREATE TABLE IF NOT EXISTS booking_settings (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES coaches(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/New_York',
  duration_min int NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 15 AND 180),
  buffer_min int NOT NULL DEFAULT 15 CHECK (buffer_min BETWEEN 0 AND 120),
  window_days int NOT NULL DEFAULT 30 CHECK (window_days BETWEEN 1 AND 90),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_settings_select" ON booking_settings;
CREATE POLICY "booking_settings_select" ON booking_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "booking_settings_insert" ON booking_settings;
CREATE POLICY "booking_settings_insert" ON booking_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "booking_settings_update" ON booking_settings;
CREATE POLICY "booking_settings_update" ON booking_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "booking_settings_delete" ON booking_settings;
CREATE POLICY "booking_settings_delete" ON booking_settings FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_booked_coach_time ON calls(coach_id, scheduled_at) WHERE status = 'booked' AND scheduled_at IS NOT NULL;

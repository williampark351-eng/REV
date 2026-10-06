/*
# REV University Coaching Hub — v4 schema

1. Purpose
   - Single-tenant coaching hub for REV University 1:1 coaching (one company, shared data).
   - Two audiences: coaches (Ismail, Jonah) and students (1:1 clients).
   - Login is app-level screen gating against a bcrypt-hashed password stored per user.
   - All data is intentionally shared within the company, so all tables expose `anon, authenticated`.

2. New tables
   - coaches — coach accounts (name, email, phone, hashed password, Calendly link, headline).
   - students — student accounts (contact, assigned coach, stage, start date, headline goal/lead fields).
   - onboarding_forms — a student's structured onboarding questionnaire answers.
   - onboarding_tasks — the 5-step onboarding checklist per student.
   - roadmaps — the AI-drafted, coach-approved 6-meeting roadmap per student.
   - roadmap_milestones — the 6 meetings inside a roadmap (goal + homework each).
   - calls — 1:1 call records (schedule, status, duration, summary, topics, recording).
   - action_items — auto-populated action items pulled from call summaries.
   - homework — assignments with due dates + review status.
   - homework_updates — student submissions/updates on homework.
   - notes — private coach notes per student.
   - hiring_items — REVhire editor-hiring checklist per student.
   - activity_log — per-student activity feed (drives "no activity" risk flags + timelines).

3. Security
   - RLS enabled on every table.
   - 4 CRUD policies per table, scoped `TO anon, authenticated` (single-tenant shared data).
   - The `password_hash` column is hidden from anon/authenticated reads on coaches + students.
   - `login(text,text)` — SECURITY DEFINER, verifies password and returns role + user id.
   - `create_student(...)` — SECURITY DEFINER, creates a student account + onboarding checklist.
*/

-- ============ coaches ============
CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  calendly_url text NOT NULL DEFAULT 'https://calendly.com/',
  headline text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coaches_select" ON coaches;
CREATE POLICY "coaches_select" ON coaches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "coaches_insert" ON coaches;
CREATE POLICY "coaches_insert" ON coaches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "coaches_update" ON coaches;
CREATE POLICY "coaches_update" ON coaches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "coaches_delete" ON coaches;
CREATE POLICY "coaches_delete" ON coaches FOR DELETE TO anon, authenticated USING (true);

-- ============ students ============
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  stage text NOT NULL DEFAULT 'Onboarding'
    CHECK (stage IN ('Onboarding','Active','Offboarding','Graduated','Paused')),
  start_date date,
  location text,
  current_revenue numeric,
  goal_revenue numeric,
  thirty_day_win text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select" ON students;
CREATE POLICY "students_select" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "students_insert" ON students;
CREATE POLICY "students_insert" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "students_update" ON students;
CREATE POLICY "students_update" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "students_delete" ON students;
CREATE POLICY "students_delete" ON students FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach_id);
CREATE INDEX IF NOT EXISTS idx_students_stage ON students(stage);

-- ============ onboarding_forms ============
CREATE TABLE IF NOT EXISTS onboarding_forms (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  current_revenue text,
  goal_revenue text,
  avg_order_value text,
  team_size text,
  biggest_struggle text,
  number_one_goal text,
  services_offered text,
  lead_source text,
  first_break text,
  quality_rating int CHECK (quality_rating BETWEEN 1 AND 10),
  website text,
  booking_portal text,
  instagram text,
  tools text,
  thirty_day_win text,
  not_working text,
  shipping_address text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "obf_select" ON onboarding_forms;
CREATE POLICY "obf_select" ON onboarding_forms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "obf_insert" ON onboarding_forms;
CREATE POLICY "obf_insert" ON onboarding_forms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "obf_update" ON onboarding_forms;
CREATE POLICY "obf_update" ON onboarding_forms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "obf_delete" ON onboarding_forms;
CREATE POLICY "obf_delete" ON onboarding_forms FOR DELETE TO anon, authenticated USING (true);

-- ============ onboarding_tasks ============
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  UNIQUE (student_id, task_key)
);
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "obt_select" ON onboarding_tasks;
CREATE POLICY "obt_select" ON onboarding_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "obt_insert" ON onboarding_tasks;
CREATE POLICY "obt_insert" ON onboarding_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "obt_update" ON onboarding_tasks;
CREATE POLICY "obt_update" ON onboarding_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "obt_delete" ON onboarding_tasks;
CREATE POLICY "obt_delete" ON onboarding_tasks FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_obt_student ON onboarding_tasks(student_id);

-- ============ roadmaps ============
CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  title text,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES coaches(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roadmaps_select" ON roadmaps;
CREATE POLICY "roadmaps_select" ON roadmaps FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "roadmaps_insert" ON roadmaps;
CREATE POLICY "roadmaps_insert" ON roadmaps FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "roadmaps_update" ON roadmaps;
CREATE POLICY "roadmaps_update" ON roadmaps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "roadmaps_delete" ON roadmaps;
CREATE POLICY "roadmaps_delete" ON roadmaps FOR DELETE TO anon, authenticated USING (true);

-- ============ roadmap_milestones ============
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  position int NOT NULL,
  title text NOT NULL,
  goal text,
  homework text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('done','current','upcoming'))
);
ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rbm_select" ON roadmap_milestones;
CREATE POLICY "rbm_select" ON roadmap_milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "rbm_insert" ON roadmap_milestones;
CREATE POLICY "rbm_insert" ON roadmap_milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rbm_update" ON roadmap_milestones;
CREATE POLICY "rbm_update" ON roadmap_milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rbm_delete" ON roadmap_milestones;
CREATE POLICY "rbm_delete" ON roadmap_milestones FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_rbm_roadmap ON roadmap_milestones(roadmap_id);

-- ============ calls ============
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  duration_min int,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','completed','missed','cancelled')),
  meeting_link text,
  recording_url text,
  summary text,
  topics text[],
  raw_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calls_select" ON calls;
CREATE POLICY "calls_select" ON calls FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "calls_insert" ON calls;
CREATE POLICY "calls_insert" ON calls FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "calls_update" ON calls;
CREATE POLICY "calls_update" ON calls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "calls_delete" ON calls;
CREATE POLICY "calls_delete" ON calls FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_calls_student ON calls(student_id);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled ON calls(scheduled_at);

-- ============ action_items ============
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "act_select" ON action_items;
CREATE POLICY "act_select" ON action_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "act_insert" ON action_items;
CREATE POLICY "act_insert" ON action_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "act_update" ON action_items;
CREATE POLICY "act_update" ON action_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "act_delete" ON action_items;
CREATE POLICY "act_delete" ON action_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_act_student ON action_items(student_id);

-- ============ homework ============
CREATE TABLE IF NOT EXISTS homework (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','submitted','reviewed','overdue')),
  link text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hw_select" ON homework;
CREATE POLICY "hw_select" ON homework FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hw_insert" ON homework;
CREATE POLICY "hw_insert" ON homework FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hw_update" ON homework;
CREATE POLICY "hw_update" ON homework FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hw_delete" ON homework;
CREATE POLICY "hw_delete" ON homework FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_hw_student ON homework(student_id);
CREATE INDEX IF NOT EXISTS idx_hw_status ON homework(status);

-- ============ homework_updates ============
CREATE TABLE IF NOT EXISTS homework_updates (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  body text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE homework_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hwu_select" ON homework_updates;
CREATE POLICY "hwu_select" ON homework_updates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hwu_insert" ON homework_updates;
CREATE POLICY "hwu_insert" ON homework_updates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hwu_update" ON homework_updates;
CREATE POLICY "hwu_update" ON homework_updates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hwu_delete" ON homework_updates;
CREATE POLICY "hwu_delete" ON homework_updates FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_hwu_homework ON homework_updates(homework_id);

-- ============ notes ============
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);

-- ============ hiring_items ============
CREATE TABLE IF NOT EXISTS hiring_items (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  UNIQUE (student_id, step_key)
);
ALTER TABLE hiring_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hiring_select" ON hiring_items;
CREATE POLICY "hiring_select" ON hiring_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hiring_insert" ON hiring_items;
CREATE POLICY "hiring_insert" ON hiring_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hiring_update" ON hiring_items;
CREATE POLICY "hiring_update" ON hiring_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hiring_delete" ON hiring_items;
CREATE POLICY "hiring_delete" ON hiring_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_hiring_student ON hiring_items(student_id);

-- ============ activity_log ============
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "al_select" ON activity_log;
CREATE POLICY "al_select" ON activity_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "al_insert" ON activity_log;
CREATE POLICY "al_insert" ON activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "al_update" ON activity_log;
CREATE POLICY "al_update" ON activity_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "al_delete" ON activity_log;
CREATE POLICY "al_delete" ON activity_log FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_al_student ON activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_al_created ON activity_log(created_at);

-- ============ hide password hashes from the app ============
REVOKE SELECT (password_hash) ON public.coaches FROM anon, authenticated;
REVOKE SELECT (password_hash) ON public.students FROM anon, authenticated;

-- ============ login() ============
CREATE OR REPLACE FUNCTION public.login(p_email text, p_password text)
RETURNS TABLE (user_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, 'coach'::text
  FROM public.coaches
  WHERE lower(email) = lower(p_email)
    AND password_hash IS NOT NULL
    AND password_hash = extensions.crypt(p_password, password_hash)
  UNION ALL
  SELECT id, 'student'::text
  FROM public.students
  WHERE lower(email) = lower(p_email)
    AND password_hash IS NOT NULL
    AND password_hash = extensions.crypt(p_password, password_hash)
$$;
REVOKE ALL ON FUNCTION public.login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login(text, text) TO anon, authenticated;

-- ============ create_student() ============
CREATE OR REPLACE FUNCTION public.create_student(
  p_name text,
  p_email text,
  p_phone text,
  p_coach_id uuid,
  p_start_date date,
  p_location text DEFAULT NULL
)
RETURNS TABLE (student_id uuid, temp_password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid := extensions.gen_random_uuid();
  v_pass text := 'revu-' || substr(md5(random()::text), 1, 8);
  v_pos int;
  v_key text;
  v_label text;
BEGIN
  INSERT INTO public.students (id, coach_id, name, email, phone, password_hash, stage, start_date, location)
  VALUES (v_id, p_coach_id, p_name, lower(p_email), p_phone,
          extensions.crypt(v_pass, extensions.gen_salt('bf')),
          'Onboarding', p_start_date, p_location);

  FOR v_pos IN 1..5 LOOP
    v_key := CASE v_pos WHEN 1 THEN 'agreement_signed'
                        WHEN 2 THEN 'joined_skool'
                        WHEN 3 THEN 'form_completed'
                        WHEN 4 THEN 'call_booked'
                        WHEN 5 THEN 'call_held' END;
    v_label := CASE v_pos WHEN 1 THEN 'Agreement signed'
                          WHEN 2 THEN 'Joined Skool'
                          WHEN 3 THEN 'Onboarding form completed'
                          WHEN 4 THEN 'Onboarding call booked'
                          WHEN 5 THEN 'Onboarding call held' END;
    INSERT INTO public.onboarding_tasks (student_id, task_key, label)
    VALUES (v_id, v_key, v_label);
  END LOOP;

  INSERT INTO public.activity_log (student_id, coach_id, type, message)
  VALUES (v_id, p_coach_id, 'student_added', 'Added to the program');

  RETURN QUERY SELECT v_id, v_pass;
END;
$$;
REVOKE ALL ON FUNCTION public.create_student(text, text, text, uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_student(text, text, text, uuid, date, text) TO anon, authenticated;

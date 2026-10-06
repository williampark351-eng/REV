/*
# Hide password hashes from the app (column-level grants)

1. Purpose
   - Keep `password_hash` out of the browser. It must exist in the DB so `login()` can verify
     it, but it should never be selectable by the anon/authenticated app.
2. Change
   - Replace the broad table-level grants on `coaches` and `students` with explicit
     column-level grants that exclude `password_hash`.
   - DELETE stays table-level (Postgres has no column-level DELETE).
3. Notes
   - The SECURITY DEFINER `login()` and `create_student()` functions still read/write the
     hash because they run as the table owner, so authentication is unaffected.
*/

-- coaches: drop broad grants, re-grant per-column excluding password_hash
REVOKE ALL ON public.coaches FROM anon, authenticated;
GRANT SELECT (id, name, email, phone, calendly_url, headline, created_at),
      INSERT (id, name, email, phone, calendly_url, headline, created_at),
      UPDATE (id, name, email, phone, calendly_url, headline, created_at)
      ON public.coaches TO anon, authenticated;
GRANT DELETE ON public.coaches TO anon, authenticated;

-- students: drop broad grants, re-grant per-column excluding password_hash
REVOKE ALL ON public.students FROM anon, authenticated;
GRANT SELECT (id, coach_id, name, email, phone, stage, start_date, location, current_revenue, goal_revenue, thirty_day_win, created_at),
      INSERT (id, coach_id, name, email, phone, stage, start_date, location, current_revenue, goal_revenue, thirty_day_win, created_at),
      UPDATE (id, coach_id, name, email, phone, stage, start_date, location, current_revenue, goal_revenue, thirty_day_win, created_at)
      ON public.students TO anon, authenticated;
GRANT DELETE ON public.students TO anon, authenticated;

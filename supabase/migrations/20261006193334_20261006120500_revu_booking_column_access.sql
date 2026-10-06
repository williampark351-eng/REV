/*
# Expose booking switch to the app

1. Purpose
   - Allow the existing anon-key ReV app to read the coach booking switch added by the scheduling feature.

2. Modified Tables
   - `coaches`
     - Grants SELECT access to `booking_enabled` for the app roles.

3. Security
   - Only the non-sensitive booking flag is exposed.
   - The existing password hash restrictions remain unchanged.

4. Important Notes
   - This is additive and does not change or remove any existing coach data.
*/

GRANT SELECT (booking_enabled) ON public.coaches TO anon, authenticated;

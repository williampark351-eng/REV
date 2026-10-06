/*
# Remove the external booking URL default

1. Purpose
   - Prevent future coach records from receiving a hardcoded Calendly URL now that ReV owns scheduling.

2. Modified Tables
   - `coaches`
     - Removes the default value from the legacy `calendly_url` column.

3. Security
   - No access policy changes.
   - Existing password protections remain unchanged.

4. Important Notes
   - Existing coach records are preserved.
   - The application no longer reads or uses this legacy external booking field.
*/

ALTER TABLE coaches ALTER COLUMN calendly_url DROP DEFAULT;

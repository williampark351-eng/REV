/*
# Add homework feedback column

1. Purpose
   - Coaches need to leave a written comment when reviewing a homework submission.
   - The student sees this feedback on their homework item.
2. Change
   - Add nullable `feedback` text column to `homework` (additive only, no data loss).
*/

ALTER TABLE homework ADD COLUMN IF NOT EXISTS feedback text;

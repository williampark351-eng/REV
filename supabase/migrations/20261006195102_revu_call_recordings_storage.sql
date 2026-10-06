/*
# Call recordings storage

## Plain-English summary
Creates a storage area ("bucket") called `call-recordings` where the Call Studio uploads
the full audio of each coaching call. The upload produces a permanent link that is saved
on the call automatically, so coaches never paste a recording link by hand.

## New storage bucket
- `call-recordings`
  - public read: anyone holding the (unguessable, random) file link can play it back
  - 200 MB per file limit
  - audio/video formats only

## Security
1. SELECT on storage.objects for this bucket only (needed for playback links).
2. INSERT on storage.objects for this bucket only (Call Studio uploads).
3. No UPDATE or DELETE policies: recordings cannot be overwritten or removed from the app.

## Notes
1. The app signs people in with its own login screen, so requests run as the `anon` role,
   matching the rest of this project's tables.
2. File paths include random IDs so links cannot be guessed.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  true,
  209715200,
  ARRAY['audio/webm','audio/ogg','audio/wav','audio/mpeg','audio/mp4','audio/x-m4a','video/webm','video/mp4']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "call_recordings_select" ON storage.objects;
CREATE POLICY "call_recordings_select" ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'call-recordings');

DROP POLICY IF EXISTS "call_recordings_insert" ON storage.objects;
CREATE POLICY "call_recordings_insert" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'call-recordings');

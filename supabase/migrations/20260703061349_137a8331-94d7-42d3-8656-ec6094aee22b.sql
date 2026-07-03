
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.premium_waitlist;

ALTER TABLE public.premium_waitlist
  ADD CONSTRAINT premium_waitlist_email_format
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320);

CREATE POLICY "Anyone can join the waitlist"
  ON public.premium_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 3
    AND (user_id IS NULL OR user_id = auth.uid())
  );

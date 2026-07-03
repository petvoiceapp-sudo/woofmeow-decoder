
CREATE TABLE public.premium_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.premium_waitlist TO anon;
GRANT INSERT, SELECT ON public.premium_waitlist TO authenticated;
GRANT ALL ON public.premium_waitlist TO service_role;

ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.premium_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users see their own waitlist entry"
  ON public.premium_waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);


-- Restrict waitlist SELECT so anonymous (null-owner) entries are not exposed to all authenticated users
DROP POLICY IF EXISTS "Users see their own waitlist entry" ON public.premium_waitlist;
CREATE POLICY "Users see their own waitlist entry"
  ON public.premium_waitlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Lock down SECURITY DEFINER functions from direct execution by clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_pro_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid) TO service_role;

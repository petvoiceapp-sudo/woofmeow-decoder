
ALTER FUNCTION public.touch_subscriptions_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_pro_access(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.touch_subscriptions_updated_at() FROM public, anon;

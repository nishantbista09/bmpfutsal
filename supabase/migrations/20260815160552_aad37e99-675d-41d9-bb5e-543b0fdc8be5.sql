REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_booking() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

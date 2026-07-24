
-- Lock down anon SELECT on base tables; public views (public_app_settings, public_version_log) remain the safe read paths.
DROP POLICY IF EXISTS "app_settings public row readable" ON public.app_settings;
DROP POLICY IF EXISTS "version_log public read" ON public.version_log;
REVOKE SELECT ON public.app_settings FROM anon;
REVOKE SELECT ON public.version_log FROM anon;

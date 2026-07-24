
-- Recreate views with security_invoker=true so they honor caller permissions
DROP VIEW IF EXISTS public.public_app_settings;
DROP VIEW IF EXISTS public.public_version_log;

-- Column-level grants on base tables so anon can only read safe columns
GRANT SELECT (id, support_whatsapp, support_message, hero_image_url, citations_enabled, citations_daily_limit, updated_at)
  ON public.app_settings TO anon;
GRANT SELECT (id, version, description, created_at)
  ON public.version_log TO anon;

-- RLS policies for anon on the exact minimal read paths
CREATE POLICY "app_settings public row readable" ON public.app_settings FOR SELECT TO anon
  USING (id = 1);
CREATE POLICY "version_log public read" ON public.version_log FOR SELECT TO anon
  USING (true);

CREATE VIEW public.public_app_settings
WITH (security_invoker = true) AS
SELECT id, support_whatsapp, support_message, hero_image_url, citations_enabled, citations_daily_limit, updated_at
FROM public.app_settings
WHERE id = 1;
GRANT SELECT ON public.public_app_settings TO anon, authenticated;

CREATE VIEW public.public_version_log
WITH (security_invoker = true) AS
SELECT id, version, description, created_at
FROM public.version_log
ORDER BY created_at DESC;
GRANT SELECT ON public.public_version_log TO anon, authenticated;

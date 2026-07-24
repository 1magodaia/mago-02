
-- 1) LEADS: restrict to owner + admin/master
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads(user_id);
DROP POLICY IF EXISTS "Public read leads" ON public.leads;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.leads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
CREATE POLICY "Owners and admins read leads" ON public.leads FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Owners insert own leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners and admins update leads" ON public.leads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Owners and admins delete leads" ON public.leads FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));

-- 2) APP_SETTINGS: restrict table, expose only safe columns via public view
DROP POLICY IF EXISTS "app_settings readable by everyone" ON public.app_settings;
REVOKE ALL ON public.app_settings FROM anon;
REVOKE ALL ON public.app_settings FROM authenticated;
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
CREATE POLICY "app_settings readable by admin/master" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));

-- Public curated view for the WhatsApp support widget and hero image
CREATE OR REPLACE VIEW public.public_app_settings
WITH (security_invoker = false) AS
SELECT id, support_whatsapp, support_message, hero_image_url, citations_enabled, citations_daily_limit, updated_at
FROM public.app_settings
WHERE id = 1;
GRANT SELECT ON public.public_app_settings TO anon, authenticated;

-- 3) REALTIME: remove app_settings from publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings;

-- 4) VERSION_LOG: separate public summary from internal notes
DROP POLICY IF EXISTS "Public read version_log" ON public.version_log;
REVOKE ALL ON public.version_log FROM anon;
REVOKE ALL ON public.version_log FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.version_log TO authenticated;
GRANT ALL ON public.version_log TO service_role;
ALTER TABLE public.version_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "version_log admin/master read" ON public.version_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "version_log admin/master write" ON public.version_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'master'));

CREATE OR REPLACE VIEW public.public_version_log
WITH (security_invoker = false) AS
SELECT id, version, description, created_at
FROM public.version_log
ORDER BY created_at DESC;
GRANT SELECT ON public.public_version_log TO anon, authenticated;

-- 5/6) SECURITY DEFINER functions: lock down EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_search_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
-- has_role is used by RLS policies from any authenticated context; keep it callable by authenticated only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Insert public changelog entry
INSERT INTO public.version_log (version, description, impact, risk)
VALUES ('5.6.3', 'Reforços de segurança e privacidade de dados.',
        'Endurecimento de RLS em leads/app_settings/version_log, remoção de Realtime em app_settings, criação de views públicas mínimas, restrição de EXECUTE em funções SECURITY DEFINER.',
        'Baixo — mudanças transparentes ao usuário final; ajustes de código no cliente para consumir as views públicas.');

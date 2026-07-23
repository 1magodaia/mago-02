
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  support_whatsapp TEXT,
  support_message TEXT DEFAULT 'Olá! Preciso de ajuda com o Busca Mágica.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings readable by everyone" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings updatable by admin/master" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

CREATE POLICY "app_settings insertable by admin/master" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

INSERT INTO public.app_settings (id, support_whatsapp) VALUES (1, NULL);


CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  instagram_handle TEXT,
  instagram_last_post_days INT,
  has_website BOOLEAN NOT NULL DEFAULT false,
  has_whatsapp BOOLEAN NOT NULL DEFAULT false,
  score_lead INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'green',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leads" ON public.leads FOR SELECT USING (true);

CREATE TABLE public.version_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  risk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.version_log TO anon;
GRANT SELECT, INSERT ON public.version_log TO authenticated;
GRANT ALL ON public.version_log TO service_role;
ALTER TABLE public.version_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read version_log" ON public.version_log FOR SELECT USING (true);

INSERT INTO public.version_log (version, description, impact, risk) VALUES
('1.0.0', 'Lançamento inicial do Busca Mágica: dashboard, análise de leads e sistema de versionamento CACA.', 'Marketers já conseguem localizar comércios e priorizar leads quentes.', 'Nenhum — MVP com dados simulados.'),
('0.9.0', 'Modelagem do banco (leads, version_log) com RLS pública para leitura.', 'Base preparada para integração futura com Google Maps/Make/n8n.', 'RLS liberada apenas para SELECT — escrita restrita.'),
('0.8.0', 'Definição do design system premium (dark, glassmorphism, neon violet/emerald).', 'Identidade visual consistente antes do primeiro pixel.', 'Nenhum.');

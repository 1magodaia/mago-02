-- Adiciona a coluna logo_url à tabela app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Atualiza a view pública para incluir a nova coluna
DROP VIEW IF EXISTS public.public_app_settings;
CREATE VIEW public.public_app_settings AS
SELECT
    id,
    support_whatsapp,
    support_message,
    citations_enabled,
    citations_daily_limit,
    hero_image_url,
    hero_height_desktop,
    hero_height_mobile,
    hero_fit,
    logo_url,
    updated_at
FROM public.app_settings;

GRANT SELECT ON public.public_app_settings TO anon, authenticated;

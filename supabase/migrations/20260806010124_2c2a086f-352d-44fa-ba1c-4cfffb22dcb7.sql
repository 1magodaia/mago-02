-- Garante que a view seja security_invoker (padrão no Postgres 15+, mas bom explicitar)
DROP VIEW IF EXISTS public.public_app_settings;
CREATE VIEW public.public_app_settings WITH (security_invoker = true) AS
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
    unlock_link,
    updated_at
FROM public.app_settings
WHERE id = 1;

GRANT SELECT ON public.public_app_settings TO anon, authenticated;

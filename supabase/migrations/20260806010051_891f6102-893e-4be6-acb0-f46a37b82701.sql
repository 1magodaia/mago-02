ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS unlock_link TEXT;

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
    unlock_link,
    updated_at
FROM public.app_settings
WHERE id = 1;

GRANT SELECT ON public.public_app_settings TO anon, authenticated;

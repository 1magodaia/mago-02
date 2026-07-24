
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS hero_height_desktop int NOT NULL DEFAULT 320,
  ADD COLUMN IF NOT EXISTS hero_height_mobile  int NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS hero_fit            text NOT NULL DEFAULT 'cover';

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_hero_fit_check;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_hero_fit_check CHECK (hero_fit IN ('cover','contain'));

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_hero_height_desktop_check;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_hero_height_desktop_check CHECK (hero_height_desktop BETWEEN 120 AND 720);

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_hero_height_mobile_check;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_hero_height_mobile_check CHECK (hero_height_mobile BETWEEN 100 AND 480);

DROP VIEW IF EXISTS public.public_app_settings;
CREATE VIEW public.public_app_settings
WITH (security_invoker = true)
AS
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
  updated_at
FROM public.app_settings
WHERE id = 1;

GRANT SELECT ON public.public_app_settings TO anon, authenticated;

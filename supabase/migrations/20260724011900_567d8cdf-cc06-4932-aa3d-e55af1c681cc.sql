
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ai_selection_mode TEXT NOT NULL DEFAULT 'auto' CHECK (ai_selection_mode IN ('auto','manual')),
  ADD COLUMN IF NOT EXISTS ai_manual_key_id UUID NULL REFERENCES public.ai_provider_keys(id) ON DELETE SET NULL;

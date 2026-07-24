
-- Kill switch + daily limit for citations feature
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS citations_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS citations_daily_limit integer NOT NULL DEFAULT 20;

-- Citation lookups cache (7-day TTL enforced in code)
CREATE TABLE IF NOT EXISTS public.citation_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  lead_name text,
  lead_address text,
  query text NOT NULL,
  result jsonb NOT NULL,
  cost_cents integer NOT NULL DEFAULT 0,
  model text,
  cached_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS citation_lookups_place_recent_idx
  ON public.citation_lookups (place_id, cached_at DESC);
CREATE INDEX IF NOT EXISTS citation_lookups_user_day_idx
  ON public.citation_lookups (user_id, created_at DESC);

GRANT SELECT ON public.citation_lookups TO authenticated;
GRANT ALL ON public.citation_lookups TO service_role;

ALTER TABLE public.citation_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citation_lookups: users read own"
  ON public.citation_lookups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

-- v5.4.3 Part G: Multi-provider AI key registry with failover metadata.
-- Actual key VALUES live as Supabase secrets (referenced by secret_name),
-- never stored in the database.

CREATE TABLE public.ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai','gemini','groq','lovable')),
  label TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('active','error','rate_limited','untested','disabled')),
  last_error TEXT,
  last_tested_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_provider_keys TO authenticated;
GRANT ALL ON public.ai_provider_keys TO service_role;

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- Only master/admin can see the registry (contains no key values, just metadata).
CREATE POLICY "Master and admin can view AI keys"
  ON public.ai_provider_keys FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_provider_keys_updated_at
  BEFORE UPDATE ON public.ai_provider_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_provider_keys_priority ON public.ai_provider_keys (priority, status);
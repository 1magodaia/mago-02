
-- v5.5: Pro access control (by date or by searches), auto-downgrade on expiry.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_access_mode text NOT NULL DEFAULT 'none'
    CHECK (pro_access_mode IN ('none','date','searches')),
  ADD COLUMN IF NOT EXISTS pro_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS pro_searches_remaining integer;

ALTER TABLE public.plan_history
  ADD COLUMN IF NOT EXISTS access_mode text,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS searches_granted integer;

-- Rewrite consume_search_quota to honor date/searches modes and auto-downgrade.
CREATE OR REPLACE FUNCTION public.consume_search_quota(_user_id uuid, _free_limit integer)
RETURNS TABLE(allowed boolean, remaining integer, plan user_plan)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  p public.profiles;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'free'::public.user_plan; RETURN;
  END IF;
  IF p.status = 'blocked' THEN
    RETURN QUERY SELECT false, 0, p.plan; RETURN;
  END IF;

  -- Auto-downgrade if Pro-by-date expired
  IF p.plan = 'pro' AND p.pro_access_mode = 'date'
     AND p.pro_valid_until IS NOT NULL AND now() >= p.pro_valid_until THEN
    UPDATE public.profiles
      SET plan = 'free', pro_access_mode = 'none',
          pro_valid_until = NULL, pro_searches_remaining = NULL
      WHERE id = _user_id;
    p.plan := 'free';
    p.pro_access_mode := 'none';
    p.pro_valid_until := NULL;
    p.pro_searches_remaining := NULL;
    INSERT INTO public.plan_history(user_id, plan, changed_by, reason, access_mode)
    VALUES (_user_id, 'free', NULL, 'auto-downgrade: pro_valid_until expirado', 'none');
  END IF;

  -- Auto-downgrade if Pro-by-searches exhausted
  IF p.plan = 'pro' AND p.pro_access_mode = 'searches'
     AND COALESCE(p.pro_searches_remaining, 0) <= 0 THEN
    UPDATE public.profiles
      SET plan = 'free', pro_access_mode = 'none',
          pro_valid_until = NULL, pro_searches_remaining = NULL
      WHERE id = _user_id;
    p.plan := 'free';
    p.pro_access_mode := 'none';
    p.pro_searches_remaining := NULL;
    INSERT INTO public.plan_history(user_id, plan, changed_by, reason, access_mode)
    VALUES (_user_id, 'free', NULL, 'auto-downgrade: buscas Pro esgotadas', 'none');
  END IF;

  -- Reset monthly counter if window elapsed
  IF now() >= p.month_reset_at THEN
    UPDATE public.profiles
      SET search_count_month = 0,
          month_reset_at = date_trunc('month', now()) + interval '1 month'
      WHERE id = _user_id;
    p.search_count_month := 0;
  END IF;

  IF p.plan = 'pro' THEN
    UPDATE public.profiles SET search_count_month = search_count_month + 1 WHERE id = _user_id;
    -- If Pro-by-searches, decrement remaining
    IF p.pro_access_mode = 'searches' AND p.pro_searches_remaining IS NOT NULL THEN
      UPDATE public.profiles
        SET pro_searches_remaining = GREATEST(0, pro_searches_remaining - 1)
        WHERE id = _user_id;
      RETURN QUERY SELECT true, GREATEST(0, p.pro_searches_remaining - 1), p.plan; RETURN;
    END IF;
    RETURN QUERY SELECT true, 999999, p.plan; RETURN;
  END IF;

  IF p.search_count_month >= _free_limit THEN
    RETURN QUERY SELECT false, 0, p.plan; RETURN;
  END IF;
  UPDATE public.profiles SET search_count_month = search_count_month + 1 WHERE id = _user_id;
  RETURN QUERY SELECT true, _free_limit - (p.search_count_month + 1), p.plan;
END;
$function$;

-- Insert v5.5.0 changelog
INSERT INTO public.version_log (version, description, impact, risk)
VALUES (
  '5.5.0',
  'Controle de acesso Pro pelo Master por data OU por buscas; status Operando/Fechado do Google Places no card; extração de CNPJ do site com consulta pública à BrasilAPI (razão social, data de abertura, situação cadastral).',
  'Master concede Pro/teste com validade real; leads fechados ficam sinalizados; dados fiscais aparecem quando o site expõe CNPJ.',
  'Sem risco: expiração é automática (função consume_search_quota); CNPJ só é enriquecido quando extraído do próprio site.'
);

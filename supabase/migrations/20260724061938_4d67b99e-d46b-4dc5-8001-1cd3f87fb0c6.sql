-- New Free rule: 1 lifetime search per user (no monthly reset).
-- Pro (date/searches) paths are unchanged.
CREATE OR REPLACE FUNCTION public.consume_search_quota(_user_id uuid, _free_limit integer)
RETURNS TABLE(allowed boolean, remaining integer, plan public.user_plan)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Pro path (unchanged)
  IF p.plan = 'pro' THEN
    UPDATE public.profiles SET search_count_month = search_count_month + 1 WHERE id = _user_id;
    IF p.pro_access_mode = 'searches' AND p.pro_searches_remaining IS NOT NULL THEN
      UPDATE public.profiles
        SET pro_searches_remaining = GREATEST(0, pro_searches_remaining - 1)
        WHERE id = _user_id;
      RETURN QUERY SELECT true, GREATEST(0, p.pro_searches_remaining - 1), p.plan; RETURN;
    END IF;
    RETURN QUERY SELECT true, 999999, p.plan; RETURN;
  END IF;

  -- Free path: LIFETIME limit (no monthly reset). Reuses search_count_month
  -- as the lifetime counter for backward compatibility.
  IF p.search_count_month >= _free_limit THEN
    RETURN QUERY SELECT false, 0, p.plan; RETURN;
  END IF;
  UPDATE public.profiles SET search_count_month = search_count_month + 1 WHERE id = _user_id;
  RETURN QUERY SELECT true, _free_limit - (p.search_count_month + 1), p.plan;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_search_quota(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_search_quota(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_search_quota(uuid, integer) TO service_role;
-- Fix: recent security hardening revoked EXECUTE on public.consume_search_quota
-- from PUBLIC/authenticated, which broke every logged-in user's quota check.
-- The function is SECURITY DEFINER and only reads/updates the caller's own
-- profile (by _user_id), so granting EXECUTE to authenticated is safe.
REVOKE ALL ON FUNCTION public.consume_search_quota(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_search_quota(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_search_quota(uuid, integer) TO service_role;
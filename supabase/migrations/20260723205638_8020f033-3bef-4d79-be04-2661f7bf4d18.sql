
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'user');
CREATE TYPE public.user_plan AS ENUM ('free', 'pro');
CREATE TYPE public.user_status AS ENUM ('active', 'blocked');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  plan public.user_plan NOT NULL DEFAULT 'free',
  status public.user_status NOT NULL DEFAULT 'active',
  search_count_month integer NOT NULL DEFAULT 0,
  month_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HAS_ROLE (security definer, no recursion) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- ============ PLAN HISTORY ============
CREATE TABLE public.plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.user_plan NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.plan_history TO authenticated;
GRANT ALL ON public.plan_history TO service_role;
ALTER TABLE public.plan_history ENABLE ROW LEVEL SECURITY;

-- ============ ADMIN AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: PROFILES ============
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile limited" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Master updates any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Master deletes profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

-- ============ POLICIES: USER_ROLES ============
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- Only service_role (via edge/server) can INSERT/DELETE roles → nothing granted to authenticated.

-- ============ POLICIES: PLAN_HISTORY ============
CREATE POLICY "Users read own plan history" ON public.plan_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert plan history" ON public.plan_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- ============ POLICIES: ADMIN_AUDIT_LOG ============
CREATE POLICY "Master reads audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Admins write audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND
    (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'))
  );

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEARCH QUOTA HELPER ============
-- Called by server fn to atomically check + increment monthly search quota.
CREATE OR REPLACE FUNCTION public.consume_search_quota(_user_id uuid, _free_limit integer)
RETURNS TABLE(allowed boolean, remaining integer, plan public.user_plan)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN QUERY SELECT true, 999999, p.plan; RETURN;
  END IF;
  IF p.search_count_month >= _free_limit THEN
    RETURN QUERY SELECT false, 0, p.plan; RETURN;
  END IF;
  UPDATE public.profiles SET search_count_month = search_count_month + 1 WHERE id = _user_id;
  RETURN QUERY SELECT true, _free_limit - (p.search_count_month + 1), p.plan;
END; $$;

GRANT EXECUTE ON FUNCTION public.consume_search_quota(uuid, integer) TO authenticated;

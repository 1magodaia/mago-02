
-- 1. Função is_master() para validação centralizada e segura
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'contatosbot01@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated, service_role;

-- 2. Hardening da tabela leads
-- Remover acesso público total
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.leads;
DROP POLICY IF EXISTS "Leads: usuários veem seus próprios leads ou master vê tudo" ON public.leads;

CREATE POLICY "Leads: usuários veem seus próprios leads ou master vê tudo"
ON public.leads
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Leads: usuários inserem seus próprios leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Leads: usuários deletam seus próprios leads"
ON public.leads
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_master(auth.uid()));

-- Garantir que anon NÃO tenha SELECT na tabela base leads (apenas authenticated via política)
REVOKE ALL ON public.leads FROM anon;
GRANT SELECT, INSERT, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- 3. Hardening da tabela version_log (Auditoria)
ALTER TABLE public.version_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Version log: Master only" ON public.version_log;
CREATE POLICY "Version log: Master only"
ON public.version_log
FOR ALL
TO authenticated
USING (public.is_master(auth.uid()));

REVOKE ALL ON public.version_log FROM anon, authenticated;
GRANT SELECT ON public.version_log TO authenticated; -- A política USING filtrará apenas para Master
GRANT ALL ON public.version_log TO service_role;

-- 4. Hardening da tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User roles: Master vê tudo, users veem a si mesmos" ON public.user_roles;
CREATE POLICY "User roles: Master vê tudo, users veem a si mesmos"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_master(auth.uid()));

-- 5. Hardening da tabela admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log: Master only" ON public.admin_audit_log;
CREATE POLICY "Audit log: Master only"
ON public.admin_audit_log
FOR ALL
TO authenticated
USING (public.is_master(auth.uid()));

-- 6. Garantir que o usuário master tenha o papel 'master' atribuído
-- Nota: Isso é um fallback caso o bootstrapMaster do frontend não tenha rodado
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'contatosbot01@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'master')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

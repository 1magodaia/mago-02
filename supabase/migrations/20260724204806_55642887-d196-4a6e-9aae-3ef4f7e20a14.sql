CREATE OR REPLACE FUNCTION public.prevent_self_plan_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_privileged := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master');
  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.pro_access_mode IS DISTINCT FROM OLD.pro_access_mode
     OR NEW.pro_searches_remaining IS DISTINCT FROM OLD.pro_searches_remaining
     OR NEW.pro_valid_until IS DISTINCT FROM OLD.pro_valid_until
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.search_count_month IS DISTINCT FROM OLD.search_count_month
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Alteração de plano/acesso não permitida. Fale com o suporte.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_plan_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_self_plan_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_plan_escalation();

INSERT INTO public.version_log (version, description, impact, risk)
VALUES (
  'v5.9.0',
  E'Hero redesenhado com texto HTML real sobre a arte (nada mais pintado dentro da imagem). Removida estatística fixa "1.248 empresas encontradas" que não vinha de dado real. Extração de e-mail do site adicionada à auditoria e ao CSV. Correção de segurança: usuário comum não pode mais alterar próprio plano/status via UPDATE direto.',
  'alto',
  'baixo'
);
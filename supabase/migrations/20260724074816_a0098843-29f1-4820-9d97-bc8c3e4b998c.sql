ALTER TABLE public.ai_provider_keys
  ADD COLUMN IF NOT EXISTS secret_value text;

-- Só o service_role pode ler/escrever esse campo (a coluna já herda RLS existente da tabela,
-- mas o painel usa supabaseAdmin, então garantimos que o Data API público jamais devolva o valor).
REVOKE SELECT (secret_value) ON public.ai_provider_keys FROM authenticated, anon;
GRANT SELECT (secret_value), UPDATE (secret_value), INSERT (secret_value) ON public.ai_provider_keys TO service_role;

-- Torna o secret_name opcional (o assistente novo pode salvar direto no secret_value).
ALTER TABLE public.ai_provider_keys
  ALTER COLUMN secret_name DROP NOT NULL;
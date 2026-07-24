ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.ai_provider_keys DROP CONSTRAINT IF EXISTS ai_provider_keys_provider_check;
ALTER TABLE public.ai_provider_keys ADD CONSTRAINT ai_provider_keys_provider_check CHECK (provider IN ('openai','gemini','groq','lovable','anthropic','mistral','deepseek','xai','openrouter','perplexity','cohere','nvidia'));
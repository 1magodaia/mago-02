
CREATE TABLE public.whatsapp_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  old_whatsapp TEXT,
  new_whatsapp TEXT,
  old_message TEXT,
  new_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_change_log TO authenticated;
GRANT ALL ON public.whatsapp_change_log TO service_role;

ALTER TABLE public.whatsapp_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and masters can view whatsapp change log"
ON public.whatsapp_change_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

CREATE INDEX whatsapp_change_log_created_at_idx ON public.whatsapp_change_log (created_at DESC);

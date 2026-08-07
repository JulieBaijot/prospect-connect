CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  segment_cible text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_templates_select_authenticated ON public.email_templates
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY email_templates_insert_authenticated ON public.email_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY email_templates_update_authenticated ON public.email_templates
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY email_templates_delete_authenticated ON public.email_templates
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
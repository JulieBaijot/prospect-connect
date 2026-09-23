-- Accès réservé à la propriétaire du PRM.
-- Avant : toute session authentifiée (donc tout compte créé via l'inscription) avait accès à toutes les données.
-- Après : seul un user_id présent dans app_owner peut lire / écrire.

CREATE TABLE IF NOT EXISTS public.app_owner (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_owner FROM anon, authenticated;
GRANT ALL ON public.app_owner TO service_role;

-- Propriétaire initiale : le premier compte créé sur le projet.
INSERT INTO public.app_owner (user_id)
SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_owner WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_app_owner() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO authenticated;

DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['prospects','contacts','prospection_logs','integration_batches','api_search_runs','email_templates']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_app_owner()) WITH CHECK (public.is_app_owner())', t || '_owner_only', t);
  END LOOP;
END $$;

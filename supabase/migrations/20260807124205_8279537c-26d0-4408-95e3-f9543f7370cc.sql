GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospection_logs TO authenticated;
GRANT ALL ON public.prospection_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_batches TO authenticated;
GRANT ALL ON public.integration_batches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_search_runs TO authenticated;
GRANT ALL ON public.api_search_runs TO service_role;

REVOKE ALL ON public.prospects FROM anon;
REVOKE ALL ON public.contacts FROM anon;
REVOKE ALL ON public.prospection_logs FROM anon;
REVOKE ALL ON public.integration_batches FROM anon;
REVOKE ALL ON public.api_search_runs FROM anon;
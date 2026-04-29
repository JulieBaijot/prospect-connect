ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS batch_keyword TEXT,
ADD COLUMN IF NOT EXISTS external_source_id TEXT,
ADD COLUMN IF NOT EXISTS import_source TEXT,
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

CREATE TABLE IF NOT EXISTS public.api_search_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('pappers', 'insee', 'annuaire')),
  batch_keyword TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'en attente' CHECK (status IN ('en attente', 'en cours', 'terminé', 'erreur')),
  result_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospects_batch_keyword ON public.prospects (batch_keyword);
CREATE INDEX IF NOT EXISTS idx_prospects_external_source_id ON public.prospects (external_source_id);
CREATE INDEX IF NOT EXISTS idx_prospects_import_batch_id ON public.prospects (import_batch_id);
CREATE INDEX IF NOT EXISTS idx_api_search_runs_created_at ON public.api_search_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_search_runs_status ON public.api_search_runs (status);

ALTER TABLE public.api_search_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mono-utilisateur peut lire les recherches batch"
ON public.api_search_runs FOR SELECT
USING (true);

CREATE POLICY "Mono-utilisateur peut créer les recherches batch"
ON public.api_search_runs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut modifier les recherches batch"
ON public.api_search_runs FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut supprimer les recherches batch"
ON public.api_search_runs FOR DELETE
USING (true);

DROP TRIGGER IF EXISTS update_api_search_runs_updated_at ON public.api_search_runs;
CREATE TRIGGER update_api_search_runs_updated_at
BEFORE UPDATE ON public.api_search_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
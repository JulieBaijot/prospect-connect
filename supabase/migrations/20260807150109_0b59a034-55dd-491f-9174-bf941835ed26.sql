ALTER TABLE public.prospection_logs ADD COLUMN IF NOT EXISTS reached boolean;

ALTER TABLE public.prospection_logs DROP CONSTRAINT IF EXISTS prospection_logs_result_check;
ALTER TABLE public.prospection_logs ADD CONSTRAINT prospection_logs_result_check
  CHECK (result IS NULL OR result = ANY (ARRAY['NRP'::text, 'Pas dispo'::text, 'Barrage'::text, 'Échange'::text, 'RDV'::text]));
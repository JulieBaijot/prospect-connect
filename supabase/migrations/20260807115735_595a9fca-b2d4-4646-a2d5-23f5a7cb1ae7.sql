ALTER TABLE public.prospection_logs
  ADD COLUMN IF NOT EXISTS promise_text text,
  ADD COLUMN IF NOT EXISTS promise_date date,
  ADD COLUMN IF NOT EXISTS promise_kept boolean,
  ADD COLUMN IF NOT EXISTS template_used text;

CREATE INDEX IF NOT EXISTS prospection_logs_promise_date_idx
  ON public.prospection_logs (promise_date)
  WHERE promise_date IS NOT NULL AND promise_kept IS NOT TRUE;
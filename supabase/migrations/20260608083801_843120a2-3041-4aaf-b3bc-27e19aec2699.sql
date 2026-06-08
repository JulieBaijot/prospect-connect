ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS decision_maker text,
  ADD COLUMN IF NOT EXISTS employees_count text,
  ADD COLUMN IF NOT EXISTS social_links jsonb,
  ADD COLUMN IF NOT EXISTS icebreakers jsonb,
  ADD COLUMN IF NOT EXISTS additional_info text,
  ADD COLUMN IF NOT EXISTS average_rating numeric,
  ADD COLUMN IF NOT EXISTS reviews_count integer,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS enrichment_sources jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
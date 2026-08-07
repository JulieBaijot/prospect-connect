ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_category_check;
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_current_stage_check;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS category;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS current_stage;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
UPDATE public.prospects SET status = CASE status
  WHEN 'Tiède' THEN 'À qualifier'
  WHEN 'Chaud' THEN 'En contact'
  WHEN 'En attente' THEN 'Parké'
  ELSE status END;
ALTER TABLE public.prospects ALTER COLUMN status SET DEFAULT 'À qualifier';
ALTER TABLE public.prospects ADD CONSTRAINT prospects_status_check CHECK (status = ANY (ARRAY['À qualifier','En contact','En discussion','Parké','Converti','Perdu']));

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_offer_target_check;
UPDATE public.prospects SET offer_target = CASE offer_target
  WHEN 'SST FI' THEN 'SST'
  WHEN 'SST MAC' THEN 'SST'
  WHEN 'Formation SST' THEN 'SST'
  WHEN 'CSE-CSSCT' THEN 'SSCT / CSE'
  WHEN 'QVCT' THEN 'QVCT / RPS'
  WHEN 'Émotions' THEN 'Sur mesure'
  WHEN 'Excel' THEN 'Sur mesure'
  WHEN 'Conseil prévention' THEN 'Sur mesure'
  ELSE offer_target END;
ALTER TABLE public.prospects ALTER COLUMN offer_target SET DEFAULT 'SST';
ALTER TABLE public.prospects ADD CONSTRAINT prospects_offer_target_check CHECK (offer_target IS NULL OR offer_target = ANY (ARRAY['SST','DUERP','SSCT / CSE','QVCT / RPS','Sur mesure']));

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_headcount_range_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_headcount_range_check CHECK (headcount_range IS NULL OR headcount_range = ANY (ARRAY['1-9','10-19','20-49','50-99','100-199','200-249','250-499','500-999','1000+']));

ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS decision_level text NOT NULL DEFAULT 'inconnu';
ALTER TABLE public.prospects ADD CONSTRAINT prospects_decision_level_check CHECK (decision_level = ANY (ARRAY['site','groupe','inconnu']));
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS group_name text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS parking_trigger text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS parking_date date;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS last_contacted_at date;
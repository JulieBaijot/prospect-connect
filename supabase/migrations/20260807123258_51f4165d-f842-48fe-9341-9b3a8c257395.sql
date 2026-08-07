ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_offer_target_check;

UPDATE public.contacts SET offer_target = CASE offer_target
  WHEN 'Formation SST' THEN 'SST'
  WHEN 'SST FI' THEN 'SST'
  WHEN 'SST MAC' THEN 'SST'
  WHEN 'CSE-CSSCT' THEN 'SSCT / CSE'
  WHEN 'QVCT' THEN 'QVCT / RPS'
  WHEN 'Émotions' THEN 'Sur mesure'
  WHEN 'Excel' THEN 'Sur mesure'
  WHEN 'Conseil prévention' THEN 'Sur mesure'
  ELSE offer_target
END
WHERE offer_target IS NOT NULL;

ALTER TABLE public.contacts ADD CONSTRAINT contacts_offer_target_check
  CHECK (offer_target IS NULL OR offer_target = ANY (ARRAY['SST'::text, 'DUERP'::text, 'SSCT / CSE'::text, 'QVCT / RPS'::text, 'Sur mesure'::text]));
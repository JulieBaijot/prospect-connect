ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_category_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_category_check CHECK (category = ANY (ARRAY['A – Pilier'::text, 'B – Socle prévention'::text, 'B – Socle SST'::text, 'C – Porte d''entrée'::text, 'Récurrent'::text, 'Exceptionnel'::text]));

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_category_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_category_check CHECK (category IS NULL OR category = ANY (ARRAY['A – Pilier'::text, 'B – Socle prévention'::text, 'B – Socle SST'::text, 'C – Porte d''entrée'::text, 'Récurrent'::text, 'Exceptionnel'::text]));

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_offer_target_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_offer_target_check CHECK (offer_target IS NULL OR offer_target = ANY (ARRAY['Formation SST'::text, 'DUERP'::text, 'QVCT / RPS'::text, 'SSCT / CSE'::text, 'Conseil prévention'::text, 'Sur mesure'::text, 'SST FI'::text, 'SST MAC'::text, 'CSE-CSSCT'::text, 'QVCT'::text, 'Émotions'::text, 'Excel'::text]));

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_offer_target_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_offer_target_check CHECK (offer_target IS NULL OR offer_target = ANY (ARRAY['Formation SST'::text, 'DUERP'::text, 'QVCT / RPS'::text, 'SSCT / CSE'::text, 'Conseil prévention'::text, 'Sur mesure'::text, 'SST FI'::text, 'SST MAC'::text, 'CSE-CSSCT'::text, 'QVCT'::text, 'Émotions'::text, 'Excel'::text]));
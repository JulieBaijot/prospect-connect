ALTER TABLE public.prospects
ADD COLUMN segment text GENERATED ALWAYS AS (
  CASE
    WHEN headcount_range = '1-9' THEN 'Moins de 11'
    WHEN headcount_range = '10-19' THEN '11 à 24'
    WHEN headcount_range = '20-49' THEN '25 à 49'
    WHEN headcount_range IN ('50-99','100-199','200-249','250-499','500-999','1000+') THEN '50 et plus'
    ELSE NULL
  END
) STORED;
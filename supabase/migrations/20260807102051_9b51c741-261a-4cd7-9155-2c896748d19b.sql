create unique index if not exists uniq_contact_par_prospect
on public.contacts (prospect_id, lower(coalesce(first_name,'')), lower(coalesce(last_name,'')));
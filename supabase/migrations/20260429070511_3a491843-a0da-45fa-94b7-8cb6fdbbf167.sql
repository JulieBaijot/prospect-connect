CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  city TEXT,
  headcount_range TEXT CHECK (headcount_range IN ('10-19', '20-49', '50-99', '100-199', '200-249', '250-499', '500-999', '1000+')),
  category TEXT NOT NULL DEFAULT 'C – Porte d''entrée' CHECK (category IN ('A – Pilier', 'B – Socle SST', 'C – Porte d''entrée', 'Récurrent', 'Exceptionnel')),
  offer_target TEXT DEFAULT 'SST FI' CHECK (offer_target IN ('SST FI', 'SST MAC', 'CSE-CSSCT', 'QVCT', 'Émotions', 'Excel')),
  estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'J1' CHECK (current_stage IN ('J1', 'J2', 'J4', 'J6', 'J10', 'J15', 'J21')),
  status TEXT NOT NULL DEFAULT 'Tiède' CHECK (status IN ('Chaud', 'Tiède', 'En attente', 'Perdu', 'Converti')),
  next_action_date DATE,
  main_phone TEXT,
  website TEXT,
  address TEXT,
  reception_hours TEXT,
  comments TEXT,
  google_place_id TEXT,
  siren TEXT,
  naf_code TEXT,
  legal_status TEXT,
  source TEXT,
  sector TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role_title TEXT,
  main_phone TEXT,
  direct_phone TEXT,
  email TEXT,
  linkedin_url TEXT,
  maturity_level TEXT CHECK (maturity_level IS NULL OR maturity_level IN ('Pas joint', 'Intérêt', 'RDV', 'Devis', 'Décision', 'Pas de sujet', 'Intérêt à relancer')),
  offer_target TEXT CHECK (offer_target IS NULL OR offer_target IN ('SST FI', 'SST MAC', 'CSE-CSSCT', 'QVCT', 'Émotions', 'Excel')),
  estimated_value NUMERIC(12,2),
  category TEXT CHECK (category IS NULL OR category IN ('A – Pilier', 'B – Socle SST', 'C – Porte d''entrée', 'Récurrent', 'Exceptionnel')),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.prospection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'téléphone' CHECK (canal IN ('email', 'téléphone', 'physique')),
  stage TEXT CHECK (stage IS NULL OR stage IN ('J1', 'J2', 'J4', 'J6', 'J10', 'J15', 'J21')),
  objective TEXT,
  result TEXT CHECK (result IS NULL OR result IN ('NRP', 'Pas dispo', 'Échange', 'RDV')),
  notes TEXT,
  next_action_date DATE,
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_duration_minutes INTEGER,
  video_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.integration_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'annuaire' CHECK (source IN ('pappers', 'insee', 'annuaire')),
  current_step INTEGER NOT NULL DEFAULT 1,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'sauvegardé', 'importé')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_session_priority ON public.prospects (category, next_action_date, status);
CREATE INDEX idx_prospects_status ON public.prospects (status);
CREATE INDEX idx_prospects_category ON public.prospects (category);
CREATE INDEX idx_prospects_offer_target ON public.prospects (offer_target);
CREATE INDEX idx_prospects_city ON public.prospects (city);
CREATE INDEX idx_contacts_prospect_id ON public.contacts (prospect_id);
CREATE INDEX idx_logs_prospect_id ON public.prospection_logs (prospect_id);
CREATE INDEX idx_logs_action_date ON public.prospection_logs (action_date DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_batches_updated_at
BEFORE UPDATE ON public.integration_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mono-utilisateur peut lire les prospects"
ON public.prospects FOR SELECT
USING (true);

CREATE POLICY "Mono-utilisateur peut créer les prospects"
ON public.prospects FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut modifier les prospects"
ON public.prospects FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut supprimer les prospects"
ON public.prospects FOR DELETE
USING (true);

CREATE POLICY "Mono-utilisateur peut lire les contacts"
ON public.contacts FOR SELECT
USING (true);

CREATE POLICY "Mono-utilisateur peut créer les contacts"
ON public.contacts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut modifier les contacts"
ON public.contacts FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut supprimer les contacts"
ON public.contacts FOR DELETE
USING (true);

CREATE POLICY "Mono-utilisateur peut lire le journal"
ON public.prospection_logs FOR SELECT
USING (true);

CREATE POLICY "Mono-utilisateur peut créer le journal"
ON public.prospection_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut modifier le journal"
ON public.prospection_logs FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut supprimer le journal"
ON public.prospection_logs FOR DELETE
USING (true);

CREATE POLICY "Mono-utilisateur peut lire les intégrations"
ON public.integration_batches FOR SELECT
USING (true);

CREATE POLICY "Mono-utilisateur peut créer les intégrations"
ON public.integration_batches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut modifier les intégrations"
ON public.integration_batches FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Mono-utilisateur peut supprimer les intégrations"
ON public.integration_batches FOR DELETE
USING (true);
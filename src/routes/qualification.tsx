import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, CategoryBadge, PageTitle, fieldClass, labelClass } from "@/components/prm/ui";
import {
  dataQualityIssues,
  headcountRanges,
  loadProspects,
  offerTargets,
  prioritizeQualificationSession,
  suggestProspectCategory,
  updateProspect,
  type HeadcountRange,
  type OfferTarget,
  type Prospect,
  type ProspectWithRelations,
} from "@/lib/prm";
import { enrichCompany } from "@/server/prospect-search.functions";

export const Route = createFileRoute("/qualification")({
  head: () => ({
    meta: [
      { title: "Session qualification — PRM Santé-Sécurité" },
      { name: "description", content: "Session guidée pour compléter les fiches prospects." },
    ],
  }),
  component: () => (
    <AppLayout>
      <QualificationPage />
    </AppLayout>
  ),
});

type SocialLinks = { facebook?: string; instagram?: string; linkedin?: string };
type Icebreaker = {
  type?: string;
  title: string;
  source?: string;
  date?: string;
  url?: string;
};
type EnrichmentSources = {
  google_places?: { status: string; message?: string };
  perplexity?: { status: string; message?: string };
};

type FormState = {
  main_phone: string;
  website: string;
  address: string;
  reception_hours: string;
  google_place_id: string;
  siren: string;
  sector: string;
  headcount_range: HeadcountRange;
  offer_target: OfferTarget;
  comments: string;
  next_action_date: string;
  decision_maker: string;
  employees_count: string;
  additional_info: string;
  google_maps_url: string;
  average_rating: number | null;
  reviews_count: number | null;
  social_links: SocialLinks | null;
  icebreakers: Icebreaker[] | null;
  enrichment_sources: EnrichmentSources | null;
};

const blankForm: FormState = {
  main_phone: "",
  website: "",
  address: "",
  reception_hours: "",
  google_place_id: "",
  siren: "",
  sector: "",
  headcount_range: "20-49",
  offer_target: "Formation SST",
  comments: "",
  next_action_date: "",
  decision_maker: "",
  employees_count: "",
  additional_info: "",
  google_maps_url: "",
  average_rating: null,
  reviews_count: null,
  social_links: null,
  icebreakers: null,
  enrichment_sources: null,
};

function QualificationPage() {
  const runEnrichment = useServerFn(enrichCompany);
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [session, setSession] = useState<ProspectWithRelations[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(blankForm);

  const current = session[index];
  const issues = current ? dataQualityIssues(current) : [];
  const progress = session.length ? Math.round((Math.min(index + 1, session.length) / session.length) * 100) : 0;
  const autoCategory = useMemo(
    () =>
      current
        ? suggestProspectCategory({
            headcount_range: form.headcount_range,
            offer_target: form.offer_target,
            sector: form.sector,
            estimated_value: current.estimated_value,
            comments: form.comments,
            contactKnown: current.contacts.length > 0,
            history: current.prospection_logs,
          })
        : null,
    [current, form],
  );

  useEffect(() => {
    loadProspects().then((items) => {
      setProspects(items);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!current) return;
    setForm({
      main_phone: current.main_phone || "",
      website: current.website || "",
      address: current.address || "",
      reception_hours: current.reception_hours || "",
      google_place_id: current.google_place_id || "",
      siren: current.siren || "",
      sector: current.sector || "",
      headcount_range: current.headcount_range || "20-49",
      offer_target: current.offer_target || "Formation SST",
      comments: current.comments || "",
      next_action_date: current.next_action_date || "",
      decision_maker: current.decision_maker || "",
      employees_count: current.employees_count || "",
      additional_info: current.additional_info || "",
      google_maps_url: current.google_maps_url || "",
      average_rating: current.average_rating,
      reviews_count: current.reviews_count,
      social_links: current.social_links,
      icebreakers: current.icebreakers,
      enrichment_sources: current.enrichment_sources,
    });
    setMessage("");
  }, [current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowRight") nextCard();
      if (event.key === "ArrowLeft") previousCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function startSession() {
    setSession(prioritizeQualificationSession(prospects, 20));
    setIndex(0);
    setDone(0);
  }

  function nextCard() {
    setIndex((prev) => Math.min(prev + 1, session.length));
  }

  function previousCard() {
    setIndex((prev) => Math.max(0, prev - 1));
  }

  async function enrichCurrent() {
    if (!current || busy) return;
    setBusy(true);
    setMessage("Recherche en cours sur Google Places et Perplexity…");
    try {
      const result = await runEnrichment({
        data: {
          name: current.company_name,
          city: current.city || "",
          activity: current.sector || undefined,
          address: current.address || undefined,
        },
      });
      if (result.status === "missing_key") {
        setMessage("Aucune clé d'enrichissement configurée.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        // Anti-écrasement : on ne remplit que les champs vides.
        main_phone: prev.main_phone || result.phone || "",
        website: prev.website || result.website || "",
        address: prev.address || result.address || "",
        reception_hours: prev.reception_hours || result.hours || "",
        google_place_id: prev.google_place_id || result.placeId || "",
        google_maps_url: prev.google_maps_url || result.google_maps_url || "",
        average_rating: prev.average_rating ?? result.average_rating ?? null,
        reviews_count: prev.reviews_count ?? result.reviews_count ?? null,
        decision_maker: prev.decision_maker || result.decision_maker || "",
        employees_count: prev.employees_count || result.employees_count || "",
        additional_info: prev.additional_info || result.additional_info || "",
        social_links: prev.social_links || result.social_links || null,
        icebreakers: prev.icebreakers && prev.icebreakers.length ? prev.icebreakers : result.icebreakers || null,
        enrichment_sources: result.sources,
      }));
      if (result.status === "not_found") {
        setMessage("Aucune information trouvée pour ce prospect.");
      } else if (result.status === "partial") {
        setMessage("Enrichissement partiel : une des deux sources a échoué (voir le détail ci-dessous).");
      } else {
        setMessage("Enrichissement réussi : vérifiez puis sauvegardez.");
      }
    } catch {
      setMessage("Erreur réseau pendant l'enrichissement.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    if (!current || busy) return;
    setBusy(true);
    const patch: Partial<Prospect> = {
      main_phone: form.main_phone,
      website: form.website,
      address: form.address,
      reception_hours: form.reception_hours,
      google_place_id: form.google_place_id,
      siren: form.siren,
      sector: form.sector,
      headcount_range: form.headcount_range,
      offer_target: form.offer_target,
      comments: form.comments,
      next_action_date: form.next_action_date || null,
      decision_maker: form.decision_maker || null,
      employees_count: form.employees_count || null,
      additional_info: form.additional_info || null,
      google_maps_url: form.google_maps_url || null,
      average_rating: form.average_rating,
      reviews_count: form.reviews_count,
      social_links: form.social_links,
      icebreakers: form.icebreakers,
      enrichment_sources: form.enrichment_sources,
    };
    if (form.enrichment_sources) {
      (patch as Partial<Prospect> & { enriched_at?: string }).enriched_at = new Date().toISOString();
    }
    if (autoCategory && current.category === "C – Porte d'entrée") patch.category = autoCategory.category;
    await updateProspect(current.id, patch);
    setDone((prev) => Math.min(prev + 1, session.length));
    setBusy(false);
    nextCard();
  }

  return (
    <>
      <PageTitle
        title="Session de qualification"
        subtitle="Compléter une pile de 20 fiches maximum, une fiche à la fois."
        action={
          <Button onClick={startSession} disabled={loading || prospects.length === 0}>
            Commencer la session
          </Button>
        }
      />
      {!session.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading ? "Chargement des prospects…" : "Démarrez une session pour charger les fiches à compléter."}
        </Card>
      ) : index >= session.length ? (
        <Card className="p-8">
          <h3 className="text-[16px] font-medium">Session terminée</h3>
          <p className="mt-2 text-sm text-muted-foreground">{done} fiche(s) sauvegardée(s).</p>
          <Button className="mt-5" onClick={startSession}>Nouvelle session</Button>
        </Card>
      ) : current ? (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="p-4">
            <p className={labelClass}>Progression</p>
            <div className="mt-3 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm">{Math.min(index + 1, session.length)}/{session.length} fiches</p>
            <div className="mt-4 h-16">
              {session.slice(index, Math.min(index + 4, session.length)).map((item, stackIndex) => (
                <div key={item.id} className="h-3 rounded-md border border-border bg-card shadow-sm" style={{ width: `${100 - stackIndex * 8}%`, transform: `translateY(-${stackIndex * 2}px)`, opacity: 1 - stackIndex * 0.18 }} />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{done} fiche(s) sauvegardée(s)</p>
          </Card>
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h3 className="text-[22px] font-medium">{current.company_name}</h3>
                <p className="text-sm text-muted-foreground">{current.city || "Ville à compléter"} · {issues.join(" · ") || "Fiche complète"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="neutral" onClick={previousCard} disabled={index === 0 || busy} className="px-3"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="neutral" onClick={nextCard} disabled={busy} className="px-3"><ChevronRight className="h-4 w-4" /></Button>
                <CategoryBadge category={autoCategory?.category || current.category} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Téléphone" value={form.main_phone} onChange={(value) => setForm((prev) => ({ ...prev, main_phone: value }))} />
              <Field label="Site web" value={form.website} onChange={(value) => setForm((prev) => ({ ...prev, website: value }))} />
              <Field label="SIREN" value={form.siren} onChange={(value) => setForm((prev) => ({ ...prev, siren: value }))} />
              <Field label="Secteur" value={form.sector} onChange={(value) => setForm((prev) => ({ ...prev, sector: value }))} />
              <label className="grid gap-2 text-sm">
                <span className={labelClass}>Effectif</span>
                <select className={fieldClass} value={form.headcount_range} onChange={(e) => setForm((prev) => ({ ...prev, headcount_range: e.target.value as HeadcountRange }))}>
                  {headcountRanges.map((range) => <option key={range}>{range}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className={labelClass}>Offre</span>
                <select className={fieldClass} value={form.offer_target} onChange={(e) => setForm((prev) => ({ ...prev, offer_target: e.target.value as OfferTarget }))}>
                  {offerTargets.map((offer) => <option key={offer}>{offer}</option>)}
                </select>
              </label>
              <Field label="Prochaine action" type="date" value={form.next_action_date} onChange={(value) => setForm((prev) => ({ ...prev, next_action_date: value }))} />
              <Field label="Adresse" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
              <Field label="Décideur" value={form.decision_maker} onChange={(value) => setForm((prev) => ({ ...prev, decision_maker: value }))} />
              <Field label="Effectif estimé" value={form.employees_count} onChange={(value) => setForm((prev) => ({ ...prev, employees_count: value }))} />
            </div>
            <label className="mt-3 grid gap-2 text-sm">
              <span className={labelClass}>Horaires accueil</span>
              <textarea className={`${fieldClass} min-h-20 py-2`} value={form.reception_hours} onChange={(e) => setForm((prev) => ({ ...prev, reception_hours: e.target.value }))} />
            </label>
            <label className="mt-3 grid gap-2 text-sm">
              <span className={labelClass}>Commentaires</span>
              <textarea className={`${fieldClass} min-h-24 py-2`} value={form.comments} onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))} />
            </label>

            <EnrichmentPanel form={form} />

            {message ? <p className="mt-4 rounded-lg bg-script p-3 text-sm">{message}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="neutral" onClick={enrichCurrent} disabled={busy}><Wand2 className="mr-2 h-4 w-4" />Enrichir</Button>
              <Button onClick={saveAndNext} disabled={busy}>Sauvegarder et passer</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className={labelClass}>{label}</span>
      <input className={fieldClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function statusDotClass(status?: string) {
  if (status === "ok") return "bg-action-meeting";
  if (status === "error") return "bg-action-nrp";
  return "bg-muted";
}

function EnrichmentPanel({ form }: { form: FormState }) {
  const sources = form.enrichment_sources;
  const hasEnriched =
    sources ||
    form.average_rating != null ||
    form.icebreakers?.length ||
    form.social_links ||
    form.additional_info ||
    form.google_maps_url;
  if (!hasEnriched) return null;

  return (
    <div className="mt-5 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Données enrichies</p>
        {sources ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${statusDotClass(sources.google_places?.status)}`} />
              Google Places{sources.google_places?.message ? ` — ${sources.google_places.message}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${statusDotClass(sources.perplexity?.status)}`} />
              Perplexity{sources.perplexity?.message ? ` — ${sources.perplexity.message}` : ""}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {form.average_rating != null ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 text-action-callback" />
            {form.average_rating.toFixed(1)}
            {form.reviews_count != null ? ` (${form.reviews_count} avis)` : ""}
          </span>
        ) : null}
        {form.google_maps_url ? (
          <a className="inline-flex items-center gap-1 text-primary underline" href={form.google_maps_url} target="_blank" rel="noreferrer">
            Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {form.social_links?.linkedin ? (
          <a className="text-primary underline" href={form.social_links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        ) : null}
        {form.social_links?.facebook ? (
          <a className="text-primary underline" href={form.social_links.facebook} target="_blank" rel="noreferrer">Facebook</a>
        ) : null}
        {form.social_links?.instagram ? (
          <a className="text-primary underline" href={form.social_links.instagram} target="_blank" rel="noreferrer">Instagram</a>
        ) : null}
      </div>

      {form.additional_info ? (
        <p className="mt-3 text-sm text-muted-foreground">{form.additional_info}</p>
      ) : null}

      {form.icebreakers?.length ? (
        <div className="mt-3 grid gap-2">
          <p className={labelClass}>Icebreakers</p>
          {form.icebreakers.map((item, i) => (
            <div key={i} className="rounded-md border border-border bg-background p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                {item.type ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {item.type}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[item.source, item.date].filter(Boolean).join(" · ")}
                {item.url ? (
                  <>
                    {" · "}
                    <a className="text-primary underline" href={item.url} target="_blank" rel="noreferrer">Lien</a>
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

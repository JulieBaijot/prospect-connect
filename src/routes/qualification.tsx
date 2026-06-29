import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Trash2, UserX, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, CategoryBadge, PageTitle, fieldClass, labelClass } from "@/components/prm/ui";
import {
  dataQualityIssues,
  deleteProspect,
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
import { enrichCompany } from "@/lib/prospect-search.functions";

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
  main_email: string;
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

const STORAGE_KEY = "prm.qualification.session.v1";

function initialFormFor(prospect: ProspectWithRelations): FormState {
  return {
    main_phone: prospect.main_phone || "",
    main_email: prospect.main_email || prospect.contacts[0]?.email || "",
    website: prospect.website || "",
    address: prospect.address || "",
    reception_hours: prospect.reception_hours || "",
    google_place_id: prospect.google_place_id || "",
    siren: prospect.siren || "",
    sector: prospect.sector || "",
    headcount_range: prospect.headcount_range || "20-49",
    offer_target: prospect.offer_target || "Formation SST",
    comments: prospect.comments || "",
    next_action_date: prospect.next_action_date || "",
    decision_maker: prospect.decision_maker || "",
    employees_count: prospect.employees_count || "",
    additional_info: prospect.additional_info || "",
    google_maps_url: prospect.google_maps_url || "",
    average_rating: prospect.average_rating,
    reviews_count: prospect.reviews_count,
    social_links: prospect.social_links,
    icebreakers: prospect.icebreakers,
    enrichment_sources: prospect.enrichment_sources,
  };
}

type StoredSession = {
  ids: string[];
  index: number;
  done: number;
  completedIds: string[];
  drafts: Record<string, FormState>;
};

function loadStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function QualificationPage() {
  const runEnrichment = useServerFn(enrichCompany);
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [session, setSession] = useState<ProspectWithRelations[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const draftsRef = useRef<Record<string, FormState>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  const current = session[index];
  const issues = current ? dataQualityIssues(current) : [];
  const progress = session.length ? Math.round((Math.min(index + 1, session.length) / session.length) * 100) : 0;
  const autoCategory = useMemo(
    () =>
      current && form
        ? suggestProspectCategory({
            headcount_range: form.headcount_range,
            offer_target: form.offer_target,
            sector: form.sector,
            estimated_value: current.estimated_value,
            comments: form.comments,
            contactKnown: current.contacts.length > 0 || Boolean(form.main_email),
            history: current.prospection_logs,
          })
        : null,
    [current, form],
  );

  // Charger prospects et détecter session sauvegardée
  useEffect(() => {
    loadProspects().then((items) => {
      setProspects(items);
      setLoading(false);
      const stored = loadStored();
      if (stored && stored.ids.length) setHasStoredSession(true);
    });
  }, []);

  // À chaque changement de prospect : charger draft existant ou form vierge
  useEffect(() => {
    if (!current) {
      setForm(null);
      return;
    }
    const draft = draftsRef.current[current.id];
    setForm(draft || initialFormFor(current));
    setMessage("");
  }, [current]);

  // Sauvegarder draft à chaque édition du form
  useEffect(() => {
    if (!current || !form) return;
    draftsRef.current[current.id] = form;
  }, [current, form]);

  // Persister la session dans localStorage
  const persistSession = useCallback(
    (override?: Partial<StoredSession>) => {
      if (!session.length) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const payload: StoredSession = {
        ids: session.map((p) => p.id),
        index,
        done,
        completedIds,
        drafts: draftsRef.current,
        ...override,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    [session, index, done, completedIds],
  );

  useEffect(() => {
    persistSession();
  }, [persistSession]);

  function startSession(reset = true) {
    const pile = prioritizeQualificationSession(prospects, 20);
    setSession(pile);
    setIndex(0);
    setDone(0);
    setCompletedIds([]);
    if (reset) draftsRef.current = {};
    setHasStoredSession(false);
  }

  function resumeSession() {
    const stored = loadStored();
    if (!stored) return;
    // Conserve l'ordre stocké, filtre les prospects qui existent encore
    const byId = new Map(prospects.map((p) => [p.id, p]));
    const restored = stored.ids.map((id) => byId.get(id)).filter(Boolean) as ProspectWithRelations[];
    if (!restored.length) {
      localStorage.removeItem(STORAGE_KEY);
      setHasStoredSession(false);
      return;
    }
    draftsRef.current = stored.drafts || {};
    setSession(restored);
    setCompletedIds(stored.completedIds || []);
    setDone(stored.done || 0);
    setIndex(Math.min(stored.index || 0, restored.length));
    setHasStoredSession(false);
  }

  function nextCard() {
    setIndex((prev) => Math.min(prev + 1, session.length));
  }

  function previousCard() {
    setIndex((prev) => Math.max(0, prev - 1));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowRight") nextCard();
      if (event.key === "ArrowLeft") previousCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function enrichCurrent() {
    if (!current || !form || busy) return;
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
      setForm((prev) =>
        prev
          ? {
              ...prev,
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
              icebreakers:
                prev.icebreakers && prev.icebreakers.length ? prev.icebreakers : result.icebreakers || null,
              enrichment_sources: result.sources,
            }
          : prev,
      );
      if (result.status === "not_found") setMessage("Aucune information trouvée pour ce prospect.");
      else if (result.status === "partial")
        setMessage("Enrichissement partiel : une des deux sources a échoué (voir le détail ci-dessous).");
      else setMessage("Enrichissement réussi : vérifiez puis sauvegardez.");
    } catch {
      setMessage("Erreur réseau pendant l'enrichissement.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    if (!current || !form || busy) return;
    setBusy(true);
    const patch: Partial<Prospect> = {
      main_phone: form.main_phone,
      main_email: form.main_email || null,
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
    if (!completedIds.includes(current.id)) {
      setCompletedIds((prev) => [...prev, current.id]);
      setDone((prev) => Math.min(prev + 1, session.length));
    }
    setBusy(false);
    nextCard();
  }

  async function discardCurrent() {
    if (!current || busy) return;
    if (!window.confirm(`Écarter "${current.company_name}" (statut Perdu) ?`)) return;
    setBusy(true);
    await updateProspect(current.id, { status: "Perdu", comments: form?.comments || current.comments });
    removeCurrentFromSession();
    setBusy(false);
  }

  async function removeCurrent() {
    if (!current || busy) return;
    if (!window.confirm(`Supprimer définitivement "${current.company_name}" ? Cette action est irréversible.`)) return;
    setBusy(true);
    await deleteProspect(current.id);
    removeCurrentFromSession();
    setBusy(false);
  }

  function removeCurrentFromSession() {
    if (!current) return;
    const removedId = current.id;
    setSession((prev) => prev.filter((p) => p.id !== removedId));
    setProspects((prev) => prev.filter((p) => p.id !== removedId));
    delete draftsRef.current[removedId];
    // l'index reste, le suivant prend la place
    setIndex((prev) => Math.min(prev, session.length - 2));
  }

  return (
    <>
      <PageTitle
        title="Session de qualification"
        subtitle="Compléter une pile de 20 fiches maximum, une fiche à la fois."
        action={
          <div className="flex gap-2">
            {hasStoredSession && !session.length ? (
              <Button variant="neutral" onClick={resumeSession} disabled={loading}>
                Reprendre la session
              </Button>
            ) : null}
            <Button onClick={() => startSession(true)} disabled={loading || prospects.length === 0}>
              {session.length ? "Nouvelle session" : "Commencer la session"}
            </Button>
          </div>
        }
      />
      {!session.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading
            ? "Chargement des prospects…"
            : hasStoredSession
              ? "Une session précédente est en attente — reprenez-la ou démarrez une nouvelle pile."
              : "Démarrez une session pour charger les fiches à compléter."}
        </Card>
      ) : index >= session.length ? (
        <Card className="p-8">
          <h3 className="text-[16px] font-medium">Session terminée</h3>
          <p className="mt-2 text-sm text-muted-foreground">{done} fiche(s) sauvegardée(s).</p>
          <Button
            className="mt-5"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              startSession(true);
            }}
          >
            Nouvelle session
          </Button>
        </Card>
      ) : current && form ? (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="p-4">
            <p className={labelClass}>Progression</p>
            <div className="mt-3 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm">
              {Math.min(index + 1, session.length)}/{session.length} fiches
            </p>
            <div className="mt-4 h-16">
              {session.slice(index, Math.min(index + 4, session.length)).map((item, stackIndex) => (
                <div
                  key={item.id}
                  className="h-3 rounded-md border border-border bg-card shadow-sm"
                  style={{
                    width: `${100 - stackIndex * 8}%`,
                    transform: `translateY(-${stackIndex * 2}px)`,
                    opacity: 1 - stackIndex * 0.18,
                  }}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{done} fiche(s) sauvegardée(s)</p>
            <p className="mt-1 text-xs text-muted-foreground">Session reprise auto. si vous quittez la page.</p>
          </Card>
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h3 className="text-[22px] font-medium">{current.company_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {current.city || "Ville à compléter"} · {issues.join(" · ") || "Fiche complète"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neutral"
                  onClick={previousCard}
                  disabled={index === 0 || busy}
                  className="px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="neutral" onClick={nextCard} disabled={busy} className="px-3">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <CategoryBadge category={autoCategory?.category || current.category} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Téléphone" value={form.main_phone} onChange={(value) => setForm((prev) => prev && { ...prev, main_phone: value })} />
              <Field label="Email" type="email" value={form.main_email} onChange={(value) => setForm((prev) => prev && { ...prev, main_email: value })} />
              <Field label="Site web" value={form.website} onChange={(value) => setForm((prev) => prev && { ...prev, website: value })} />
              <Field label="SIRET" value={form.siren} onChange={(value) => setForm((prev) => prev && { ...prev, siren: value })} />
              <Field label="Secteur" value={form.sector} onChange={(value) => setForm((prev) => prev && { ...prev, sector: value })} />
              <label className="grid gap-2 text-sm">
                <span className={labelClass}>Effectif</span>
                <select
                  className={fieldClass}
                  value={form.headcount_range}
                  onChange={(e) => setForm((prev) => prev && { ...prev, headcount_range: e.target.value as HeadcountRange })}
                >
                  {headcountRanges.map((range) => (
                    <option key={range}>{range}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className={labelClass}>Offre</span>
                <select
                  className={fieldClass}
                  value={form.offer_target}
                  onChange={(e) => setForm((prev) => prev && { ...prev, offer_target: e.target.value as OfferTarget })}
                >
                  {offerTargets.map((offer) => (
                    <option key={offer}>{offer}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Prochaine action"
                type="date"
                value={form.next_action_date}
                onChange={(value) => setForm((prev) => prev && { ...prev, next_action_date: value })}
              />
              <Field label="Adresse" value={form.address} onChange={(value) => setForm((prev) => prev && { ...prev, address: value })} />
              <Field label="Décideur" value={form.decision_maker} onChange={(value) => setForm((prev) => prev && { ...prev, decision_maker: value })} />
              <Field label="Effectif estimé" value={form.employees_count} onChange={(value) => setForm((prev) => prev && { ...prev, employees_count: value })} />
            </div>
            <label className="mt-3 grid gap-2 text-sm">
              <span className={labelClass}>Horaires accueil</span>
              <textarea
                className={`${fieldClass} min-h-20 py-2`}
                value={form.reception_hours}
                onChange={(e) => setForm((prev) => prev && { ...prev, reception_hours: e.target.value })}
              />
            </label>
            <label className="mt-3 grid gap-2 text-sm">
              <span className={labelClass}>Commentaires</span>
              <textarea
                className={`${fieldClass} min-h-24 py-2`}
                value={form.comments}
                onChange={(e) => setForm((prev) => prev && { ...prev, comments: e.target.value })}
              />
            </label>

            <EnrichmentPanel form={form} />

            {message ? <p className="mt-4 rounded-lg bg-script p-3 text-sm">{message}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="neutral" onClick={enrichCurrent} disabled={busy}>
                <Wand2 className="mr-2 h-4 w-4" />
                Enrichir
              </Button>
              <Button onClick={saveAndNext} disabled={busy}>
                Sauvegarder et passer
              </Button>
              <Button variant="neutral" onClick={discardCurrent} disabled={busy} className="ml-auto">
                <UserX className="mr-2 h-4 w-4" />
                Écarter
              </Button>
              <Button variant="neutral" onClick={removeCurrent} disabled={busy}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className={labelClass}>{label}</span>
      <input
        className={fieldClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={form.google_maps_url}
            target="_blank"
            rel="noreferrer"
          >
            Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {form.social_links?.linkedin ? (
          <a className="text-primary underline" href={form.social_links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        ) : null}
        {form.social_links?.facebook ? (
          <a className="text-primary underline" href={form.social_links.facebook} target="_blank" rel="noreferrer">
            Facebook
          </a>
        ) : null}
        {form.social_links?.instagram ? (
          <a className="text-primary underline" href={form.social_links.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        ) : null}
      </div>

      {form.additional_info ? <p className="mt-3 text-sm text-muted-foreground">{form.additional_info}</p> : null}

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
                    <a className="text-primary underline" href={item.url} target="_blank" rel="noreferrer">
                      Lien
                    </a>
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

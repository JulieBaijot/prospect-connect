import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
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

const blankForm = {
  main_phone: "",
  website: "",
  address: "",
  siren: "",
  sector: "",
  headcount_range: "20-49" as HeadcountRange,
  offer_target: "Formation SST" as OfferTarget,
  comments: "",
  next_action_date: "",
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
  const [form, setForm] = useState(blankForm);

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
      siren: current.siren || "",
      sector: current.sector || "",
      headcount_range: current.headcount_range || "20-49",
      offer_target: current.offer_target || "Formation SST",
      comments: current.comments || "",
      next_action_date: current.next_action_date || "",
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
    setMessage("Recherche en cours…");
    try {
      const place = await runEnrichment({ data: { name: current.company_name, city: current.city || "" } });
      if (place.status !== "found") {
        setMessage("Aucun enrichissement automatique trouvé.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        main_phone: place.phone || prev.main_phone,
        website: place.website || prev.website,
        address: place.address || prev.address,
      }));
      setMessage("Informations trouvées : vérifiez puis sauvegardez.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    if (!current || busy) return;
    setBusy(true);
    const patch: Partial<Prospect> = {
      ...form,
      next_action_date: form.next_action_date || null,
    };
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
            </div>
            <label className="mt-3 grid gap-2 text-sm">
              <span className={labelClass}>Commentaires</span>
              <textarea className={`${fieldClass} min-h-24 py-2`} value={form.comments} onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))} />
            </label>
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
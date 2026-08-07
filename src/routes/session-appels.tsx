import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import {
  Button,
  Card,
  PageTitle,
  SegmentBadge,
  StatusBadge,
  fieldClass,
  labelClass,
} from "@/components/prm/ui";
import {
  addLog,
  reachedFromResult,
  buildCalendarUrl,
  callScript,
  contactName,
  dataQualityIssues,
  emailTemplates,
  enforceCallbackRule,
  formatDate,
  formatEtape,
  formatEuro,
  headcountRanges,
  loadProspects,
  minCallbackDate,
  offerTargets,
  prioritizeCallSession,
  prochaineEtape,
  sessionReason,
  shortDateTime,
  situationOptions,
  statuses,
  updateProspect,
  type Canal,
  type Etape,
  type Prospect,
  type ProspectStatus,
  type ProspectWithRelations,
  type Situation,
} from "@/lib/prm";



export const Route = createFileRoute("/session-appels")({
  head: () => ({
    meta: [
      { title: "Session d'appels — PRM Santé-Sécurité" },
      { name: "description", content: "Cockpit desktop pour appeler les prospects santé-sécurité." },
    ],
  }),
  component: SessionRoute,
});

type Mode = "idle" | "form" | "meeting";

const situationByKey = new Map(situationOptions.map((option) => [option.key, option]));


function SessionRoute() {
  return (
    <AppLayout>
      <SessionPage />
    </AppLayout>
  );
}

function SessionPage() {
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [session, setSession] = useState<ProspectWithRelations[]>([]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ nrp: 0, rdv: 0, exchanges: 0, done: 0 });
  const [callbackDate, setCallbackDate] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [videoLink, setVideoLink] = useState("");
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [etape, setEtape] = useState<Etape | null>(null);
  const [motif, setMotif] = useState("");
  const [overrideAction, setOverrideAction] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<ProspectStatus | "">("");
  /** Surcharge manuelle de « quelqu'un a décroché » ; null = valeur déduite du résultat. */
  const [reachedManual, setReachedManual] = useState<boolean | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canal, setCanal] = useState<Canal>("téléphone");
  const [templateUsed, setTemplateUsed] = useState("");
  const [promiseText, setPromiseText] = useState("");
  const [promiseDate, setPromiseDate] = useState("");

  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [sessionSize, setSessionSize] = useState(3);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Prospect>>({});
  const [editSaving, setEditSaving] = useState(false);

  const current = session[index];
  const contact =
    current?.contacts.find((item) => item.id === activeContactId) || current?.contacts[0];
  const selectedSituation = situation ? situationByKey.get(situation) : null;
  const progress = session.length ? Math.round(((Math.min(index + 1, session.length)) / session.length) * 100) : 0;

  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      const shortcut = Number(event.key);
      if (shortcut >= 1 && shortcut <= situationOptions.length) {
        selectSituation(situationOptions[shortcut - 1].key);
      }
      if (event.key === "ArrowRight") nextCard();
      if (event.key === "ArrowLeft") previousCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function refresh() {
    setLoading(true);
    setProspects(await loadProspects());
    setLoading(false);
  }

  function launch(list: ProspectWithRelations[]) {
    if (!list.length) return;
    setSession(list);
    setIndex(0);
    setSummary({ nrp: 0, rdv: 0, exchanges: 0, done: 0 });
    resetCardState();
  }

  function startSession() {
    launch(prioritizeCallSession(prospects, sessionSize));
  }

  function suggestPicks() {
    const suggestions = prioritizeCallSession(prospects, sessionSize).map((p) => p.id);
    setPickedIds(suggestions);
  }

  function togglePick(id: string) {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function startFromSelection() {
    const map = new Map(prospects.map((p) => [p.id, p]));
    launch(pickedIds.map((id) => map.get(id)).filter(Boolean) as ProspectWithRelations[]);
  }

  function resetCardState() {
    setMode("idle");
    setNotes("");
    setCallbackDate("");
    setMeetingDate("");
    setVideoLink("");
    setMessage("");
    setCanal("téléphone");
    setTemplateUsed("");
    setPromiseText("");
    setPromiseDate("");
    setActiveContactId(null);
    setSituation(null);
    setEtape(null);
    setMotif("");
    setOverrideAction("");
    setOverrideStatus("");
    setEditOpen(false);
    setEditForm({});
  }


  function nextCard() {
    resetCardState();
    setIndex((prev) => prev + 1);
  }

  function previousCard() {
    resetCardState();
    setIndex((prev) => Math.max(0, prev - 1));
  }

  function markDoneAndNext() {
    setSummary((prev) => ({ ...prev, done: Math.min(prev.done + 1, session.length) }));
    nextCard();
  }

  /** Applique automatiquement la table de décision, la proposition restant modifiable. */
  function selectSituation(key: Situation, dateSaisie?: string) {
    if (!current) return;
    const proposal = prochaineEtape(current, { situation: key, dateSaisie });
    setSituation(key);
    setEtape(proposal);
    setMessage("");
    setOverrideAction(proposal.action);
    setOverrideStatus(proposal.status || current.status);
    setCanal(proposal.canal || "téléphone");
    setCallbackDate(proposal.date);
    setMode(key === "rdv" ? "meeting" : "form");
  }

  /** Recalcule la proposition quand le prospect donne une date (parking, promesse, RDV). */
  function refreshEtape(dateSaisie: string) {
    if (!current || !situation) return;
    const proposal = prochaineEtape(current, { situation, dateSaisie });
    setEtape(proposal);
    setCallbackDate(proposal.date);
  }

  function openQuickEdit() {
    if (!current) return;
    setEditForm({
      company_name: current.company_name,
      city: current.city,
      sector: current.sector,
      main_phone: current.main_phone,
      main_email: current.main_email,
      website: current.website,
      decision_maker: current.decision_maker,
      headcount_range: current.headcount_range,
      offer_target: current.offer_target,
      estimated_value: current.estimated_value,
      comments: current.comments,
    });
    setEditOpen(true);
  }

  function patchLocal(id: string, patch: Partial<Prospect>) {
    setSession((prev) =>
      prev.map((item) => (item.id === id ? ({ ...item, ...patch } as ProspectWithRelations) : item)),
    );
    setProspects((prev) =>
      prev.map((item) => (item.id === id ? ({ ...item, ...patch } as ProspectWithRelations) : item)),
    );
  }

  async function saveQuickEdit() {
    if (!current) return;
    setEditSaving(true);
    try {
      await updateProspect(current.id, editForm);
      patchLocal(current.id, editForm);
      setEditOpen(false);
      setMessage("Fiche mise à jour.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Échec de la mise à jour.");
    }
    setEditSaving(false);
  }

  async function saveOutcome(
    options: { nextActionDate?: string; meetingAt?: string; customNotes?: string } = {},
  ) {
    const option = selectedSituation;
    if (!current || !option || !etape || busy) return;
    setBusy(true);
    setMessage("");
    const status = (overrideStatus || etape.status || current.status) as ProspectStatus;
    const action = overrideAction || etape.action;
    await addLog({
      prospect_id: current.id,
      contact_id: contact?.id,
      action_type: option.actionType,
      canal,
      stage: option.key,
      objective: action,
      result: option.result,
      notes: options.customNotes || notes || etape.raison,
      next_action_date: options.nextActionDate,
      meeting_date: options.meetingAt,
      meeting_duration_minutes: options.meetingAt ? duration : undefined,
      video_link: options.meetingAt ? videoLink : undefined,
      promise_text: promiseText || null,
      promise_date: promiseText ? promiseDate || null : null,
      promise_kept: null,
      template_used: canal === "email" ? templateUsed || null : null,
    });
    await updateProspect(current.id, {
      status,
      last_contacted_at: new Date().toISOString().slice(0, 10),
      next_action_date:
        status === "Perdu"
          ? null
          : (options.meetingAt || options.nextActionDate || etape.date).slice(0, 10),
      ...(etape.decision_level ? { decision_level: etape.decision_level } : {}),
      ...(status === "Parké"
        ? { parking_trigger: motif, parking_date: (options.nextActionDate || etape.date).slice(0, 10) }
        : {}),
    });
    if (option.result === "NRP") setSummary((prev) => ({ ...prev, nrp: prev.nrp + 1 }));
    if (option.result === "Échange") setSummary((prev) => ({ ...prev, exchanges: prev.exchanges + 1 }));
    if (option.result === "RDV") setSummary((prev) => ({ ...prev, rdv: prev.rdv + 1 }));
    setBusy(false);
    markDoneAndNext();
  }

  async function saveForm() {
    if (!etape) return;
    const status = (overrideStatus || etape.status || current?.status) as ProspectStatus;
    const isLost = status === "Perdu";
    if (!isLost && !callbackDate) {
      setMessage("Choisissez une prochaine date d'action pour garder la relance sous contrôle.");
      return;
    }
    if ((etape.motifRequis || status === "Parké") && !motif.trim()) {
      setMessage("« Parquer » exige un motif écrit : indiquez le déclencheur ou la raison.");
      return;
    }
    if (etape.promesseRequise && (!promiseText.trim() || !promiseDate)) {
      setMessage("Intérêt exprimé : saisissez la promesse et sa date d'échéance.");
      return;
    }
    if (promiseText && !promiseDate) {
      setMessage("Indiquez la date promise au prospect (ou effacez la promesse).");
      return;
    }
    if (!isLost && canal === "email" && callbackDate < minCallbackDate("email")) {
      setMessage("Email consigné : le rappel ne peut pas être le jour même — au plus tôt demain.");
      setCallbackDate(minCallbackDate("email"));
      return;
    }
    await saveOutcome({
      nextActionDate: callbackDate || undefined,
      customNotes: notes,
    });
  }

  function markLost() {
    selectSituation("refus");
    setOverrideStatus("Perdu");
    setNotes((prev) => prev || "Pas de besoin identifié — coordonnées envoyées pour rester en contact.");
  }

  function mailtoCoordinates() {
    const to = contact?.email || current?.main_email || "";
    const subject = encodeURIComponent("Mes coordonnées — santé & sécurité au travail");
    const body = encodeURIComponent(
      `Bonjour${contact ? " " + contactName(contact) : ""},\n\nSuite à notre échange, je vous laisse mes coordonnées : n'hésitez pas à me solliciter dès qu'un besoin en formation ou conseil santé-sécurité au travail se présente (SST, DUERP, QVCT, SSCT/CSE, sur mesure).\n\nBien cordialement,`,
    );
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
  }

  async function saveMeeting() {
    if (!current || !meetingDate || busy || !etape) return;
    window.open(
      buildCalendarUrl({ prospect: current, contact, date: meetingDate, duration, videoLink }),
      "_blank",
      "noopener,noreferrer",
    );
    await saveOutcome({ meetingAt: meetingDate, customNotes: notes || etape.raison });
  }


  const pickerList = prospects
    .filter((p) => !["Perdu", "Converti"].includes(p.status))
    .filter((p) =>
      pickerQuery.trim()
        ? `${p.company_name} ${p.city ?? ""} ${p.sector ?? ""}`
            .toLowerCase()
            .includes(pickerQuery.trim().toLowerCase())
        : true,
    )
    .slice(0, 60);

  return (
    <>
      <PageTitle
        title="Session d'appels"
        subtitle="Composez une session courte (3 prospects par défaut) manuellement ou laissez l'app suggérer."
        action={
          <Button onClick={startSession} disabled={loading || prospects.length === 0}>
            Session suggérée ({sessionSize})
          </Button>
        }
      />
      {!session.length ? (
        <Card className="p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement des prospects…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className={labelClass}>Taille de session</p>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={sessionSize}
                    onChange={(e) =>
                      setSessionSize(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className={`${fieldClass} mt-2 w-24`}
                  />
                </div>
                <Button variant="neutral" onClick={suggestPicks}>
                  Suggérer {sessionSize} prospects
                </Button>
                <Button onClick={startFromSelection} disabled={!pickedIds.length}>
                  Démarrer avec {pickedIds.length} sélectionné(s)
                </Button>
                {pickedIds.length ? (
                  <Button variant="neutral" onClick={() => setPickedIds([])}>
                    Vider
                  </Button>
                ) : null}
              </div>
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Rechercher une entreprise, une ville, un secteur…"
                className={`${fieldClass} mt-4 w-full`}
              />
              <div className="mt-3 grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                {pickerList.map((p) => {
                  const checked = pickedIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => togglePick(p.id)}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${checked ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"}`}
                    >
                      <div>
                        <p className="font-medium">{p.company_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.city || "Ville à compléter"} ·{" "}
                          {p.main_phone || p.contacts[0]?.direct_phone || "Téléphone à compléter"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={p.status} />
                      </div>
                    </button>
                  );
                })}
                {!pickerList.length ? (
                  <p className="text-sm text-muted-foreground">Aucun prospect trouvé.</p>
                ) : null}
              </div>
            </>
          )}
        </Card>
      ) : index >= session.length ? (

        <Card className="p-8">
          <h3 className="text-[16px] font-medium">Résumé de session</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Kpi label="Prospects traités" value={summary.done} />
            <Kpi label="NRP" value={summary.nrp} />
            <Kpi label="Échanges" value={summary.exchanges} />
            <Kpi label="RDV" value={summary.rdv} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setSession([]);
                setPickedIds([]);
              }}
            >
              Composer une nouvelle session
            </Button>
            <Button variant="neutral" onClick={startSession}>
              Session suggérée ({sessionSize})
            </Button>
          </div>

        </Card>
      ) : current ? (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <Card className="p-4">
            <p className={labelClass}>Progression</p>
            <div className="mt-3 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm">
              {Math.min(index + 1, session.length)}/{session.length} cartes
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
            <div className="mt-5 space-y-3">
              <Kpi label="NRP" value={summary.nrp} />
              <Kpi label="Échanges" value={summary.exchanges} />
              <Kpi label="RDV" value={summary.rdv} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div
              className={`h-2 ${current.status === "En contact" || current.status === "En discussion" ? "bg-status-hot" : current.status === "À qualifier" ? "bg-status-warm" : current.status === "Converti" ? "bg-status-won" : "bg-status-waiting"}`}
            />
            <div className="p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h3 className="text-[22px] font-medium">{current.company_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {current.city || "Ville à compléter"} ·{" "}
                    {current.headcount_range || "Effectif ?"}
                  </p>
                  <div className="mt-2">
                    <SegmentBadge headcount={current.headcount_range} segment={current.segment} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="neutral" onClick={previousCard} disabled={index === 0 || busy} className="px-3">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="neutral" onClick={nextCard} disabled={busy} className="px-3">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="neutral" onClick={() => (editOpen ? setEditOpen(false) : openQuickEdit())}>
                    {editOpen ? "Fermer" : "Modifier la fiche"}
                  </Button>
                  <StatusBadge status={current.status} />
                </div>
              </div>
              {editOpen ? (
                <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2">
                  <Field label="Entreprise">
                    <input className={fieldClass} value={editForm.company_name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))} />
                  </Field>
                  <Field label="Ville">
                    <input className={fieldClass} value={editForm.city ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
                  </Field>
                  <Field label="Téléphone">
                    <input className={fieldClass} value={editForm.main_phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, main_phone: e.target.value }))} />
                  </Field>
                  <Field label="Email">
                    <input className={fieldClass} value={editForm.main_email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, main_email: e.target.value }))} />
                  </Field>
                  <Field label="Site web">
                    <input className={fieldClass} value={editForm.website ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} />
                  </Field>
                  <Field label="Décideur">
                    <input className={fieldClass} value={editForm.decision_maker ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, decision_maker: e.target.value }))} />
                  </Field>
                  <Field label="Secteur">
                    <input className={fieldClass} value={editForm.sector ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, sector: e.target.value }))} />
                  </Field>
                  <Field label="Effectif">
                    <select className={fieldClass} value={editForm.headcount_range ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, headcount_range: e.target.value as Prospect["headcount_range"] }))}>
                      <option value="">—</option>
                      {headcountRanges.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Offre">
                    <select className={fieldClass} value={editForm.offer_target ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, offer_target: e.target.value as Prospect["offer_target"] }))}>
                      <option value="">—</option>
                      {offerTargets.map((offer) => (
                        <option key={offer} value={offer}>{offer}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Segment (auto)">
                    <div className="flex min-h-10 items-center">
                      <SegmentBadge headcount={editForm.headcount_range} />
                    </div>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Commentaires">
                      <textarea className={`${fieldClass} min-h-20 py-2`} value={editForm.comments ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, comments: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <Button onClick={saveQuickEdit} disabled={editSaving}>
                      {editSaving ? "Enregistrement…" : "Enregistrer la fiche"}
                    </Button>
                    <Button variant="neutral" onClick={() => setEditOpen(false)}>Annuler</Button>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Offre" value={current.offer_target || "—"} />
                <Info label="Valeur estimée" value={formatEuro(current.estimated_value)} />
              </div>
              <div className="mt-5 rounded-lg bg-muted p-4">
                <p className={labelClass}>Contact</p>
                {current.contacts.length > 1 ? (
                  <select
                    className={`${fieldClass} mt-2 w-full`}
                    value={contact?.id || ""}
                    onChange={(e) => setActiveContactId(e.target.value)}
                  >
                    {current.contacts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {contactName(item)} · {item.role_title || "Rôle à qualifier"}
                      </option>
                    ))}
                  </select>
                ) : null}
                <h4 className="mt-1 text-[16px] font-medium">{contactName(contact)}</h4>
                <p className="text-sm text-muted-foreground">
                  {contact?.role_title || "Rôle à qualifier"}
                </p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <a
                    href={`tel:${contact?.direct_phone || contact?.main_phone || current.main_phone || ""}`}
                  >
                    {contact?.direct_phone ||
                      contact?.main_phone ||
                      current.main_phone ||
                      "Téléphone à compléter"}
                  </a>
                  <a href={`mailto:${contact?.email || ""}`}>
                    {contact?.email || "Email à compléter"}
                  </a>
                  {contact?.linkedin_url ? (
                    <a target="_blank" rel="noreferrer" href={contact.linkedin_url}>
                      LinkedIn
                    </a>
                  ) : (
                    <span>LinkedIn à compléter</span>
                  )}
                  <span>{current.reception_hours || "Horaires à compléter"}</span>
                </div>
                {current.comments ? <p className="mt-3 text-sm">{current.comments}</p> : null}
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <Info label="Pourquoi maintenant" value={sessionReason(current)} />
                  <Info label="Prochaine action" value={formatDate(current.next_action_date)} />
                </div>
                {dataQualityIssues(current).length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dataQualityIssues(current).map((issue) => (
                      <span
                        key={issue}
                        className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                ) : null}
                {current.decision_maker || current.average_rating != null || current.icebreakers?.length ? (
                  <div className="mt-4 rounded-md border border-border bg-card p-3 text-sm">
                    <p className={labelClass}>Pour briser la glace</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {current.decision_maker ? <span>👤 {current.decision_maker}</span> : null}
                      {current.average_rating != null ? <span>⭐ {current.average_rating.toFixed(1)}{current.reviews_count != null ? ` (${current.reviews_count})` : ""}</span> : null}
                    </div>
                    {current.icebreakers?.slice(0, 3).map((item, i) => (
                      <p key={i} className="mt-1 text-xs">
                        • {item.title}
                        {item.url ? <> · <a className="text-primary underline" href={item.url} target="_blank" rel="noreferrer">lien</a></> : null}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-5 rounded-r-md border-l-[3px] border-script-border bg-script p-4">
                <p className={labelClass}>{callScript.label}</p>
                <p className="mt-2 text-sm leading-6">{callScript.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {callScript.checklist.map((item) => (
                    <span key={item} className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className={labelClass}>Situation constatée</p>
            <div className="mt-3 grid gap-2">
              {situationOptions.map((option, optionIndex) => (
                <Button
                  key={option.key}
                  variant={option.result === "RDV" ? "success" : option.result === "Échange" ? "info" : option.result === "NRP" ? "danger" : "warning"}
                  onClick={() => selectSituation(option.key)}
                  disabled={busy}
                  className="justify-start text-left"
                >
                  {optionIndex + 1} · {option.label}
                </Button>
              ))}
              <Button variant="neutral" onClick={markLost} disabled={busy} className="justify-start text-left">
                Perdu / pas de besoin
              </Button>
              <Button variant="neutral" onClick={nextCard} disabled={busy}>
                Passer sans log (→)
              </Button>
            </div>

            <div className="mt-4 grid gap-2">
              <label className={labelClass}>Notes d'appel (toujours disponibles)</label>
              <textarea
                className={`${fieldClass} min-h-24 py-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ce qui s'est dit, objections, contexte…"
              />
            </div>

            {canal === "téléphone" && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={
                    reachedManual ??
                    (selectedSituation ? reachedFromResult(selectedSituation.result) === true : false)
                  }
                  onChange={(e) => setReachedManual(e.target.checked)}
                />
                Quelqu'un a décroché (indépendant du résultat commercial)
              </label>
            )}


            {etape ? (
              <div className="mt-3 rounded-lg border border-primary/40 bg-muted p-3 text-sm">
                <p className={labelClass}>Proposition automatique (modifiable)</p>
                <p className="mt-1 font-medium">{formatEtape(etape)}</p>
                <p className="mt-1 text-muted-foreground">
                  Canal : {etape.canal ? etape.canal : "aucun canal — action interne"}
                </p>
              </div>
            ) : null}
            {message ? <p className="mt-3 rounded-lg bg-script p-3 text-sm">{message}</p> : null}

            {mode === "form" && etape ? (
              <Panel>
                <label className={labelClass}>Action proposée (modifiable)</label>
                <input
                  className={fieldClass}
                  value={overrideAction}
                  onChange={(e) => setOverrideAction(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Raison : {etape.raison}</p>
                {etape.dateRequise && situation !== "interet" ? (
                  <>
                    <label className={labelClass}>
                      Date donnée par le prospect (obligatoire)
                    </label>
                    <input
                      className={fieldClass}
                      type="date"
                      value={callbackDate}
                      onChange={(e) => {
                        setCallbackDate(e.target.value);
                        refreshEtape(e.target.value);
                      }}
                    />
                  </>
                ) : null}
                {etape.motifRequis || overrideStatus === "Parké" ? (
                  <>
                    <label className={labelClass}>
                      Motif / déclencheur de parking (obligatoire)
                    </label>
                    <input
                      className={fieldClass}
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      placeholder="ex. budget formation revu en janvier"
                    />
                  </>
                ) : null}
                <label className={labelClass}>Statut</label>
                <select
                  className={fieldClass}
                  value={overrideStatus || etape.status || current.status}
                  onChange={(e) => setOverrideStatus(e.target.value as ProspectStatus)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <label className={labelClass}>Canal consigné</label>
                <select
                  className={fieldClass}
                  value={canal}
                  onChange={(e) => {
                    const value = e.target.value as Canal;
                    setCanal(value);
                    setCallbackDate((prev) => enforceCallbackRule(value, prev));
                  }}
                >
                  <option value="téléphone">Téléphone</option>
                  <option value="email">Email</option>
                  <option value="physique">Physique</option>
                </select>
                {canal === "email" ? (
                  <>
                    <label className={labelClass}>Modèle d'email utilisé</label>
                    <select
                      className={fieldClass}
                      value={templateUsed}
                      onChange={(e) => setTemplateUsed(e.target.value)}
                    >
                      <option value="">— Aucun / autre</option>
                      {emailTemplates.map((template) => (
                        <option key={template} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                <label className={labelClass}>Promesse faite au prospect (facultatif)</label>
                <input
                  className={fieldClass}
                  value={promiseText}
                  onChange={(e) => setPromiseText(e.target.value)}
                  placeholder="ex. je vous rappelle vendredi"
                />
                {promiseText ? (
                  <>
                    <label className={labelClass}>Date promise (engagement pris)</label>
                    <input
                      className={fieldClass}
                      type="date"
                      value={promiseDate}
                      onChange={(e) => {
                        setPromiseDate(e.target.value);
                        if (situation === "interet") refreshEtape(e.target.value);
                      }}
                    />
                  </>
                ) : null}

                {overrideStatus === "Perdu" ? (
                  <Button variant="neutral" onClick={mailtoCoordinates}>
                    Envoyer mes coordonnées par email
                  </Button>
                ) : (
                  <>
                    <label className={labelClass}>
                      Prochaine action (relance que je me fixe)
                    </label>
                    <input
                      className={fieldClass}
                      type="date"
                      min={minCallbackDate(canal)}
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                    {canal === "email" ? (
                      <p className="text-xs text-muted-foreground">
                        Email consigné : relance au plus tôt le {formatDate(minCallbackDate("email"))}.
                      </p>
                    ) : null}
                  </>
                )}

                <Button onClick={saveForm} disabled={busy}>
                  Enregistrer l'appel
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => {
                    setSituation(null);
                    setEtape(null);
                    setMode("idle");
                  }}
                  disabled={busy}
                >
                  Annuler
                </Button>
              </Panel>
            ) : null}

            {mode === "meeting" ? (
              <Panel>
                <label className={labelClass}>Date du RDV</label>
                <input
                  className={fieldClass}
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => {
                    setMeetingDate(e.target.value);
                    refreshEtape(e.target.value);
                  }}
                />
                {etape ? (
                  <p className="text-xs text-muted-foreground">{formatEtape(etape)}</p>
                ) : null}
                <label className={labelClass}>Durée</label>
                <input
                  className={fieldClass}
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
                <label className={labelClass}>Lien visio</label>
                <input
                  className={fieldClass}
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                />
                <Button onClick={saveMeeting}>Créer le RDV</Button>
              </Panel>
            ) : null}
            <div className="mt-5">
              <p className={labelClass}>3 derniers logs</p>
              {current.prospection_logs.slice(0, 3).map((log) => (
                <p key={log.id} className="mt-2 text-sm">
                  <span className="text-muted-foreground">{shortDateTime(log.action_date)}</span> ·{" "}
                  {log.notes || log.action_type}
                </p>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-[22px] font-medium">{value}</p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background p-3">
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

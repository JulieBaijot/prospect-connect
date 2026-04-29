import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import {
  Button,
  Card,
  CategoryBadge,
  PageTitle,
  StatusBadge,
  fieldClass,
  labelClass,
} from "@/components/prm/ui";
import {
  addLog,
  buildCalendarUrl,
  contactName,
  dataQualityIssues,
  dateForOutcome,
  formatDate,
  formatEuro,
  loadProspects,
  nodeForStage,
  prioritizeSession,
  sessionReason,
  shortDateTime,
  updateProspect,
  type PlaybookOutcome,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/session-appels")({
  head: () => ({
    meta: [
      { title: "Session d'appels — PRM SST" },
      { name: "description", content: "Cockpit desktop pour appeler les prospects SST." },
    ],
  }),
  component: SessionRoute,
});

type Mode = "idle" | "callback" | "exchange" | "meeting";

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
  const [selectedOutcome, setSelectedOutcome] = useState<PlaybookOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const current = session[index];
  const contact =
    current?.contacts.find((item) => item.id === activeContactId) || current?.contacts[0];
  const activeNode = current ? nodeForStage(current.current_stage) : null;
  const progress = session.length ? Math.round((summary.done / session.length) * 100) : 0;

  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (["1", "2", "3", "4"].includes(event.key)) {
        const outcome = activeNode?.outcomes[Number(event.key) - 1];
        if (outcome) selectOutcome(outcome);
      }
      if (event.key === "5") nextCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function refresh() {
    setLoading(true);
    setProspects(await loadProspects());
    setLoading(false);
  }

  function startSession() {
    const picked = prioritizeSession(prospects);
    setSession(picked);
    setIndex(0);
    setSummary({ nrp: 0, rdv: 0, exchanges: 0, done: 0 });
    setMode("idle");
  }

  function nextCard() {
    setMode("idle");
    setNotes("");
    setCallbackDate("");
    setMeetingDate("");
    setVideoLink("");
    setMessage("");
    setActiveContactId(null);
    setSelectedOutcome(null);
    setIndex((prev) => prev + 1);
  }

  function markDoneAndNext() {
    setSummary((prev) => ({ ...prev, done: Math.min(prev.done + 1, session.length) }));
    nextCard();
  }

  function selectOutcome(outcome: PlaybookOutcome) {
    setSelectedOutcome(outcome);
    setMessage("");
    setNotes(outcome.note);
    if (outcome.mode === "meeting") {
      setMode("meeting");
      return;
    }
    const recommendedDate = dateForOutcome(outcome);
    setCallbackDate(recommendedDate);
    if (outcome.mode === "callback" || outcome.mode === "exchange") {
      setMode(outcome.mode);
      return;
    }
    void saveOutcome(outcome, { nextActionDate: recommendedDate });
  }

  async function saveOutcome(
    outcome = selectedOutcome,
    options: { nextActionDate?: string; meetingAt?: string; customNotes?: string } = {},
  ) {
    if (!current || !outcome || busy) return;
    setBusy(true);
    setMessage("");
    await addLog({
      prospect_id: current.id,
      contact_id: contact?.id,
      action_type: outcome.actionType,
      canal: "téléphone",
      stage: current.current_stage,
      objective: activeNode?.objective,
      result: outcome.result,
      notes: options.customNotes || notes || outcome.note,
      next_action_date: options.nextActionDate,
      meeting_date: options.meetingAt,
      meeting_duration_minutes: options.meetingAt ? duration : undefined,
      video_link: options.meetingAt ? videoLink : undefined,
    });
    await updateProspect(current.id, {
      current_stage: outcome.nextStage,
      status: outcome.status || current.status,
      next_action_date: (options.meetingAt || options.nextActionDate || dateForOutcome(outcome)).slice(0, 10),
    });
    if (outcome.result === "NRP") setSummary((prev) => ({ ...prev, nrp: prev.nrp + 1 }));
    if (outcome.result === "Échange") setSummary((prev) => ({ ...prev, exchanges: prev.exchanges + 1 }));
    if (outcome.result === "RDV") setSummary((prev) => ({ ...prev, rdv: prev.rdv + 1 }));
    setBusy(false);
    markDoneAndNext();
  }

  async function saveCallback() {
    if (!callbackDate) return;
    await saveOutcome(selectedOutcome, { nextActionDate: callbackDate, customNotes: notes });
  }

  async function saveExchange() {
    if (!callbackDate) {
      setMessage("Choisissez une prochaine date d'action pour garder la relance sous contrôle.");
      return;
    }
    await saveOutcome(selectedOutcome, { nextActionDate: callbackDate, customNotes: notes });
  }

  async function saveMeeting() {
    if (!current || !meetingDate || busy || !selectedOutcome) return;
    window.open(
      buildCalendarUrl({ prospect: current, contact, date: meetingDate, duration, videoLink }),
      "_blank",
      "noopener,noreferrer",
    );
    await saveOutcome(selectedOutcome, { meetingAt: meetingDate, customNotes: notes || selectedOutcome.note });
  }

  return (
    <>
      <PageTitle
        title="Session d'appels"
        subtitle="Cockpit desktop pour traiter jusqu'à 20 prospects par priorité."
        action={
          <Button onClick={startSession} disabled={loading || prospects.length === 0}>
            Démarrer une session
          </Button>
        }
      />
      {!session.length ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Chargement des prospects…"
              : "Démarrez une session pour charger les prospects prioritaires."}
          </p>
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
          <Button className="mt-5" onClick={startSession}>
            Nouvelle session
          </Button>
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
            <div className="mt-5 space-y-3">
              <Kpi label="NRP" value={summary.nrp} />
              <Kpi label="Échanges" value={summary.exchanges} />
              <Kpi label="RDV" value={summary.rdv} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div
              className={`h-2 ${current.status === "Chaud" ? "bg-status-hot" : current.status === "Tiède" ? "bg-status-warm" : current.status === "Converti" ? "bg-status-won" : "bg-status-waiting"}`}
            />
            <div className="p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h3 className="text-[22px] font-medium">{current.company_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {current.city || "Ville à compléter"} ·{" "}
                    {current.headcount_range || "Effectif ?"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CategoryBadge category={current.category} />
                  <StatusBadge status={current.status} />
                </div>
              </div>
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
              </div>
              <div className="mt-5 rounded-r-md border-l-[3px] border-script-border bg-script p-4">
                <p className={labelClass}>{activeNode?.label}</p>
                <p className="mt-2 text-sm leading-6">{activeNode?.script}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeNode?.checklist.map((item) => (
                    <span key={item} className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className={labelClass}>Issues du nœud</p>
            <div className="mt-3 grid gap-2">
              {activeNode?.outcomes.map((outcome, outcomeIndex) => (
                <Button
                  key={outcome.key}
                  variant={outcome.result === "RDV" ? "success" : outcome.result === "Échange" ? "info" : outcome.result === "NRP" ? "danger" : "warning"}
                  onClick={() => selectOutcome(outcome)}
                  disabled={busy}
                  className="justify-start text-left"
                >
                  {outcomeIndex + 1} · {outcome.label}
                </Button>
              ))}
              <Button variant="neutral" onClick={nextCard} disabled={busy}>
                5 · Passer sans log
              </Button>
            </div>
            {selectedOutcome ? (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                <p className={labelClass}>Recommandation</p>
                <p className="mt-1">{selectedOutcome.note}</p>
                <p className="mt-1 text-muted-foreground">
                  Suite : {selectedOutcome.nextStage} · {selectedOutcome.delayDays === 0 ? "immédiat" : `J+${selectedOutcome.delayDays}`}
                </p>
              </div>
            ) : null}
            {message ? <p className="mt-3 rounded-lg bg-script p-3 text-sm">{message}</p> : null}
            {mode === "callback" ? (
              <Panel>
                <label className={labelClass}>Rappeler le</label>
                <input
                  className={fieldClass}
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                />
                <Button onClick={saveCallback}>Enregistrer</Button>
              </Panel>
            ) : null}
            {mode === "exchange" ? (
              <Panel>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${fieldClass} min-h-24 py-2`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Info label="Prochaine étape" value={selectedOutcome?.nextStage || "—"} />
                <label className={labelClass}>Prochaine action</label>
                <input
                  className={fieldClass}
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                />
                <Button onClick={saveExchange}>Sauvegarder l'échange</Button>
              </Panel>
            ) : null}
            {mode === "meeting" ? (
              <Panel>
                <label className={labelClass}>Date du RDV</label>
                <input
                  className={fieldClass}
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { ParkingAction } from "@/components/prm/ParkingAction";

import {
  Button,
  Card,
  PageTitle,
  SegmentBadge,
  StatusBadge,
  fieldClass,
  labelClass,
} from "@/components/prm/ui";
import { emptyPlan, savePlan, todayPlan, type DayPlan } from "@/lib/day-plan";
import {
  fillTemplate,
  loadEmailTemplates,
  type EmailTemplate,
} from "@/lib/email-templates";
import {
  addLog,
  bestPhone,
  brokenPromises,
  contactName,
  decisionLevels,
  enforceCallbackRule,
  formatDate,
  formatEuro,
  loadLogs,
  isParked,
  loadProspects,

  parkProspect,

  prioritizeCallSession,
  prochaineEtape,
  setPromiseKept,
  shortDateTime,
  situationOptions,
  todayIsoDate,
  updateProspect,
  type Contact,
  type DecisionLevel,
  type Etape,
  type Prospect,
  type ProspectStatus,
  type ProspectionLog,
  type ProspectWithRelations,
  type Situation,
} from "@/lib/prm";

export const Route = createFileRoute("/aujourdhui")({
  head: () => ({
    meta: [
      { title: "Aujourd'hui — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Écran du jour : promesses à tenir, 3 appels, 3 emails et clôture de la journée en un seul flux.",
      },
      { property: "og:title", content: "Aujourd'hui — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Promesses à tenir, 3 appels, 3 emails, puis clôture et préparation du lendemain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <TodayPage />
    </AppLayout>
  ),
});

type FullLog = ProspectionLog & { prospects: Prospect | null; contacts: Contact | null };

function TodayPage() {
  const navigate = useNavigate();
  const today = todayIsoDate();
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [logs, setLogs] = useState<FullLog[]>([]);
  const [plan, setPlan] = useState<DayPlan>(() => emptyPlan(today));
  const [screen, setScreen] = useState<"jour" | "bilan">("jour");
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    setPlan(todayPlan());
    loadProspects().then(setProspects);
    loadLogs().then(setLogs);
    loadEmailTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  function refresh() {
    loadProspects().then(setProspects);
    loadLogs().then(setLogs);
  }

  function updatePlan(next: DayPlan) {
    savePlan(next);
    setPlan(next);
  }

  const byId = useMemo(() => new Map(prospects.map((p) => [p.id, p])), [prospects]);
  // Un prospect parké quitte les listes de travail jusqu'à sa date de réveil.
  const callList = plan.calls
    .map((id) => byId.get(id))
    .filter((p): p is ProspectWithRelations => Boolean(p) && !isParked(p!));
  const emailList = plan.emails
    .map((id) => byId.get(id))
    .filter((p): p is ProspectWithRelations => Boolean(p) && !isParked(p!));


  const todayLogs = useMemo(
    () => logs.filter((log) => (log.action_date || "").slice(0, 10) === today),
    [logs, today],
  );
  const promises = useMemo(() => brokenPromises(logs), [logs]);

  const bilan = useMemo(() => {
    const calls = todayLogs.filter((log) => log.canal === "téléphone");
    return {
      calls: calls.length,
      pickups: calls.filter((log) => log.result === "Échange" || log.result === "RDV").length,
      emails: todayLogs.filter((log) => log.canal === "email").length,
      promises: todayLogs.filter((log) => log.promise_date).length,
      rdv: todayLogs.filter((log) => log.result === "RDV").length,
    };
  }, [todayLogs]);

  const pickupsInPlan = todayLogs.filter(
    (log) =>
      plan.calls.includes(log.prospect_id) && (log.result === "Échange" || log.result === "RDV"),
  ).length;

  function suggestToday() {
    const active = prospects.filter((p) => !["Perdu", "Converti"].includes(p.status));
    const picks = prioritizeCallSession(active, 6);
    updatePlan({
      ...plan,
      calls: picks.slice(0, 3).map((p) => p.id),
      emails: picks.slice(3, 6).map((p) => p.id),
    });
  }

  return (
    <>
      <PageTitle
        title="Aujourd'hui"
        subtitle={`${formatDate(today)} — promesses, 3 appels, 3 emails, puis clôture.`}
        action={
          <Link
            to="/prospects"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            Base prospects
          </Link>
        }
      />

      {message ? (
        <p className="mb-4 rounded-lg border border-border bg-secondary p-3 text-sm">{message}</p>
      ) : null}

      {/* Bloc 1 — Promesses à tenir aujourd'hui */}
      <section className="mb-6 rounded-xl border-2 border-destructive bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h3 className="text-[16px] font-semibold">Promesses à tenir aujourd'hui</h3>
        </div>
        <div className="mt-3 grid gap-2">
          {promises.length ? (
            promises.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {(log as FullLog).prospects?.company_name || "Prospect"}
                    <span className="ml-2 font-normal text-destructive">
                      promis pour le {formatDate((log as FullLog).promise_date)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    « {(log as FullLog).promise_text || (log as FullLog).action_type} »
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="min-h-9 px-3"
                    onClick={async () => {
                      await setPromiseKept(log.id, true);
                      setLogs((prev) =>
                        prev.map((item) =>
                          item.id === log.id ? { ...item, promise_kept: true } : item,
                        ),
                      );
                    }}
                  >
                    Tenue
                  </Button>
                  <Button
                    variant="neutral"
                    className="min-h-9 px-3"
                    onClick={async () => {
                      await setPromiseKept(log.id, false);
                      setLogs((prev) =>
                        prev.map((item) =>
                          item.id === log.id ? { ...item, promise_kept: false } : item,
                        ),
                      );
                    }}
                  >
                    Reportée
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Aucune promesse en attente</p>
          )}
        </div>
      </section>

      {/* Bloc 2 — Mes 3 appels */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[16px] font-medium">Mes 3 appels</h3>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            décrochages : {pickupsInPlan} / {Math.max(callList.length, 3)}
          </p>
        </div>
        {callList.length ? (
          <div className="grid gap-3">
            {callList.map((prospect) => (
              <CallCard
                key={prospect.id}
                prospect={prospect}
                todayLogs={todayLogs.filter((log) => log.prospect_id === prospect.id)}
                onSaved={() => {
                  refresh();
                  setMessage("Résultat consigné.");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyPlan onSuggest={suggestToday} onPrepare={() => void navigate({ to: "/demain" })} />
        )}
      </section>

      {/* Bloc 3 — Mes 3 emails */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[16px] font-medium">Mes 3 emails</h3>
        </div>
        {emailList.length ? (
          <div className="grid gap-3">
            {emailList.map((prospect) => (
              <EmailCard
                key={prospect.id}
                prospect={prospect}
                logs={logs.filter((log) => log.prospect_id === prospect.id)}
                templates={templates}
                onSaved={() => {
                  refresh();
                  setMessage("Email consigné.");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyPlan onSuggest={suggestToday} onPrepare={() => void navigate({ to: "/demain" })} />
        )}
      </section>

      {/* Bloc 4 — Clôture */}
      <section>
        <Card className="p-4">
          <h3 className="text-[16px] font-medium">Clôture</h3>
          {screen === "jour" ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Terminez la journée pour voir le bilan et composer la liste de demain.
              </p>
              <Button className="mt-4" onClick={() => setScreen("bilan")}>
                Clôturer la journée
              </Button>
            </>
          ) : (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Stat label="Appels passés" value={bilan.calls} />
                <Stat label="Décrochages" value={bilan.pickups} />
                <Stat label="Emails envoyés" value={bilan.emails} />
                <Stat label="Promesses prises" value={bilan.promises} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {bilan.rdv} rendez-vous obtenu(s) aujourd'hui.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    updatePlan({ ...plan, closed: true });
                    void navigate({ to: "/demain" });
                  }}
                >
                  Préparer demain
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="neutral" onClick={() => setScreen("jour")}>
                  Revenir à la journée
                </Button>
              </div>
            </>
          )}
        </Card>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-[24px] font-medium">{value}</p>
    </div>
  );
}

function EmptyPlan({ onSuggest, onPrepare }: { onSuggest: () => void; onPrepare: () => void }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">
        Aucune liste préparée la veille pour aujourd'hui.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onSuggest}>
          <Sparkles className="mr-2 h-4 w-4" />
          Composer ma liste du jour
        </Button>
        <Button variant="neutral" onClick={onPrepare}>
          Préparer une liste
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------------------- Appels --------------------------------- */

function CallCard({
  prospect,
  todayLogs,
  onSaved,
}: {
  prospect: ProspectWithRelations;
  todayLogs: FullLog[];
  onSaved: () => void;
}) {
  const contact = prospect.contacts[0];
  const lastLog = prospect.prospection_logs[0];
  const [situation, setSituation] = useState<Situation | null>(null);
  const [etape, setEtape] = useState<Etape | null>(null);
  const [notes, setNotes] = useState("");
  /** Surcharge manuelle de « quelqu'un a décroché » ; null = déduit du résultat. */
  const [reachedManual, setReachedManual] = useState<boolean | null>(null);
  const [level, setLevel] = useState<DecisionLevel>(prospect.decision_level || "inconnu");
  const [promiseText, setPromiseText] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const done = todayLogs.length > 0;

  function open(key: Situation) {
    const proposal = prochaineEtape(prospect, { situation: key });
    setSituation(key);
    setEtape(proposal);
    setDate(proposal.date);
    setError("");
  }

  async function quick(key: Situation) {
    const proposal = prochaineEtape(prospect, { situation: key });
    await commit(key, proposal, proposal.date, "");
  }

  async function commit(key: Situation, proposal: Etape, nextDate: string, freeNotes: string) {
    const option = situationOptions.find((item) => item.key === key);
    if (!option || busy) return;
    setBusy(true);
    try {
      await addLog({
        prospect_id: prospect.id,
        contact_id: contact?.id,
        action_type: option.actionType,
        canal: proposal.canal || "téléphone",
        stage: key,
        objective: proposal.action,
        result: option.result,
        notes: freeNotes || proposal.raison,
        next_action_date: nextDate,
        promise_text: promiseText || null,
        promise_date: promiseText ? promiseDate || null : null,
        promise_kept: null,
      });
      const status = (proposal.status || prospect.status) as ProspectStatus;
      await updateProspect(prospect.id, {
        status,
        last_contacted_at: todayIsoDate(),
        next_action_date: status === "Perdu" ? null : nextDate,
        decision_level: level,
        ...(status === "Parké" ? { parking_trigger: motif, parking_date: nextDate } : {}),
      });
      setSituation(null);
      setEtape(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
    setBusy(false);
  }

  async function savePanel() {
    if (!situation || !etape) return;
    if (etape.motifRequis && !motif.trim()) {
      setError("« Parquer » exige un motif écrit.");
      return;
    }
    if (etape.promesseRequise && (!promiseText.trim() || !promiseDate)) {
      setError("Intérêt exprimé : saisissez la promesse et sa date.");
      return;
    }
    if (promiseText && !promiseDate) {
      setError("Indiquez la date promise au prospect.");
      return;
    }
    await commit(situation, etape, date || etape.date, notes);
  }

  const phone = bestPhone(prospect);

  return (
    <Card className={`p-4 ${done ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-medium">
            {prospect.company_name}
            {prospect.city ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {prospect.city}
              </span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
            <StatusBadge status={prospect.status} />
            <span className="inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
              décision : {prospect.decision_level || "inconnu"}
              {prospect.group_name ? ` · ${prospect.group_name}` : ""}
            </span>
          </div>
          <p className="mt-2 text-sm">
            {phone ? (
              <a className="font-medium text-primary underline" href={`tel:${phone}`}>
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">Téléphone manquant</span>
            )}
            <span className="text-muted-foreground">
              {" · "}
              {contact
                ? `${contactName(contact) || "Contact"}${contact.role_title ? ` — ${contact.role_title}` : ""}`
                : prospect.decision_maker || "Contact à identifier"}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dernière interaction :{" "}
            {lastLog
              ? `${lastLog.action_type} — ${shortDateTime(lastLog.action_date)}`
              : "aucune interaction consignée"}
          </p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> traité
          </span>
        ) : null}
      </div>

      {situation ? null : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="danger"
            className="min-h-9 px-3"
            disabled={busy}
            onClick={() => quick("nrp")}
          >
            NRP
          </Button>
          <Button
            variant="warning"
            className="min-h-9 px-3"
            disabled={busy}
            onClick={() => quick("barrage")}
          >
            Barrage
          </Button>
          <Button variant="info" className="min-h-9 px-3" onClick={() => open("interet")}>
            Échange
          </Button>
          <Button variant="success" className="min-h-9 px-3" onClick={() => open("rdv")}>
            RDV
          </Button>
          <ParkingAction
            id={prospect.id}
            defaultMotif={prospect.parking_trigger || ""}
            defaultDate={prospect.parking_date || ""}
            onPark={async (motif, wakeDate) => {
              await addLog({
                prospect_id: prospect.id,
                contact_id: contact?.id,
                action_type: "Prospect parké",
                canal: "téléphone",
                stage: "parking",
                objective: `Reprise : ${motif}`,
                result: "Pas dispo",
                notes: `Parké jusqu'au ${wakeDate} — ${motif}`,
                next_action_date: wakeDate,
              });
              await parkProspect(prospect.id, motif, wakeDate);
              onSaved();
            }}
          />
        </div>
      )}


      {situation && etape ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3">
          <div className="grid gap-1">
            <label className={labelClass} htmlFor={`sit-${prospect.id}`}>
              Situation
            </label>
            <select
              id={`sit-${prospect.id}`}
              className={fieldClass}
              value={situation}
              onChange={(event) => open(event.target.value as Situation)}
            >
              {situationOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label className={labelClass} htmlFor={`notes-${prospect.id}`}>
              Notes libres
            </label>
            <textarea
              id={`notes-${prospect.id}`}
              className={`${fieldClass} min-h-20 py-2`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ce qui s'est dit, en clair."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={
                reachedManual ??
                (situation
                  ? reachedFromResult(
                      situationOptions.find((o) => o.key === situation)?.result ?? null,
                    ) === true
                  : false)
              }
              onChange={(event) => setReachedManual(event.target.checked)}
            />
            Quelqu'un a décroché
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className={labelClass} htmlFor={`level-${prospect.id}`}>
                Niveau de décision
              </label>
              <select
                id={`level-${prospect.id}`}
                className={fieldClass}
                value={level}
                onChange={(event) => setLevel(event.target.value as DecisionLevel)}
              >
                {decisionLevels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className={labelClass} htmlFor={`date-${prospect.id}`}>
                Prochaine étape — date
              </label>
              <input
                id={`date-${prospect.id}`}
                type="date"
                className={fieldClass}
                value={date}
                onChange={(event) =>
                  setDate(enforceCallbackRule(etape.canal || "téléphone", event.target.value))
                }
              />
            </div>
            <div className="grid gap-1">
              <label className={labelClass} htmlFor={`promise-${prospect.id}`}>
                Promesse au prospect
              </label>
              <input
                id={`promise-${prospect.id}`}
                className={fieldClass}
                value={promiseText}
                onChange={(event) => setPromiseText(event.target.value)}
                placeholder="Je vous rappelle vendredi"
              />
            </div>
            <div className="grid gap-1">
              <label className={labelClass} htmlFor={`promise-date-${prospect.id}`}>
                Date promise
              </label>
              <input
                id={`promise-date-${prospect.id}`}
                type="date"
                className={fieldClass}
                value={promiseDate}
                onChange={(event) => setPromiseDate(event.target.value)}
              />
            </div>
          </div>
          {etape.motifRequis ? (
            <div className="grid gap-1">
              <label className={labelClass} htmlFor={`motif-${prospect.id}`}>
                Motif de parking (obligatoire)
              </label>
              <input
                id={`motif-${prospect.id}`}
                className={fieldClass}
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
              />
            </div>
          ) : null}
          <p className="text-sm font-medium">
            Prochaine étape : {etape.action.toLowerCase()} le {formatDate(date || etape.date)} —{" "}
            {etape.raison}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={savePanel}>
              <Check className="mr-2 h-4 w-4" />
              Consigner
            </Button>
            <Button variant="neutral" onClick={() => setSituation(null)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/* ---------------------------------- Emails --------------------------------- */

function EmailCard({
  prospect,
  logs,
  templates,
  onSaved,
}: {
  prospect: ProspectWithRelations;
  logs: FullLog[];
  templates: EmailTemplate[];
  onSaved: () => void;
}) {
  const contact = prospect.contacts[0];
  const emailLogs = logs.filter((log) => log.canal === "email");
  const lastEmail = emailLogs[0];
  const [templateId, setTemplateId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(enforceCallbackRule("email", ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const address = contact?.email || prospect.main_email || "";

  const selected = templates.find((item) => item.id === templateId) || templates[0];
  const templateName = selected?.name || "";
  const values = {
    contact: contactName(contact) || prospect.decision_maker,
    entreprise: prospect.company_name,
    ville: prospect.city,
  };
  const finalSubject = selected ? fillTemplate(selected.subject, values) : "";
  const finalBody = selected ? fillTemplate(selected.body, values) : "";

  /** Envoi antérieur du même modèle à ce contact — on affiche sa date. */
  const previousSend = emailLogs.find(
    (log) =>
      templateName &&
      log.template_used === templateName &&
      (!contact || !log.contact_id || log.contact_id === contact.id),
  );

  async function copyFinal() {
    try {
      await navigator.clipboard.writeText(`${finalSubject}\n\n${finalBody}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible — sélectionnez le texte manuellement.");
    }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await addLog({
        prospect_id: prospect.id,
        contact_id: contact?.id,
        action_type: "Email envoyé",
        canal: "email",
        stage: "email_envoye",
        objective: "Relance téléphonique après email",
        result: "Pas dispo",
        notes: notes || (templateName ? `Modèle : ${templateName}` : "Email envoyé"),
        next_action_date: enforceCallbackRule("email", date),
        template_used: templateName || null,
      });
      await updateProspect(prospect.id, {
        last_contacted_at: todayIsoDate(),
        next_action_date: enforceCallbackRule("email", date),
        status: prospect.status === "À qualifier" ? "En contact" : prospect.status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
    setBusy(false);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-medium">
            {prospect.company_name}
            {prospect.city ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {prospect.city}
              </span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
            <StatusBadge status={prospect.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {contact
              ? `${contactName(contact) || "Contact"}${contact.role_title ? ` — ${contact.role_title}` : ""}`
              : prospect.decision_maker || "Contact à identifier"}
            {address ? ` · ${address}` : " · email manquant"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
          <p className={labelClass}>Dernier modèle envoyé</p>
          <p className="mt-1 font-medium">
            {lastEmail?.template_used || (lastEmail ? "Modèle non tracé" : "Aucun email envoyé")}
          </p>
          {lastEmail ? (
            <p className="text-muted-foreground">le {formatDate(lastEmail.action_date)}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className={labelClass} htmlFor={`tpl-${prospect.id}`}>
            Modèle à envoyer
          </label>
          {templates.length ? (
            <select
              id={`tpl-${prospect.id}`}
              className={fieldClass}
              value={selected?.id || ""}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.segment_cible ? ` — ${item.segment_cible}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun modèle enregistré —{" "}
              <Link to="/modeles" className="underline">
                créer un modèle
              </Link>
              .
            </p>
          )}
        </div>
        <div className="grid gap-1">
          <label className={labelClass} htmlFor={`edate-${prospect.id}`}>
            Rappel téléphonique (J+1 minimum)
          </label>
          <input
            id={`edate-${prospect.id}`}
            type="date"
            className={fieldClass}
            value={date}
            min={enforceCallbackRule("email", "")}
            onChange={(event) => setDate(enforceCallbackRule("email", event.target.value))}
          />
        </div>
      </div>

      {previousSend ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Ce modèle a déjà été envoyé à ce contact le {formatDate(previousSend.action_date)} —
          changez de modèle ou personnalisez le message.
        </p>
      ) : null}

      {selected ? (
        <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={labelClass}>Texte final, prêt à copier</p>
            <Button variant="neutral" className="min-h-9 px-3" onClick={copyFinal}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <p className="mt-2 text-sm font-medium">{finalSubject || "(objet vide)"}</p>
          <pre className="mt-1 whitespace-pre-wrap text-sm">{finalBody || "(corps vide)"}</pre>
        </div>
      ) : null}

      <div className="mt-3 grid gap-1">
        <label className={labelClass} htmlFor={`enotes-${prospect.id}`}>
          Notes
        </label>
        <input
          id={`enotes-${prospect.id}`}
          className={fieldClass}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Angle utilisé, pièce jointe…"
        />
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {address ? (
          <a
            href={`mailto:${address}?subject=${encodeURIComponent(finalSubject || templateName)}&body=${encodeURIComponent(finalBody)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
          >
            <Mail className="mr-2 h-4 w-4" />
            Ouvrir l'email
          </a>
        ) : null}
        <Button disabled={busy} onClick={save}>
          Consigner l'envoi
        </Button>
      </div>
    </Card>
  );
}


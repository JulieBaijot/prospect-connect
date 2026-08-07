import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles, X } from "lucide-react";
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
import { loadPlan, savePlan, tomorrowIso, type DayPlan } from "@/lib/day-plan";
import {
  bestPhone,
  contactName,
  formatDate,
  formatEuro,
  loadProspects,
  segmentOf,
  todayIsoDate,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/demain")({
  head: () => ({
    meta: [
      { title: "Préparer demain — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Composer en cinq minutes la liste du lendemain : 6 appels et 3 emails, proposés puis ajustables.",
      },
      { property: "og:title", content: "Préparer demain — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "6 appels et 3 emails proposés pour demain, remplaçables ligne par ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <TomorrowPage />
    </AppLayout>
  ),
});

const CALL_TARGET = 6;
const EMAIL_TARGET = 3;

/** Raison de proposition, affichée sur chaque ligne. */
type Reason = string;

function contactNamed(prospect: ProspectWithRelations) {
  if (prospect.decision_maker?.trim()) return true;
  return prospect.contacts.some((c) => (c.first_name || c.last_name || "").trim());
}

function contactCount(prospect: ProspectWithRelations) {
  return prospect.prospection_logs.length;
}

function lastCallBarrage(prospect: ProspectWithRelations) {
  const calls = prospect.prospection_logs.filter((log) => log.canal === "téléphone");
  const last = calls[0];
  return Boolean(last && (last.stage === "barrage" || last.action_type.startsWith("Barrage")));
}

/** Exclusions de la proposition automatique — les « groupe » restent accessibles manuellement. */
function eligible(prospect: ProspectWithRelations, today: string) {
  if (prospect.status === "Perdu" || prospect.status === "Converti") return false;
  if (prospect.decision_level === "groupe") return false;
  if (prospect.status === "Parké") {
    if (!prospect.parking_date || prospect.parking_date > today) return false;
  }
  return true;
}

function callRanking(prospects: ProspectWithRelations[], tomorrow: string, today: string) {
  const pool = prospects.filter((p) => eligible(p, today));
  const ranked: Array<{ prospect: ProspectWithRelations; reason: Reason; rank: number }> = [];

  for (const prospect of pool) {
    // Un parking arrivé à échéance revient en tête, motif affiché.
    if (prospect.status === "Parké" && prospect.parking_date && prospect.parking_date <= tomorrow) {
      ranked.push({
        prospect,
        reason: `Réveil de parking (${formatDate(prospect.parking_date)}) — ${prospect.parking_trigger || "motif non renseigné"}`,
        rank: 0,
      });
      continue;
    }
    const promise = prospect.prospection_logs.find(
      (log) => log.promise_date && log.promise_kept === null && log.promise_date <= tomorrow,
    );
    if (promise) {
      ranked.push({
        prospect,
        reason: `Promesse à échéance le ${formatDate(promise.promise_date)}`,
        rank: 1,
      });
      continue;
    }
    if (prospect.parking_date && prospect.parking_date <= tomorrow) {
      ranked.push({
        prospect,
        reason: `Parking arrivé à échéance (${formatDate(prospect.parking_date)})`,
        rank: 2,
      });
      continue;
    }

    if (bestPhone(prospect) && contactNamed(prospect) && !prospect.last_contacted_at) {
      ranked.push({ prospect, reason: "Téléphone + contact nommé, jamais appelé", rank: 3 });
      continue;
    }
    ranked.push({
      prospect,
      reason: prospect.last_contacted_at
        ? `À relancer — dernier contact le ${formatDate(prospect.last_contacted_at)}`
        : "À relancer — aucun contact consigné",
      rank: 4,
    });
  }

  return ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.rank === 4) {
      return (a.prospect.last_contacted_at || "0000-00-00").localeCompare(
        b.prospect.last_contacted_at || "0000-00-00",
      );
    }
    return a.prospect.company_name.localeCompare(b.prospect.company_name);
  });
}

function emailRanking(prospects: ProspectWithRelations[], today: string) {
  return prospects
    .filter((p) => eligible(p, today))
    .map((prospect) => {
      const noPhone = !bestPhone(prospect);
      const barrage = lastCallBarrage(prospect);
      if (!noPhone && !barrage) return null;
      return {
        prospect,
        reason: noPhone ? "Aucun téléphone exploitable" : "Dernier appel : barrage accueil",
        rank: barrage ? 1 : 2,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const left = a as { prospect: ProspectWithRelations; rank: number };
      const right = b as { prospect: ProspectWithRelations; rank: number };
      if (left.rank !== right.rank) return left.rank - right.rank;
      return (left.prospect.last_contacted_at || "0000-00-00").localeCompare(
        right.prospect.last_contacted_at || "0000-00-00",
      );
    }) as Array<{ prospect: ProspectWithRelations; reason: Reason; rank: number }>;
}

function TomorrowPage() {
  const today = todayIsoDate();
  const tomorrow = tomorrowIso();
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [calls, setCalls] = useState<string[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [replacing, setReplacing] = useState<{ list: "calls" | "emails"; id: string } | null>(null);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProspects().then((items) => {
      setProspects(items);
      const existing: DayPlan = loadPlan(tomorrowIso());
      if (existing.calls.length || existing.emails.length) {
        setCalls(existing.calls);
        setEmails(existing.emails);
      } else {
        const callPicks = callRanking(items, tomorrowIso(), todayIsoDate())
          .slice(0, CALL_TARGET)
          .map((entry) => entry.prospect.id);
        const emailPicks = emailRanking(items, todayIsoDate())
          .filter((entry) => !callPicks.includes(entry.prospect.id))
          .slice(0, EMAIL_TARGET)
          .map((entry) => entry.prospect.id);
        setCalls(callPicks);
        setEmails(emailPicks);
      }
      setLoaded(true);
    });
  }, []);

  const byId = useMemo(() => new Map(prospects.map((p) => [p.id, p])), [prospects]);
  const callReasons = useMemo(() => {
    const map = new Map<string, Reason>();
    for (const entry of callRanking(prospects, tomorrow, today))
      map.set(entry.prospect.id, entry.reason);
    return map;
  }, [prospects, today, tomorrow]);
  const emailReasons = useMemo(() => {
    const map = new Map<string, Reason>();
    for (const entry of emailRanking(prospects, today)) map.set(entry.prospect.id, entry.reason);
    return map;
  }, [prospects, today]);

  const callProspects = calls.map((id) => byId.get(id)).filter(Boolean) as ProspectWithRelations[];
  const emailProspects = emails
    .map((id) => byId.get(id))
    .filter(Boolean) as ProspectWithRelations[];

  const bigSegment = callProspects.filter(
    (p) => (p.segment ?? segmentOf(p.headcount_range)) === "50 et plus",
  ).length;
  const overContacted = callProspects.filter((p) => contactCount(p) > 2).length;
  const dayValue = [...callProspects, ...emailProspects].reduce(
    (sum, p) => sum + Number(p.estimated_value || 0),
    0,
  );

  function regenerate() {
    const callPicks = callRanking(prospects, tomorrow, today)
      .slice(0, CALL_TARGET)
      .map((entry) => entry.prospect.id);
    const emailPicks = emailRanking(prospects, today)
      .filter((entry) => !callPicks.includes(entry.prospect.id))
      .slice(0, EMAIL_TARGET)
      .map((entry) => entry.prospect.id);
    setCalls(callPicks);
    setEmails(emailPicks);
    setSaved(false);
  }

  function remove(list: "calls" | "emails", id: string) {
    setSaved(false);
    if (list === "calls") setCalls((prev) => prev.filter((item) => item !== id));
    else setEmails((prev) => prev.filter((item) => item !== id));
  }

  /** Remplace une ligne (ou ajoute si `replacing.id` est vide). */
  function applyPick(pickId: string) {
    if (!replacing) return;
    const { list, id } = replacing;
    setSaved(false);
    const setter = list === "calls" ? setCalls : setEmails;
    const other = list === "calls" ? setEmails : setCalls;
    other((prev) => prev.filter((item) => item !== pickId));
    setter((prev) => {
      const withoutPick = prev.filter((item) => item !== pickId);
      if (!id) {
        const limit = list === "calls" ? CALL_TARGET : EMAIL_TARGET;
        if (withoutPick.length >= limit) return withoutPick;
        return [...withoutPick, pickId];
      }
      return withoutPick.map((item) => (item === id ? pickId : item));
    });
    setReplacing(null);
    setSearch("");
  }

  function validate() {
    savePlan({ date: tomorrow, calls, emails, closed: false });
    setSaved(true);
  }

  const pickerResults = prospects
    .filter((p) => p.status !== "Perdu" && p.status !== "Converti")
    .filter((p) =>
      search.trim()
        ? `${p.company_name} ${p.city || ""} ${p.sector || ""} ${p.group_name || ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        : true,
    )
    .slice(0, 25);

  return (
    <>
      <PageTitle
        title="Préparer demain"
        subtitle={`Liste du ${formatDate(tomorrow)} — ${CALL_TARGET} appels et ${EMAIL_TARGET} emails. Valeur cumulée : ${formatEuro(dayValue)}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="neutral" onClick={regenerate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reproposer
            </Button>
            <Link
              to="/aujourdhui"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
            >
              Aujourd'hui
            </Link>
          </div>
        }
      />

      {loaded && (bigSegment < 2 || overContacted > 2) ? (
        <div className="mb-4 rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Règles de composition non respectées
          </p>
          <ul className="mt-2 list-disc pl-5">
            {bigSegment < 2 ? (
              <li>
                Au moins 2 appels doivent être du segment « 50 et plus » — actuellement {bigSegment}
                .
              </li>
            ) : null}
            {overContacted > 2 ? (
              <li>
                Au plus 2 appels déjà contactés plus de deux fois — actuellement {overContacted}.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {loaded && bigSegment >= 2 && overContacted <= 2 ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary p-3 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Composition équilibrée : {bigSegment} prospect(s) « 50 et plus », {overContacted} déjà
          contacté(s) plus de deux fois.
        </p>
      ) : null}

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-medium">
            Appels ({callProspects.length}/{CALL_TARGET})
          </h3>
          {callProspects.length < CALL_TARGET ? (
            <Button
              variant="neutral"
              className="min-h-9 px-3"
              onClick={() => setReplacing({ list: "calls", id: "" })}
            >
              Ajouter un prospect
            </Button>
          ) : null}
        </div>
        <Card className="divide-y divide-border">
          {callProspects.length ? (
            callProspects.map((prospect) => (
              <PlanRow
                key={prospect.id}
                prospect={prospect}
                reason={callReasons.get(prospect.id) || "Ajouté manuellement"}
                onReplace={() => setReplacing({ list: "calls", id: prospect.id })}
                onRemove={() => remove("calls", prospect.id)}
              />
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Aucun appel dans la liste.</p>
          )}
        </Card>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-medium">
            Emails ({emailProspects.length}/{EMAIL_TARGET})
          </h3>
          {emailProspects.length < EMAIL_TARGET ? (
            <Button
              variant="neutral"
              className="min-h-9 px-3"
              onClick={() => setReplacing({ list: "emails", id: "" })}
            >
              Ajouter un prospect
            </Button>
          ) : null}
        </div>
        <Card className="divide-y divide-border">
          {emailProspects.length ? (
            emailProspects.map((prospect) => (
              <PlanRow
                key={prospect.id}
                prospect={prospect}
                reason={emailReasons.get(prospect.id) || "Ajouté manuellement"}
                onReplace={() => setReplacing({ list: "emails", id: prospect.id })}
                onRemove={() => remove("emails", prospect.id)}
              />
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              Aucun prospect sans téléphone exploitable ni barrage récent.
            </p>
          )}
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={validate} disabled={!calls.length && !emails.length}>
          Valider ma liste
        </Button>
        {saved ? (
          <p className="text-sm text-muted-foreground">
            Liste enregistrée pour le {formatDate(tomorrow)} — elle alimentera les blocs « Mes
            appels » et « Mes emails » de l'écran Aujourd'hui.
          </p>
        ) : null}
      </div>

      {replacing ? (
        <>
          <button
            type="button"
            aria-label="Fermer le sélecteur"
            className="fixed inset-0 z-40 bg-foreground/20"
            onClick={() => setReplacing(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[16px] font-medium">
                {replacing.id ? "Remplacer par" : "Ajouter à la liste"}
              </h3>
              <button
                type="button"
                aria-label="Fermer"
                className="rounded-lg p-2 hover:bg-accent"
                onClick={() => setReplacing(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              className={`${fieldClass} mt-3`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Entreprise, ville, secteur, groupe…"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Les prospects « groupe » et parqués restent sélectionnables manuellement.
            </p>
            <div className="mt-3 flex-1 overflow-y-auto">
              {pickerResults.map((prospect) => (
                <button
                  key={prospect.id}
                  type="button"
                  onClick={() => applyPick(prospect.id)}
                  className="flex w-full flex-col items-start gap-1 border-b border-border p-3 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium">
                    {prospect.company_name}
                    {prospect.city ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {prospect.city}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
                    <StatusBadge status={prospect.status} />
                    <span className="text-xs text-muted-foreground">
                      décision : {prospect.decision_level || "inconnu"} · {contactCount(prospect)}{" "}
                      contact(s)
                    </span>
                  </span>
                </button>
              ))}
              {pickerResults.length ? null : (
                <p className="p-3 text-sm text-muted-foreground">Aucun résultat.</p>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function PlanRow({
  prospect,
  reason,
  onReplace,
  onRemove,
}: {
  prospect: ProspectWithRelations;
  reason: Reason;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const contact = prospect.contacts[0];
  const phone = bestPhone(prospect);
  const email = contact?.email || prospect.main_email;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div>
        <p className="text-sm font-medium">
          {prospect.company_name}
          {prospect.city ? (
            <span className="ml-2 font-normal text-muted-foreground">{prospect.city}</span>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
          <StatusBadge status={prospect.status} />
          <span className="inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
            décision : {prospect.decision_level || "inconnu"}
          </span>
          <span className="text-xs text-muted-foreground">
            {contactCount(prospect)} contact(s) consigné(s)
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {phone || "téléphone manquant"}
          {" · "}
          {contact
            ? `${contactName(contact) || "Contact"}${contact.role_title ? ` — ${contact.role_title}` : ""}`
            : prospect.decision_maker || "contact à identifier"}
          {email ? ` · ${email}` : ""}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          {reason}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="neutral" className="min-h-9 px-3" onClick={onReplace}>
          Remplacer
        </Button>
        <Button variant="neutral" className="min-h-9 px-3" onClick={onRemove}>
          Retirer
        </Button>
      </div>
    </div>
  );
}

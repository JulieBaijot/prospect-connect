import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, labelClass } from "@/components/prm/ui";
import {
  formatDate,
  loadLogs,
  loadProspects,
  todayIsoDate,
  type Contact,
  type Prospect,
  type ProspectionLog,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/calendrier")({
  head: () => ({
    meta: [
      { title: "Calendrier des rappels — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Vue mensuelle des rappels planifiés, promesses, réveils de parking et rendez-vous, pour équilibrer la charge des journées.",
      },
      { property: "og:title", content: "Calendrier des rappels — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Rappels, promesses, réveils de parking et rendez-vous, mois par mois.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <CalendarPage />
    </AppLayout>
  ),
});

type FullLog = ProspectionLog & { prospects: Prospect | null; contacts: Contact | null };

type Kind = "rappel" | "promesse" | "parking" | "rdv";

interface Entry {
  date: string;
  kind: Kind;
  company: string;
  detail: string;
  prospectId: string;
}

const kindLabel: Record<Kind, string> = {
  rappel: "Rappel",
  promesse: "Promesse",
  parking: "Réveil",
  rdv: "RDV",
};

const kindClass: Record<Kind, string> = {
  rappel: "border-border bg-secondary text-foreground",
  promesse: "border-destructive/40 bg-destructive/10 text-destructive",
  parking: "border-border bg-accent text-foreground",
  rdv: "border-primary/40 bg-primary/10 text-foreground",
};

/** Charge de travail au-delà de laquelle une journée est signalée comme trop chargée. */
const DAY_LIMIT = 6;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildEntries(prospects: ProspectWithRelations[], logs: FullLog[]): Entry[] {
  const entries: Entry[] = [];
  for (const prospect of prospects) {
    if (prospect.status === "Perdu" || prospect.status === "Converti") continue;
    if (prospect.next_action_date) {
      entries.push({
        date: prospect.next_action_date.slice(0, 10),
        kind: "rappel",
        company: prospect.company_name,
        detail: prospect.city || "",
        prospectId: prospect.id,
      });
    }
    if (prospect.status === "Parké" && prospect.parking_date) {
      entries.push({
        date: prospect.parking_date.slice(0, 10),
        kind: "parking",
        company: prospect.company_name,
        detail: prospect.parking_trigger || "motif non renseigné",
        prospectId: prospect.id,
      });
    }
  }
  for (const log of logs) {
    if (log.promise_date && log.promise_kept === null) {
      entries.push({
        date: log.promise_date.slice(0, 10),
        kind: "promesse",
        company: log.prospects?.company_name || "Prospect",
        detail: log.promise_text || log.action_type,
        prospectId: log.prospect_id,
      });
    }
    if (log.meeting_date) {
      entries.push({
        date: log.meeting_date.slice(0, 10),
        kind: "rdv",
        company: log.prospects?.company_name || "Prospect",
        detail: "Rendez-vous",
        prospectId: log.prospect_id,
      });
    }
  }
  return entries;
}

function CalendarPage() {
  const today = todayIsoDate();
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [logs, setLogs] = useState<FullLog[]>([]);
  const [cursor, setCursor] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(today);

  useEffect(() => {
    loadProspects().then(setProspects);
    loadLogs().then(setLogs);
  }, []);

  const entries = useMemo(() => buildEntries(prospects, logs), [prospects, logs]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const overloaded = useMemo(
    () =>
      [...byDay.entries()]
        .filter(([date, list]) => date >= today && list.length > DAY_LIMIT)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5),
    [byDay, today],
  );

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const selectedEntries = (byDay.get(selected) || []).sort((a, b) =>
    a.kind.localeCompare(b.kind),
  );

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <>
      <PageTitle
        title="Calendrier des rappels"
        subtitle="Tout ce qui est planifié : rappels, promesses, réveils de parking et rendez-vous."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="neutral" className="min-h-10 px-3" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium capitalize">{monthLabel}</span>
            <Button variant="neutral" className="min-h-10 px-3" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
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

      {overloaded.length ? (
        <div className="mb-4 rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Journées trop chargées
          </p>
          <ul className="mt-2 list-disc pl-5">
            {overloaded.map(([date, list]) => (
              <li key={date}>
                {formatDate(date)} — {list.length} éléments planifiés. Étalez quelques rappels.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <p key={day} className={labelClass}>
              {day}
            </p>
          ))}
          {days.map((date) => {
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const list = byDay.get(iso) || [];
            const inMonth = monthKey(date) === monthKey(cursor);
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={`min-h-24 rounded-lg border p-2 text-left transition-colors ${
                  selected === iso ? "border-primary" : "border-border"
                } ${inMonth ? "bg-card" : "bg-secondary/40 text-muted-foreground"} hover:bg-accent`}
              >
                <span
                  className={`text-sm font-medium ${isToday ? "rounded-md bg-primary px-2 py-0.5 text-primary-foreground" : ""}`}
                >
                  {date.getDate()}
                </span>
                <span className="mt-1 flex flex-col gap-1">
                  {list.slice(0, 3).map((entry, index) => (
                    <span
                      key={`${entry.prospectId}-${entry.kind}-${index}`}
                      className={`truncate rounded border px-1 text-[11px] ${kindClass[entry.kind]}`}
                    >
                      {kindLabel[entry.kind]} · {entry.company}
                    </span>
                  ))}
                  {list.length > 3 ? (
                    <span className="text-[11px] text-muted-foreground">
                      +{list.length - 3} autre(s)
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="mt-6">
        <h3 className="mb-3 text-[16px] font-medium">Le {formatDate(selected)}</h3>
        <Card className="divide-y divide-border">
          {selectedEntries.length ? (
            selectedEntries.map((entry, index) => (
              <div
                key={`${entry.prospectId}-${entry.kind}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{entry.company}</p>
                  <p className="text-sm text-muted-foreground">{entry.detail || "—"}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${kindClass[entry.kind]}`}
                >
                  {kindLabel[entry.kind]}
                </span>
              </div>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Rien de planifié ce jour-là.</p>
          )}
        </Card>
      </section>
    </>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, PhoneCall, Search, UserRoundCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Card, PageTitle, SegmentBadge, StatusBadge, labelClass } from "@/components/prm/ui";
import {
  bestPhone,
  contactName,
  formatDate,
  formatEuro,
  isDueTodayOrLate,
  loadLogs,
  loadProspects,
  prioritizeCallSession,
  prioritizeQualificationSession,
  shortDateTime,
  todayIsoDate,
  type ProspectionLog,
  type Prospect,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/aujourdhui")({
  head: () => ({
    meta: [
      { title: "Aujourd'hui — PRM Santé-Sécurité" },
      {
        name: "description",
        content: "Tableau de bord quotidien des rappels, RDV, appels et qualifications.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <TodayPage />
    </AppLayout>
  ),
});

function TodayPage() {
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [logs, setLogs] = useState<Array<ProspectionLog & { prospects: Prospect | null }>>([]);

  useEffect(() => {
    loadProspects().then(setProspects);
    loadLogs().then((items) => setLogs(items));
  }, []);

  const today = todayIsoDate();
  const dashboard = useMemo(() => {
    const active = prospects.filter((p) => !["Perdu", "Converti"].includes(p.status));
    const reminders = active
      .filter((p) => isDueTodayOrLate(p.next_action_date))
      .sort((a, b) => (a.next_action_date || "9999").localeCompare(b.next_action_date || "9999"));
    const meetings = logs
      .filter((log) => log.meeting_date?.slice(0, 10) === today)
      .sort((a, b) => (a.meeting_date || "").localeCompare(b.meeting_date || ""));
    const callCycle = prioritizeCallSession(active, 20);
    const callReminders = callCycle.filter((p) => isDueTodayOrLate(p.next_action_date)).length;
    const qualificationCycle = prioritizeQualificationSession(active, 20);
    const dayValue = callCycle.reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);

    return { reminders, meetings, callCycle, callReminders, qualificationCycle, dayValue };
  }, [logs, prospects, today]);

  return (
    <>
      <PageTitle
        title="Aujourd'hui"
        subtitle="Rappels, rendez-vous, cycle d'appels et qualification/recherche à traiter en priorité."
        action={
          <Link
            to="/prospects"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            Base prospects
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-5">
        <Kpi
          icon={<CalendarClock className="h-4 w-4" />}
          label="Rappels dus"
          value={dashboard.reminders.length}
        />
        <Kpi
          icon={<UserRoundCheck className="h-4 w-4" />}
          label="RDV du jour"
          value={dashboard.meetings.length}
        />
        <Kpi
          icon={<PhoneCall className="h-4 w-4" />}
          label="Cycle appels"
          value={`${dashboard.callCycle.length}/20`}
        />
        <Kpi
          icon={<Search className="h-4 w-4" />}
          label="Qualification"
          value={`${dashboard.qualificationCycle.length}/20`}
        />
        <Kpi
          icon={<Coins className="h-4 w-4" />}
          label="Valeur liste du jour"
          value={formatEuro(dashboard.dayValue)}
        />
      </div>


      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ActionSection
          title="Rappels prévus"
          items={dashboard.reminders}
          empty="Aucun rappel prévu ou en retard."
        />
        <MeetingSection logs={dashboard.meetings} />
        <SessionStartSection
          title="Session d'appels"
          count={dashboard.callCycle.length}
          subtitle={`${dashboard.callReminders} rappel(s) intégré(s) en priorité · ${Math.max(0, dashboard.callCycle.length - dashboard.callReminders)} autre(s) appel(s)`}
          to="/session-appels"
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <SessionStartSection
          title="Session de qualification"
          count={dashboard.qualificationCycle.length}
          subtitle="20 fiches maximum à enrichir, triées par priorité et données manquantes."
          to="/qualification"
          icon={<Search className="h-4 w-4" />}
        />
      </div>
    </>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className={labelClass}>{label}</p>
      </div>
      <p className="mt-2 text-[24px] font-medium">{value}</p>
    </Card>
  );
}

function ActionSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: ProspectWithRelations[];
  empty: string;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-[16px] font-medium">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.map((p) => <ProspectRow key={p.id} prospect={p} />)
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </Card>
  );
}

function SessionStartSection({
  title,
  count,
  subtitle,
  to,
  icon,
}: {
  title: string;
  count: number;
  subtitle: string;
  to: "/session-appels" | "/qualification";
  icon: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className={labelClass}>{title}</p>
      </div>
      <p className="mt-2 text-[28px] font-medium">{count}/20</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / 20) * 100}%` }} />
      </div>
      <Link
        to={to}
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Commencer la session
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

function MeetingSection({
  logs,
}: {
  logs: Array<ProspectionLog & { prospects: Prospect | null }>;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-[16px] font-medium">Rendez-vous du jour</h3>
      <div className="mt-3 grid gap-2">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{log.prospects?.company_name || "Prospect"}</p>
                <p className="text-sm text-muted-foreground">{shortDateTime(log.meeting_date)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {log.objective || log.action_type} ·{" "}
                {log.video_link || "Lien à compléter si besoin"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Aucun RDV planifié aujourd'hui.</p>
        )}
      </div>
    </Card>
  );
}

function ProspectRow({ prospect }: { prospect: ProspectWithRelations }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{prospect.company_name}</p>
          <p className="text-sm text-muted-foreground">
            {contactName(prospect.contacts[0])} · {prospect.city || "Ville à compléter"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
          <StatusBadge status={prospect.status} />
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-3">
        <p>{bestPhone(prospect) || "Téléphone à compléter"}</p>
        <p>Relance : {formatDate(prospect.next_action_date)}</p>
        <p>{formatEuro(prospect.estimated_value)}</p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/prm/AppLayout";
import { Card, PageTitle, labelClass } from "@/components/prm/ui";
import {
  bestPhone,
  dataQualityIssues,
  formatEuro,
  formatDate,
  isDueTodayOrLate,
  loadLogs,
  loadProspects,
  type ProspectionLog,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — PRM Santé-Sécurité" },
      { name: "description", content: "Indicateurs de prospection et pipeline." },
    ],
  }),
  component: () => (
    <AppLayout>
      <StatsPage />
    </AppLayout>
  ),
});

function StatsPage() {
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [logs, setLogs] = useState<ProspectionLog[]>([]);
  useEffect(() => {
    loadProspects().then(setProspects);
    loadLogs().then((items) => setLogs(items));
  }, []);
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const calls = logs.filter((l) => l.canal === "téléphone");
    const callsToday = calls.filter(
      (l) => new Date(l.action_date).toDateString() === new Date().toDateString(),
    ).length;
    const callsWeek = calls.filter((l) => +new Date(l.action_date) >= weekAgo).length;
    const rdvWeek = logs.filter(
      (l) => l.result === "RDV" && +new Date(l.action_date) >= weekAgo,
    ).length;
    const rdvMonth = logs.filter(
      (l) =>
        l.result === "RDV" && Date.now() - +new Date(l.action_date) <= 31 * 24 * 60 * 60 * 1000,
    ).length;
    const exchanges = logs.filter((l) => l.result === "Échange" || l.result === "RDV").length;
    const rdv = logs.filter((l) => l.result === "RDV").length;
    const nrp = logs.filter((l) => l.result === "NRP").length;
    const converted = prospects.filter((p) => p.status === "Converti").length;
    const pipeline = prospects.reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);
    return {
      calls,
      callsToday,
      callsWeek,
      rdvWeek,
      rdvMonth,
      due: prospects.filter((p) => isDueTodayOrLate(p.next_action_date)).length,
      late: prospects.filter(
        (p) => p.next_action_date && p.next_action_date < new Date().toISOString().slice(0, 10),
      ).length,
      noPhone: prospects.filter((p) => !bestPhone(p)).length,
      noContact: prospects.filter((p) => !p.contacts.length).length,
      penetration: calls.length ? Math.round((exchanges / calls.length) * 100) : 0,
      rdvRate: calls.length ? Math.round((rdv / calls.length) * 100) : 0,
      nrpRate: calls.length ? Math.round((nrp / calls.length) * 100) : 0,
      transform: prospects.length ? Math.round((converted / prospects.length) * 100) : 0,
      pipeline,
    };
  }, [prospects, logs]);
  const chart = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dayLogs = logs.filter((l) => new Date(l.action_date).toDateString() === d.toDateString());
    return {
      jour: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      emails: dayLogs.filter((l) => l.canal === "email").length,
      appels: dayLogs.filter((l) => l.canal === "téléphone").length,
      rdv: dayLogs.filter((l) => l.result === "RDV").length,
    };
  });
  return (
    <>
      <PageTitle
        title="Stats"
        subtitle="Vue synthétique du pipeline et de l'activité hebdomadaire."
      />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total prospects" value={prospects.length} />
        <Kpi label="Appels aujourd'hui" value={stats.callsToday} />
        <Kpi label="Appels semaine" value={stats.callsWeek} />
        <Kpi label="À appeler" value={stats.due} />
        <Kpi label="Sans téléphone" value={stats.noPhone} />
        <Kpi label="Sans contact" value={stats.noContact} />
        <Kpi label="Retards relance" value={stats.late} />
        <Kpi label="Pénétration" value={`${stats.penetration}%`} />
        <Kpi label="Taux RDV" value={`${stats.rdvRate}%`} />
        <Kpi label="Taux NRP" value={`${stats.nrpRate}%`} />
        <Kpi label="RDV 7 jours" value={stats.rdvWeek} />
        <Kpi label="RDV 30 jours" value={stats.rdvMonth} />
        <Kpi label="Transformation" value={`${stats.transform}%`} />
        <Kpi label="CA pipeline" value={formatEuro(stats.pipeline)} />
      </div>
      <Card className="mt-4 p-4">
        <h3 className="text-[16px] font-medium">Activité hebdomadaire</h3>
        <div className="mt-4 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="jour" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="emails" fill="var(--status-warm)" />
              <Bar dataKey="appels" fill="var(--primary)" />
              <Bar dataKey="rdv" fill="var(--status-won)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-[16px] font-medium">Prochaines actions</h3>
          <div className="mt-3 grid gap-2">
            {prospects
              .filter((p) => p.next_action_date && !["Perdu", "Converti"].includes(p.status))
              .sort(
                (a, b) =>
                  +new Date(a.next_action_date || "2099-12-31") -
                  +new Date(b.next_action_date || "2099-12-31"),
              )
              .slice(0, 10)
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">{p.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(p.next_action_date)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.city || "Ville à compléter"} · {p.status} · {p.current_stage}
                  </p>
                </div>
              ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-[16px] font-medium">Fiches à compléter</h3>
          <div className="mt-3 grid gap-2">
            {prospects
              .filter((p) => dataQualityIssues(p).length > 0)
              .slice(0, 10)
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="font-medium">{p.company_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {dataQualityIssues(p).join(" · ")}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className={labelClass}>{label}</p>
      <p className="mt-2 text-[22px] font-medium">{value}</p>
    </Card>
  );
}

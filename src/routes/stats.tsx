import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/prm/AppLayout";
import { Card, PageTitle, labelClass } from "@/components/prm/ui";
import {
  bestPhone,
  formatEuro,
  isParked,
  loadLogs,
  loadProspects,
  type ProspectionLog,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Pilotage — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Quatre indicateurs de pilotage : décrochage, régularité, promesses tenues et pipeline actif.",
      },
      { property: "og:title", content: "Pilotage — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Décrochage, régularité, promesses tenues, pipeline actif et stock d'appel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <StatsPage />
    </AppLayout>
  ),
});

const DAY = 86400000;

function isoDay(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function StatsPage() {
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [logs, setLogs] = useState<ProspectionLog[]>([]);

  useEffect(() => {
    void loadProspects().then(setProspects);
    void loadLogs().then(setLogs);
  }, []);

  const calls = useMemo(() => logs.filter((l) => l.canal === "téléphone"), [logs]);

  const isPickup = (result?: string | null) => {
    const r = (result ?? "").toLowerCase();
    return r.includes("échange") || r.includes("echange") || r.includes("rdv");
  };

  /** Taux de décrochage par semaine sur 8 semaines. */
  const weekly = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 8 }, (_, i) => {
      const end = now - (7 - i) * 7 * DAY;
      const start = end - 7 * DAY;
      const inWeek = calls.filter((l) => {
        const t = +new Date(l.action_date);
        return t > start && t <= end;
      });
      const pickups = inWeek.filter((l) => isPickup(l.result)).length;
      return {
        semaine: new Date(end).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        appels: inWeek.length,
        décrochages: pickups,
        taux: inWeek.length ? Math.round((pickups / inWeek.length) * 100) : 0,
      };
    });
  }, [calls]);

  /**
   * KPI décrochage : sur les 30 derniers jours ; si aucun appel sur la période,
   * on retombe sur l'ensemble des appels consignés pour ne jamais afficher 0/0 à tort.
   */
  const pickupKpi = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    const recent = calls.filter((l) => +new Date(l.action_date) >= since);
    const base = recent.length ? recent : calls;
    const pickups = base.filter((l) => isPickup(l.result)).length;
    return {
      appels: base.length,
      décrochages: pickups,
      taux: base.length ? Math.round((pickups / base.length) * 100) : 0,
      periode: recent.length ? "30 derniers jours" : "historique complet",
    };
  }, [calls]);


  /** Régularité : jours des 30 derniers où au moins 3 appels ont été passés. */
  const regularite = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    const perDay = new Map<string, number>();
    for (const l of calls) {
      if (+new Date(l.action_date) < since) continue;
      const key = isoDay(l.action_date);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    let full = 0;
    perDay.forEach((count) => {
      if (count >= 3) full += 1;
    });
    return { full, actifs: perDay.size };
  }, [calls]);

  const promesses = useMemo(() => {
    const withPromise = logs.filter((l) => l.promise_date || l.promise_text);
    const kept = withPromise.filter((l) => l.promise_kept === true).length;
    return {
      total: withPromise.length,
      kept,
      rate: withPromise.length ? Math.round((kept / withPromise.length) * 100) : 0,
    };
  }, [logs]);

  const pipeline = useMemo(
    () =>
      prospects
        .filter((p) => p.status === "En contact" || p.status === "En discussion")
        .reduce((sum, p) => sum + Number(p.estimated_value || 0), 0),
    [prospects],
  );

  const stock = useMemo(
    () =>
      prospects.filter((p) => p.status !== "Perdu" && !isParked(p) && Boolean(bestPhone(p))).length,
    [prospects],
  );

  return (
    <>
      <PageTitle
        title="Pilotage"
        subtitle="Quatre indicateurs qui comptent, plus mon stock de travail."
      />

      {stock < 30 && (
        <div className="mt-4 rounded-[10px] border border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-medium text-foreground">
            Stock d'appel faible : {stock} prospects disponibles (seuil 30).
          </p>
          <p className="text-sm text-muted-foreground">
            Prévois une session d'import ou de qualification pour reconstituer la liste.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Taux de décrochage (7 j)"
          value={`${currentWeek?.taux ?? 0}%`}
          hint={`${currentWeek?.décrochages ?? 0} décrochages / ${currentWeek?.appels ?? 0} appels`}
        />
        <Kpi
          label="Régularité (30 j)"
          value={`${regularite.full} j`}
          hint={`jours avec 3 appels ou plus · ${regularite.actifs} jours d'activité`}
        />
        <Kpi
          label="Promesses tenues"
          value={`${promesses.rate}%`}
          hint={`${promesses.kept} tenues / ${promesses.total} promesses`}
        />
        <Kpi
          label="Pipeline actif"
          value={formatEuro(pipeline)}
          hint="En contact + En discussion"
        />
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-medium">Taux de décrochage par semaine</h2>
          <p className="text-sm text-muted-foreground">
            Stock d'appel : {stock} prospects joignables
          </p>
        </div>
        <div className="mt-4 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="semaine" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="taux" name="Décrochage" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className={labelClass}>{label}</p>
      <p className="mt-2 text-[22px] font-medium">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </Card>
  );
}

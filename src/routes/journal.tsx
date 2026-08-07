import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, fieldClass } from "@/components/prm/ui";
import {
  contactName,
  exportCsv,
  formatDate,
  loadLogs,
  shortDateTime,
  statuses,
  type Category,
  type Contact,
  type ProspectionLog,
  type Prospect,
} from "@/lib/prm";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal de prospection — PRM Santé-Sécurité" },
      { name: "description", content: "Historique filtrable des actions de prospection." },
    ],
  }),
  component: () => (
    <AppLayout>
      <JournalPage />
    </AppLayout>
  ),
});

function JournalPage() {
  const [logs, setLogs] = useState<
    Array<ProspectionLog & { prospects: Prospect | null; contacts: Contact | null }>
  >([]);
  const [filters, setFilters] = useState({ period: "", canal: "", status: "" });
  useEffect(() => {
    loadLogs()
      .then(setLogs)
      .catch(() => setLogs([]));
  }, []);
  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const date = new Date(log.action_date);
        const now = new Date();
        const withinWeek = now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
        const withinMonth = now.getTime() - date.getTime() <= 31 * 24 * 60 * 60 * 1000;
        return (
          (!filters.period || (filters.period === "week" ? withinWeek : withinMonth)) &&
          (!filters.canal || log.canal === filters.canal) &&
          (!filters.status || log.prospects?.status === filters.status)
        );
      }),
    [logs, filters],
  );
  function download() {
    exportCsv(
      "journal-prospection.csv",
      filtered.map((log) => ({
        Date: shortDateTime(log.action_date),
        Entreprise: log.prospects?.company_name,
        Contact: contactName(log.contacts),
        Canal: log.canal,
        Étape: log.stage,
        Objectif: log.objective,
        Résultat: log.result,
        Notes: log.notes,
        "Date RDV": formatDate(log.meeting_date),
      })),
    );
  }
  return (
    <>
      <PageTitle
        title="Journal de prospection"
        subtitle="Actions automatiquement consignées depuis les sessions d'appels."
        action={
          <Button onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
          <select
            className={fieldClass}
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
          >
            <option value="">Toute période</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <select
            className={fieldClass}
            value={filters.canal}
            onChange={(e) => setFilters({ ...filters, canal: e.target.value })}
          >
            <option value="">Tous canaux</option>
            <option value="email">email</option>
            <option value="téléphone">téléphone</option>
            <option value="physique">physique</option>
          </select>
          <select
            className={fieldClass}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Tous statuts</option>
            {statuses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Date",
                  "Entreprise",
                  "Contact",
                  "Canal",
                  "Étape",
                  "Objectif",
                  "Résultat",
                  "Notes",
                  "RDV date",
                ].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-3">{shortDateTime(log.action_date)}</td>
                  <td className="px-4 py-3">{log.prospects?.company_name || "—"}</td>
                  <td className="px-4 py-3">{contactName(log.contacts)}</td>
                  <td className="px-4 py-3">{log.canal}</td>
                  <td className="px-4 py-3">{log.stage}</td>
                  <td className="px-4 py-3">{log.objective}</td>
                  <td className="px-4 py-3">{log.result}</td>
                  <td className="px-4 py-3">{log.notes}</td>
                  <td className="px-4 py-3">{formatDate(log.meeting_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

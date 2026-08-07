import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, SegmentBadge } from "@/components/prm/ui";
import {
  formatDate,
  formatEuro,
  loadProspects,
  todayIsoDate,
  updateProspect,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/parking")({
  head: () => ({
    meta: [
      { title: "Parking — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Tous les prospects parkés, triés par date de réveil, avec leur motif de reprise écrit.",
      },
      { property: "og:title", content: "Parking — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Ce qui revient dans les semaines à venir : dates de réveil et motifs de reprise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <ParkingPage />
    </AppLayout>
  ),
});

function ParkingPage() {
  const today = todayIsoDate();
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
  }, []);
  async function refresh() {
    setProspects(await loadProspects());
  }

  const parked = useMemo(
    () =>
      prospects
        .filter((prospect) => prospect.status === "Parké")
        .sort((a, b) =>
          (a.parking_date || "9999-12-31").localeCompare(b.parking_date || "9999-12-31"),
        ),
    [prospects],
  );

  const due = parked.filter((p) => p.parking_date && p.parking_date <= today);
  const parkedValue = parked.reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);

  async function wake(prospect: ProspectWithRelations) {
    await updateProspect(prospect.id, {
      status: "En contact",
      parking_date: null,
      next_action_date: todayIsoDate(),
    });
    setMessage(`${prospect.company_name} réveillé — à traiter dès aujourd'hui.`);
    await refresh();
  }

  return (
    <>
      <PageTitle
        title="Parking"
        subtitle={`${parked.length} prospect(s) en sommeil — ${due.length} arrivé(s) à échéance. Valeur en attente : ${formatEuro(parkedValue)}.`}
        action={
          <Link
            to="/demain"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
          >
            Préparer demain
          </Link>
        }
      />

      {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}

      <Card className="divide-y divide-border">
        {parked.length ? (
          parked.map((prospect) => {
            const echu = Boolean(prospect.parking_date && prospect.parking_date <= today);
            return (
              <div
                key={prospect.id}
                className={`flex flex-wrap items-start justify-between gap-3 p-4 ${echu ? "bg-secondary/60" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium">
                    {prospect.company_name}
                    {prospect.city ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {prospect.city}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <SegmentBadge headcount={prospect.headcount_range} segment={prospect.segment} />
                    <span className="inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      réveil :{" "}
                      {prospect.parking_date ? formatDate(prospect.parking_date) : "date manquante"}
                    </span>
                    {echu ? (
                      <span className="inline-flex rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
                        à reprendre
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Motif de reprise : </span>
                    {prospect.parking_trigger || "motif non renseigné"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="neutral" className="min-h-9 px-3" onClick={() => wake(prospect)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Réveiller
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Aucun prospect parké.</p>
        )}
      </Card>
    </>
  );
}

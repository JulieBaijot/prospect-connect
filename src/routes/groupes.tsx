import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarPlus, MapPin, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, SegmentBadge, StatusBadge, fieldClass } from "@/components/prm/ui";
import { loadPlan, savePlan, todayPlan } from "@/lib/day-plan";
import {
  bestPhone,
  contactName,
  formatEuro,
  loadProspects,
  todayIsoDate,
  updateProspect,
  type ProspectWithRelations,
} from "@/lib/prm";

export const Route = createFileRoute("/groupes")({
  head: () => ({
    meta: [
      { title: "Groupes — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Les établissements dont la décision remonte au groupe : hors rotation automatique, mais toujours visibles et réactivables.",
      },
      { property: "og:title", content: "Groupes — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content:
          "Prospects à décision groupe, regroupés par groupe, avec la note d'explication et deux actions : retenter ou repasser en site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <GroupsPage />
    </AppLayout>
  ),
});

const CALL_LIMIT = 6;

function GroupsPage() {
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [planIds, setPlanIds] = useState<string[]>([]);

  useEffect(() => {
    void refresh();
    setPlanIds(todayPlan().calls);
  }, []);

  async function refresh() {
    const items = await loadProspects();
    setProspects(items);
    setNotes(
      Object.fromEntries(
        items
          .filter((p) => p.decision_level === "groupe")
          .map((p) => [p.id, p.comments || ""] as const),
      ),
    );
  }

  const groups = useMemo(() => {
    const pool = prospects.filter((p) => p.decision_level === "groupe");
    const map = new Map<string, ProspectWithRelations[]>();
    for (const prospect of pool) {
      const key = prospect.group_name?.trim() || "";
      map.set(key, [...(map.get(key) || []), prospect]);
    }
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => a.company_name.localeCompare(b.company_name)),
      }))
      .sort((a, b) => {
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [prospects]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const groupValue = groups.reduce(
    (sum, group) => sum + group.items.reduce((acc, p) => acc + Number(p.estimated_value || 0), 0),
    0,
  );

  /** Ajout manuel à la liste d'appels du jour : la décision reste la mienne. */
  function addToToday(prospect: ProspectWithRelations) {
    const date = todayIsoDate();
    const plan = loadPlan(date);
    if (plan.calls.includes(prospect.id)) {
      setMessage(`${prospect.company_name} est déjà dans ma liste du jour.`);
      return;
    }
    if (plan.calls.length >= CALL_LIMIT) {
      setMessage(
        `Liste du jour complète (${CALL_LIMIT} appels) — retirez une ligne depuis l'écran Aujourd'hui.`,
      );
      return;
    }
    const next = { ...plan, calls: [...plan.calls, prospect.id] };
    savePlan(next);
    setPlanIds(next.calls);
    setMessage(`${prospect.company_name} ajouté à ma liste d'appels du jour.`);
  }

  /** L'établissement décide finalement lui-même : il retourne dans la rotation. */
  async function backToSite(prospect: ProspectWithRelations) {
    await updateProspect(prospect.id, { decision_level: "site" });
    setMessage(`${prospect.company_name} repassé en décision site — il revient dans la rotation.`);
    await refresh();
  }

  async function saveNote(prospect: ProspectWithRelations) {
    await updateProspect(prospect.id, { comments: notes[prospect.id]?.trim() || null });
    setMessage(`Note enregistrée pour ${prospect.company_name}.`);
    await refresh();
  }

  return (
    <>
      <PageTitle
        title="Groupes"
        subtitle={`${total} établissement(s) à décision groupe dans ${groups.length} groupe(s) — hors rotation automatique. Valeur représentée : ${formatEuro(groupValue)}.`}
        action={
          <Link
            to="/aujourdhui"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
          >
            Aujourd'hui
          </Link>
        }
      />

      {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}

      {groups.length ? (
        groups.map((group) => (
          <section key={group.name || "sans-groupe"} className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-[16px] font-medium">
              <Building2 className="h-4 w-4" />
              {group.name || "Groupe non renseigné"}
              <span className="text-sm font-normal text-muted-foreground">
                {group.items.length} établissement(s)
              </span>
            </h3>
            <Card className="divide-y divide-border">
              {group.items.map((prospect) => {
                const contact = prospect.contacts.find((c) => contactName(c));
                return (
                  <div key={prospect.id} className="flex flex-wrap justify-between gap-4 p-4">
                    <div className="min-w-[260px] flex-1">
                      <p className="text-sm font-medium">
                        {prospect.company_name}
                        {prospect.city ? (
                          <span className="ml-2 inline-flex items-center gap-1 font-normal text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {prospect.city}
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <SegmentBadge
                          headcount={prospect.headcount_range}
                          segment={prospect.segment}
                        />
                        <StatusBadge status={prospect.status} />
                        <span className="inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          décision : groupe
                        </span>
                        {planIds.includes(prospect.id) ? (
                          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                            dans ma liste du jour
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contact
                          ? `${contactName(contact)}${contact.role_title ? ` — ${contact.role_title}` : ""}`
                          : prospect.decision_maker || "contact à identifier"}
                        {bestPhone(prospect) ? ` · ${bestPhone(prospect)}` : ""}
                      </p>
                      <label className="mt-2 block">
                        <span className="text-xs text-muted-foreground">
                          Pourquoi la décision remonte au groupe
                        </span>
                        <textarea
                          rows={2}
                          className={`${fieldClass} mt-1`}
                          value={notes[prospect.id] ?? ""}
                          onChange={(event) =>
                            setNotes((prev) => ({ ...prev, [prospect.id]: event.target.value }))
                          }
                          placeholder="Ex. achats centralisés au siège, référencement national du prestataire…"
                        />
                      </label>
                      <Button
                        variant="neutral"
                        className="mt-2 min-h-9 px-3"
                        onClick={() => saveNote(prospect)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer la note
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button className="min-h-9 px-3" onClick={() => addToToday(prospect)}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Ajouter à ma liste du jour
                      </Button>
                      <Button
                        variant="neutral"
                        className="min-h-9 px-3"
                        onClick={() => backToSite(prospect)}
                      >
                        Repasser en site
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        ))
      ) : (
        <Card>
          <p className="p-4 text-sm text-muted-foreground">
            Aucun prospect à décision groupe pour le moment.
          </p>
        </Card>
      )}
    </>
  );
}

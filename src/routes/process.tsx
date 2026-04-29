import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/prm/AppLayout";
import { Card, PageTitle, labelClass } from "@/components/prm/ui";
import { playbookNodes, stages } from "@/lib/prm";

export const Route = createFileRoute("/process")({
  head: () => ({
    meta: [
      { title: "Process commercial — PRM Santé-Sécurité" },
      { name: "description", content: "Playbook de prospection santé-sécurité par nœuds et transitions." },
    ],
  }),
  component: ProcessRoute,
});

function ProcessRoute() {
  return (
    <AppLayout>
      <PageTitle
        title="Process commercial"
        subtitle="Vue des nœuds utilisés pendant les sessions d'appels."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {stages.map((stage) => {
          const node = playbookNodes[stage];
          return (
            <Card key={node.key} className="p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className={labelClass}>Nœud {node.key}</p>
                  <h3 className="mt-1 text-[18px] font-medium">{node.label}</h3>
                </div>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {node.outcomes.length} issues
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{node.objective}</p>
              <div className="mt-4 rounded-r-md border-l-[3px] border-script-border bg-script p-3 text-sm leading-6">
                {node.script}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {node.checklist.map((item) => (
                  <span key={item} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid gap-2">
                {node.outcomes.map((outcome) => (
                  <div key={outcome.key} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm font-medium">{outcome.label}</p>
                      <p className="text-xs text-muted-foreground">
                        → {outcome.nextStage} · {outcome.delayDays === 0 ? "immédiat" : `J+${outcome.delayDays}`}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{outcome.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
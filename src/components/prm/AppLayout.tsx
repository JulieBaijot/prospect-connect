import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BarChart3, Database, GitBranch, ListChecks, PhoneCall, Search } from "lucide-react";

const navItems = [
  { to: "/session-appels", label: "Session d'appels", icon: PhoneCall },
  { to: "/process", label: "Process", icon: GitBranch },
  { to: "/prospects", label: "Base prospects", icon: Database },
  { to: "/integration-prospects", label: "Intégration prospects", icon: Search },
  { to: "/journal", label: "Journal de prospection", icon: ListChecks },
  { to: "/stats", label: "Stats", icon: BarChart3 },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                PRM santé-sécurité freelance
              </p>
              <h1 className="text-[22px] font-medium leading-tight text-foreground">
                Cockpit prospection Julie Baijot
              </h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Prospects, appels, relances et pipeline formation/conseil dans un espace de travail desktop.
            </p>
          </div>
          <nav className="flex gap-2 overflow-x-auto rounded-[10px] border border-border bg-card p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  inactiveProps={{
                    className:
                      "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  }}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1480px] px-4 py-5 lg:px-6">{children}</main>
    </div>
  );
}

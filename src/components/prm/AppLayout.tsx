import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Database,
  ListChecks,
  PhoneCall,
  Search,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/prm/ui";

const navItems = [
  { to: "/aujourdhui", label: "Aujourd'hui", icon: CalendarDays },
  { to: "/session-appels", label: "Session d'appels", icon: PhoneCall },
  { to: "/qualification", label: "Qualification", icon: Wand2 },
  { to: "/prospects", label: "Base prospects", icon: Database },
  { to: "/integration-prospects", label: "Intégration prospects", icon: Search },
  { to: "/journal", label: "Journal de prospection", icon: ListChecks },
  { to: "/stats", label: "Stats", icon: BarChart3 },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (!session) {
        void navigate({ to: "/login", search: { next: location.href }, replace: true });
        return;
      }
      setUserEmail(session.user.email || "Compte connecté");
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setAuthReady(false);
        void navigate({ to: "/login", search: { next: location.href }, replace: true });
        return;
      }
      setUserEmail(session.user.email || "Compte connecté");
      setAuthReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [location.href, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Vérification de la session…
      </main>
    );
  }

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
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <p className="max-w-xs truncate text-sm text-muted-foreground">{userEmail}</p>
              <Button variant="neutral" onClick={signOut}>Se déconnecter</Button>
            </div>
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

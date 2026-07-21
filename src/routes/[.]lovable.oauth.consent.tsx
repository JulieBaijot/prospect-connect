import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Typed local wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
const oauth = supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
    approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
    denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  };
}["oauth"];

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="max-w-md text-center text-sm text-destructive">
        Impossible de charger cette demande d'autorisation : {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune URL de redirection retournée.");
      return;
    }
    window.location.href = target;
  }

  const name = details?.client?.name ?? "cette application";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Connecter {name} à votre PRM</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {name} pourra utiliser les outils MCP de ce PRM (prospects, historique, actions) en votre nom, tant que vous
            êtes connecté. Cela ne contourne pas les règles d'accès du backend.
          </p>
        </div>
        {details?.scope && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Portée demandée : <span className="font-mono">{details.scope}</span>
          </p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Refuser
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "…" : "Autoriser"}
          </button>
        </div>
      </div>
    </main>
  );
}

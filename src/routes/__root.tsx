import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-[22px] font-medium text-foreground">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas dans le PRM.</p>
        <Link to="/session-appels" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Retour à la session d'appels
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PRM SST — Prospection" },
      { name: "description", content: "Prospect relationship manager pour sessions d'appels SST." },
      { property: "og:title", content: "PRM SST — Prospection" },
      { property: "og:description", content: "Cockpit de prospection pour formatrice SST freelance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}

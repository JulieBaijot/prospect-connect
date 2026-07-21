import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_prospect",
  title: "Détail d'un prospect",
  description:
    "Retourne la fiche complète d'un prospect (toutes les colonnes) ainsi que ses contacts et son historique de prospection (30 derniers événements).",
  inputSchema: {
    prospect_id: z.string().uuid().describe("ID UUID du prospect"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ prospect_id }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    const [{ data: prospect, error: pe }, { data: contacts }, { data: logs }] = await Promise.all([
      supabase.from("prospects").select("*").eq("id", prospect_id).maybeSingle(),
      supabase.from("contacts").select("*").eq("prospect_id", prospect_id),
      supabase
        .from("prospection_logs")
        .select("*")
        .eq("prospect_id", prospect_id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (pe) return { content: [{ type: "text", text: pe.message }], isError: true };
    if (!prospect) return { content: [{ type: "text", text: "Prospect introuvable." }], isError: true };
    return {
      content: [{ type: "text", text: `Fiche ${prospect.company_name} (${prospect.city ?? "ville inconnue"}).` }],
      structuredContent: { prospect, contacts: contacts ?? [], logs: logs ?? [] },
    };
  },
});

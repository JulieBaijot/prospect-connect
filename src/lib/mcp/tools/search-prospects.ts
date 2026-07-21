import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_prospects",
  title: "Rechercher un prospect",
  description:
    "Recherche textuelle sur le nom d'entreprise, la ville, le secteur, l'adresse, le décideur ou les commentaires. Utilise ce tool quand tu ne connais pas l'ID exact du prospect.",
  inputSchema: {
    query: z.string().trim().min(1).max(200).describe("Terme de recherche (mot ou expression)"),
    limit: z.number().int().min(1).max(30).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    const q = `%${query.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data, error } = await supabase
      .from("prospects")
      .select("id, company_name, city, sector, category, status, current_stage, main_phone, decision_maker, updated_at")
      .or(
        `company_name.ilike.${q},city.ilike.${q},sector.ilike.${q},address.ilike.${q},decision_maker.ilike.${q},comments.ilike.${q}`,
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 15);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} résultat(s) pour "${query}".` }],
      structuredContent: { prospects: data ?? [] },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_prospects",
  title: "Lister les prospects",
  description:
    "Liste les prospects du PRM, avec filtres optionnels par statut, secteur ou ville. Retourne au maximum 50 fiches (les plus récemment modifiées d'abord).",
  inputSchema: {
    status: z.string().optional().describe("Filtre par statut ('À qualifier', 'En contact', 'En discussion', 'Parké', 'Converti', 'Perdu')"),
    decision_level: z.string().optional().describe("Filtre par niveau de décision (site, groupe, inconnu)"),
    sector: z.string().optional().describe("Filtre partiel sur le secteur"),
    city: z.string().optional().describe("Filtre partiel sur la ville"),
    limit: z.number().int().min(1).max(50).optional().describe("Nombre max de résultats (défaut 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("prospects")
      .select(
        "id, company_name, status, decision_level, group_name, parking_date, last_contacted_at, city, sector, headcount_range, main_phone, main_email, website, next_action_date, decision_maker, estimated_value, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(input.limit ?? 20);

    if (input.status) query = query.eq("status", input.status);
    if (input.decision_level) query = query.eq("decision_level", input.decision_level);
    if (input.sector) query = query.ilike("sector", `%${input.sector}%`);
    if (input.city) query = query.ilike("city", `%${input.city}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `${data?.length ?? 0} prospect(s) trouvé(s).` }],
      structuredContent: { prospects: data ?? [] },
    };
  },
});

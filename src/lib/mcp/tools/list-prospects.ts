import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_prospects",
  title: "Lister les prospects",
  description:
    "Liste les prospects du PRM, avec filtres optionnels par catégorie, statut, étape du cycle, secteur ou ville. Retourne au maximum 50 fiches (les plus récemment modifiées d'abord).",
  inputSchema: {
    category: z.string().optional().describe("Filtre par catégorie (ex: 'A – Pilier', 'B – Socle prévention')"),
    status: z.string().optional().describe("Filtre par statut ('Chaud', 'Tiède', 'En attente', 'Perdu', 'Converti')"),
    stage: z.string().optional().describe("Filtre par étape du cycle (J1, J2, J4, J6, J10, J15, J21)"),
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
        "id, company_name, category, status, current_stage, city, sector, headcount_range, main_phone, main_email, website, next_action_date, decision_maker, estimated_value, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(input.limit ?? 20);

    if (input.category) query = query.eq("category", input.category);
    if (input.status) query = query.eq("status", input.status);
    if (input.stage) query = query.eq("current_stage", input.stage);
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

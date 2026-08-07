import { defineTool } from "@lovable.dev/mcp-js";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "today_actions",
  title: "Actions du jour",
  description:
    "Retourne les prospects avec une prochaine action programmée à aujourd'hui ou en retard. Idéal pour préparer la session d'appels ou de qualification quotidienne.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("prospects")
      .select(
        "id, company_name, city, status, decision_level, main_phone, decision_maker, next_action_date, comments",
      )
      .not("next_action_date", "is", null)
      .lte("next_action_date", today)
      .neq("status", "Perdu")
      .order("next_action_date", { ascending: true })
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        { type: "text", text: `${data?.length ?? 0} action(s) due(s) au ${today} (ou en retard).` },
      ],
      structuredContent: { date: today, actions: data ?? [] },
    };
  },
});

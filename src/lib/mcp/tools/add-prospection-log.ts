import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_prospection_log",
  title: "Ajouter un événement de prospection",
  description:
    "Enregistre un événement (appel, email, RDV) dans l'historique d'un prospect. Met à jour éventuellement la date de prochaine action et le statut.",
  inputSchema: {
    prospect_id: z.string().uuid(),
    canal: z.enum(["email", "téléphone", "physique"]),
    result: z.enum(["NRP", "Pas dispo", "Échange", "RDV"]),
    action_type: z.string().min(1).max(80).describe("Type d'action (ex: 'Appel J1', 'RDV pris', 'Relance mail')"),
    notes: z.string().max(2000).optional(),
    next_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date de prochaine action (YYYY-MM-DD)"),
    update_status: z.enum(["Chaud", "Tiède", "En attente", "Perdu", "Converti"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    const { error: logError } = await supabase.from("prospection_logs").insert({
      prospect_id: input.prospect_id,
      canal: input.canal,
      result: input.result,
      action_type: input.action_type,
      notes: input.notes ?? null,
    });
    if (logError) return { content: [{ type: "text", text: logError.message }], isError: true };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.next_action_date) patch.next_action_date = input.next_action_date;
    if (input.update_status) patch.status = input.update_status;
    if (Object.keys(patch).length > 1) {
      const { error: upError } = await supabase.from("prospects").update(patch).eq("id", input.prospect_id);
      if (upError) return { content: [{ type: "text", text: upError.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: "Événement enregistré." }],
      structuredContent: { ok: true },
    };
  },
});

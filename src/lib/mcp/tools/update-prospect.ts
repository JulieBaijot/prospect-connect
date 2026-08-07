import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_prospect",
  title: "Mettre à jour un prospect",
  description:
    "Met à jour un ou plusieurs champs d'un prospect existant. Ne fournir que les champs à modifier.",
  inputSchema: {
    prospect_id: z.string().uuid(),
    company_name: z.string().min(1).max(200).optional(),
    status: z.enum(["À qualifier", "En contact", "En discussion", "Parké", "Converti", "Perdu"]).optional(),
    decision_level: z.enum(["site", "groupe", "inconnu"]).optional(),
    group_name: z.string().max(200).optional(),
    parking_trigger: z.string().max(500).optional(),
    parking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    last_contacted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    city: z.string().max(120).optional(),
    sector: z.string().max(120).optional(),
    main_phone: z.string().max(40).optional(),
    main_email: z.string().max(180).optional(),
    website: z.string().max(255).optional(),
    decision_maker: z.string().max(180).optional(),
    comments: z.string().max(4000).optional(),
    next_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    estimated_value: z.number().min(0).optional(),
    offer_target: z.string().max(80).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ prospect_id, ...rest }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseForUser(ctx);
    const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    if (Object.keys(patch).length <= 1) {
      return { content: [{ type: "text", text: "Aucun champ à mettre à jour." }], isError: true };
    }
    const { data, error } = await supabase
      .from("prospects")
      .update(patch)
      .eq("id", prospect_id)
      .select("id, company_name")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Prospect ${data?.company_name ?? prospect_id} mis à jour.` }],
      structuredContent: { ok: true, prospect: data },
    };
  },
});

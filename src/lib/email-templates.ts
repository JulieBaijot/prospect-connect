import { supabase } from "@/integrations/supabase/client";

/** Modèle d'email réutilisable, avec variables {contact}, {entreprise} et {ville}. */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  segment_cible: string | null;
  created_at: string;
}

export const templateVariables = ["{contact}", "{entreprise}", "{ville}"] as const;

export async function loadEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body, segment_cible, created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as EmailTemplate[];
}

export async function createEmailTemplate(input: {
  name: string;
  subject: string;
  body: string;
  segment_cible?: string | null;
}) {
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: input.name.trim(),
      subject: input.subject,
      body: input.body,
      segment_cible: input.segment_cible?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateEmailTemplate(
  id: string,
  patch: Partial<Pick<EmailTemplate, "name" | "subject" | "body" | "segment_cible">>,
) {
  const { error } = await supabase.from("email_templates").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEmailTemplate(id: string) {
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateEmailTemplate(template: EmailTemplate) {
  return createEmailTemplate({
    name: `${template.name} (copie)`,
    subject: template.subject,
    body: template.body,
    segment_cible: template.segment_cible,
  });
}

/** Remplace les variables du modèle par les données du prospect. */
export function fillTemplate(
  text: string,
  values: { contact?: string | null; entreprise?: string | null; ville?: string | null },
) {
  return text
    .replaceAll("{contact}", values.contact?.trim() || "Madame, Monsieur")
    .replaceAll("{entreprise}", values.entreprise?.trim() || "votre entreprise")
    .replaceAll("{ville}", values.ville?.trim() || "votre secteur");
}

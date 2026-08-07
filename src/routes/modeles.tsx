import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, fieldClass, labelClass } from "@/components/prm/ui";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  fillTemplate,
  loadEmailTemplates,
  templateVariables,
  updateEmailTemplate,
  type EmailTemplate,
} from "@/lib/email-templates";
import { segmentLabels } from "@/lib/prm";

export const Route = createFileRoute("/modeles")({
  head: () => ({
    meta: [
      { title: "Modèles d'emails — PRM Santé-Sécurité" },
      {
        name: "description",
        content:
          "Créer, modifier et dupliquer les modèles d'emails de prospection, avec les variables contact, entreprise et ville.",
      },
      { property: "og:title", content: "Modèles d'emails — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Bibliothèque de modèles utilisée par le bloc emails de l'écran Aujourd'hui.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <TemplatesPage />
    </AppLayout>
  ),
});

interface Draft {
  name: string;
  subject: string;
  body: string;
  segment_cible: string;
}

const emptyDraft: Draft = { name: "", subject: "", body: "", segment_cible: "" };

function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      setTemplates(await loadEmailTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }

  function openNew() {
    setSelected(null);
    setDraft(emptyDraft);
    setMessage("");
  }

  function openTemplate(template: EmailTemplate) {
    setSelected(template.id);
    setDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
      segment_cible: template.segment_cible || "",
    });
    setMessage("");
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("Le nom du modèle est obligatoire.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (selected) {
        await updateEmailTemplate(selected, {
          name: draft.name.trim(),
          subject: draft.subject,
          body: draft.body,
          segment_cible: draft.segment_cible.trim() || null,
        });
        setMessage("Modèle mis à jour.");
      } else {
        const id = await createEmailTemplate(draft);
        setSelected(id);
        setMessage("Modèle créé.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
    setBusy(false);
  }

  async function duplicate(template: EmailTemplate) {
    const id = await duplicateEmailTemplate(template);
    await refresh();
    setSelected(id);
    setDraft({
      name: `${template.name} (copie)`,
      subject: template.subject,
      body: template.body,
      segment_cible: template.segment_cible || "",
    });
    setMessage("Modèle dupliqué.");
  }

  async function remove(template: EmailTemplate) {
    await deleteEmailTemplate(template.id);
    if (selected === template.id) openNew();
    await refresh();
    setMessage("Modèle supprimé.");
  }

  const preview = fillTemplate(draft.body, {
    contact: "Marie Dupont",
    entreprise: "Menuiseries Larose",
    ville: "Nantes",
  });

  return (
    <>
      <PageTitle
        title="Modèles d'emails"
        subtitle={`${templates.length} modèle(s). Variables disponibles : ${templateVariables.join(", ")}.`}
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau modèle
          </Button>
        }
      />

      {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="divide-y divide-border">
          {templates.length ? (
            templates.map((template) => (
              <div
                key={template.id}
                className={`flex items-start justify-between gap-2 p-3 ${selected === template.id ? "bg-secondary/60" : ""}`}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => openTemplate(template)}
                >
                  <span className="block text-sm font-medium">{template.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {template.segment_cible || "tous segments"}
                  </span>
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Dupliquer ${template.name}`}
                    className="rounded-lg p-2 hover:bg-accent"
                    onClick={() => void duplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${template.name}`}
                    className="rounded-lg p-2 text-destructive hover:bg-accent"
                    onClick={() => void remove(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              Aucun modèle — créez le premier avec « Nouveau modèle ».
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-[16px] font-medium">
            {selected ? "Modifier le modèle" : "Nouveau modèle"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className={labelClass} htmlFor="tpl-name">
                Nom
              </label>
              <input
                id="tpl-name"
                className={fieldClass}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Ex. Premier contact DUERP"
              />
            </div>
            <div className="grid gap-1">
              <label className={labelClass} htmlFor="tpl-segment">
                Segment ciblé (optionnel)
              </label>
              <select
                id="tpl-segment"
                className={fieldClass}
                value={draft.segment_cible}
                onChange={(event) => setDraft({ ...draft, segment_cible: event.target.value })}
              >
                <option value="">Tous segments</option>
                {segmentLabels.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 grid gap-1">
            <label className={labelClass} htmlFor="tpl-subject">
              Objet
            </label>
            <input
              id="tpl-subject"
              className={fieldClass}
              value={draft.subject}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              placeholder="{entreprise} — obligations santé-sécurité"
            />
          </div>
          <div className="mt-3 grid gap-1">
            <label className={labelClass} htmlFor="tpl-body">
              Corps du message
            </label>
            <textarea
              id="tpl-body"
              rows={10}
              className={fieldClass}
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              placeholder={"Bonjour {contact},\n\nJe travaille avec des entreprises de {ville}…"}
            />
            <p className="text-xs text-muted-foreground">
              Variables remplacées à l'envoi : {templateVariables.join(", ")}.
            </p>
          </div>

          {draft.body.trim() ? (
            <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3">
              <p className={labelClass}>Aperçu (exemple)</p>
              <pre className="mt-1 whitespace-pre-wrap text-sm">{preview}</pre>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={save}>
              {selected ? "Enregistrer" : "Créer le modèle"}
            </Button>
            {selected ? (
              <Button variant="neutral" onClick={openNew}>
                Annuler
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}

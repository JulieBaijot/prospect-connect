import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { Button, fieldClass, labelClass } from "@/components/prm/ui";
import {
  decisionLevels,
  headcountRanges,
  offerTargets,
  statuses,
  updateProspect,
  type DecisionLevel,
  type HeadcountRange,
  type OfferTarget,
  type Prospect,
  type ProspectStatus,
} from "@/lib/prm";

/** Édition rapide d'une fiche, utilisable directement pendant la session du jour. */
export function ProspectQuickEdit({
  prospect,
  onSaved,
  openLabel = "Modifier la fiche",
}: {
  prospect: Prospect;
  onSaved: () => void;
  openLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company_name: prospect.company_name || "",
    city: prospect.city || "",
    headcount_range: prospect.headcount_range || "",
    offer_target: prospect.offer_target || "",
    status: prospect.status,
    decision_level: prospect.decision_level || "inconnu",
    group_name: prospect.group_name || "",
    main_phone: prospect.main_phone || "",
    main_email: prospect.main_email || "",
    website: prospect.website || "",
    decision_maker: prospect.decision_maker || "",
    sector: prospect.sector || "",
    address: prospect.address || "",
    comments: prospect.comments || "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await updateProspect(prospect.id, {
        company_name: form.company_name.trim() || prospect.company_name,
        city: form.city.trim() || null,
        headcount_range: (form.headcount_range || null) as HeadcountRange | null,
        offer_target: (form.offer_target || null) as OfferTarget | null,
        status: form.status as ProspectStatus,
        decision_level: form.decision_level as DecisionLevel,
        group_name: form.group_name.trim() || null,
        main_phone: form.main_phone.trim() || null,
        main_email: form.main_email.trim() || null,
        website: form.website.trim() || null,
        decision_maker: form.decision_maker.trim() || null,
        sector: form.sector.trim() || null,
        address: form.address.trim() || null,
        comments: form.comments.trim() || null,
      });
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <Button variant="neutral" className="min-h-9 px-3" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        {openLabel}
      </Button>
    );
  }

  const id = (key: string) => `${key}-${prospect.id}`;

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Entreprise" id={id("company")}>
          <input
            id={id("company")}
            className={fieldClass}
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
          />
        </Field>
        <Field label="Ville" id={id("city")}>
          <input
            id={id("city")}
            className={fieldClass}
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label="Effectif" id={id("headcount")}>
          <select
            id={id("headcount")}
            className={fieldClass}
            value={form.headcount_range}
            onChange={(e) => set("headcount_range", e.target.value)}
          >
            <option value="">Non renseigné</option>
            {headcountRanges.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Offre visée" id={id("offer")}>
          <select
            id={id("offer")}
            className={fieldClass}
            value={form.offer_target}
            onChange={(e) => set("offer_target", e.target.value)}
          >
            <option value="">Non renseignée</option>
            {offerTargets.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut" id={id("status")}>
          <select
            id={id("status")}
            className={fieldClass}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Niveau de décision" id={id("level")}>
          <select
            id={id("level")}
            className={fieldClass}
            value={form.decision_level}
            onChange={(e) => set("decision_level", e.target.value)}
          >
            {decisionLevels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Groupe" id={id("group")}>
          <input
            id={id("group")}
            className={fieldClass}
            value={form.group_name}
            onChange={(e) => set("group_name", e.target.value)}
          />
        </Field>
        <Field label="Secteur" id={id("sector")}>
          <input
            id={id("sector")}
            className={fieldClass}
            value={form.sector}
            onChange={(e) => set("sector", e.target.value)}
          />
        </Field>
        <Field label="Téléphone" id={id("phone")}>
          <input
            id={id("phone")}
            className={fieldClass}
            value={form.main_phone}
            onChange={(e) => set("main_phone", e.target.value)}
          />
        </Field>
        <Field label="Email" id={id("email")}>
          <input
            id={id("email")}
            className={fieldClass}
            value={form.main_email}
            onChange={(e) => set("main_email", e.target.value)}
          />
        </Field>
        <Field label="Site web" id={id("web")}>
          <input
            id={id("web")}
            className={fieldClass}
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </Field>
        <Field label="Interlocuteur" id={id("dm")}>
          <input
            id={id("dm")}
            className={fieldClass}
            value={form.decision_maker}
            onChange={(e) => set("decision_maker", e.target.value)}
          />
        </Field>
        <Field label="Adresse" id={id("address")}>
          <input
            id={id("address")}
            className={fieldClass}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Commentaires" id={id("comments")}>
        <textarea
          id={id("comments")}
          className={`${fieldClass} min-h-20 py-2`}
          value={form.comments}
          onChange={(e) => set("comments", e.target.value)}
        />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={save}>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer la fiche
        </Button>
        <Button variant="neutral" onClick={() => setOpen(false)}>
          <X className="mr-2 h-4 w-4" />
          Annuler
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

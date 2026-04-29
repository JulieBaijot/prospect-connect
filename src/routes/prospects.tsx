import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import {
  Button,
  Card,
  CategoryBadge,
  PageTitle,
  StatusBadge,
  fieldClass,
  labelClass,
} from "@/components/prm/ui";
import {
  categories,
  contactName,
  formatDate,
  formatEuro,
  headcountRanges,
  loadProspects,
  offerTargets,
  saveProspect,
  statuses,
  stages,
  type Category,
  type Contact,
  type CycleStage,
  type HeadcountRange,
  type OfferTarget,
  type Prospect,
  type ProspectStatus,
  type ProspectWithRelations,
} from "@/lib/prm";
import { enrichCompany } from "@/server/prospect-search.functions";

export const Route = createFileRoute("/prospects")({
  head: () => ({
    meta: [
      { title: "Base prospects — PRM SST" },
      { name: "description", content: "Liste filtrable des prospects et panneau d'édition." },
    ],
  }),
  component: () => (
    <AppLayout>
      <ProspectsPage />
    </AppLayout>
  ),
});

const emptyProspect = {
  company_name: "",
  city: "",
  headcount_range: "20-49" as HeadcountRange,
  category: "C – Porte d'entrée" as Category,
  offer_target: "SST FI" as OfferTarget,
  estimated_value: 0,
  current_stage: "J1" as CycleStage,
  status: "Tiède" as ProspectStatus,
  next_action_date: "",
  main_phone: "",
  website: "",
  address: "",
  reception_hours: "",
  comments: "",
  google_place_id: "",
};
const emptyContact = {
  first_name: "",
  last_name: "",
  role_title: "",
  main_phone: "",
  direct_phone: "",
  email: "",
  linkedin_url: "",
  comments: "",
};

function ProspectsPage() {
  const runEnrichment = useServerFn(enrichCompany);
  const [prospects, setProspects] = useState<ProspectWithRelations[]>([]);
  const [selected, setSelected] = useState<ProspectWithRelations | null>(null);
  const [form, setForm] = useState(emptyProspect);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [filters, setFilters] = useState({ status: "", category: "", offer: "", city: "" });
  const [placesStatus, setPlacesStatus] = useState("");

  useEffect(() => {
    void refresh();
  }, []);
  async function refresh() {
    setProspects(await loadProspects());
  }

  const filtered = useMemo(
    () =>
      prospects.filter(
        (p) =>
          (!filters.status || p.status === filters.status) &&
          (!filters.category || p.category === filters.category) &&
          (!filters.offer || p.offer_target === filters.offer) &&
          (!filters.city || (p.city || "").toLowerCase().includes(filters.city.toLowerCase())),
      ),
    [prospects, filters],
  );

  function openProspect(prospect: ProspectWithRelations) {
    setSelected(prospect);
    setForm({
      ...emptyProspect,
      ...prospect,
      next_action_date: prospect.next_action_date || "",
      city: prospect.city || "",
      headcount_range: prospect.headcount_range || "20-49",
      offer_target: prospect.offer_target || "SST FI",
      main_phone: prospect.main_phone || "",
      website: prospect.website || "",
      address: prospect.address || "",
      reception_hours: prospect.reception_hours || "",
      comments: prospect.comments || "",
      google_place_id: prospect.google_place_id || "",
    });
    const contact = prospect.contacts[0];
    setContactForm({
      ...emptyContact,
      ...(contact || {}),
      first_name: contact?.first_name || "",
      last_name: contact?.last_name || "",
      role_title: contact?.role_title || "",
      main_phone: contact?.main_phone || "",
      direct_phone: contact?.direct_phone || "",
      email: contact?.email || "",
      linkedin_url: contact?.linkedin_url || "",
      comments: contact?.comments || "",
    });
  }

  function addNew() {
    setSelected(null);
    setForm(emptyProspect);
    setContactForm(emptyContact);
  }

  async function save() {
    await saveProspect(
      {
        ...(selected?.id ? { id: selected.id } : {}),
        ...form,
        estimated_value: Number(form.estimated_value),
        next_action_date: form.next_action_date || null,
      } as Partial<Prospect> & { company_name: string },
      {
        ...(selected?.contacts[0]?.id ? { id: selected.contacts[0].id } : {}),
        ...contactForm,
      } as Partial<Contact>,
    );
    await refresh();
    setPlacesStatus("Prospect sauvegardé.");
  }

  function openPappers() {
    window.open(
      `https://www.pappers.fr/recherche?q=${encodeURIComponent(form.company_name)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function openGoogle() {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(`${contactForm.first_name} ${contactForm.last_name} ${form.company_name} responsable RH OR sécurité`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function openLinkedIn() {
    window.open(
      `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${contactForm.first_name} ${contactForm.last_name} ${form.company_name}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function enrichPlaces() {
    setPlacesStatus("Recherche Google Places en cours…");
    try {
      const place = await runEnrichment({ data: { name: form.company_name, city: form.city } });
      if (place.status === "missing_key") {
        setPlacesStatus("Clé Google Places absente : remplissez les champs manuellement.");
        return;
      }
      if (place.status !== "found") {
        setPlacesStatus("Aucun établissement trouvé.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        address: place.address || prev.address,
        main_phone: place.phone || prev.main_phone,
        website: place.website || prev.website,
        reception_hours: place.hours || prev.reception_hours,
        google_place_id: place.placeId || prev.google_place_id,
      }));
      setPlacesStatus("Établissement trouvé : vérifiez les champs puis sauvegardez.");
    } catch {
      setPlacesStatus("Erreur Google Places. Vérifiez la clé ou saisissez manuellement.");
    }
  }

  return (
    <>
      <PageTitle
        title="Base prospects"
        subtitle="Tableau desktop filtrable avec panneau d'ajout et d'édition."
        action={
          <Button onClick={addNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un prospect
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-4">
            <select
              className={fieldClass}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tous statuts</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={filters.offer}
              onChange={(e) => setFilters({ ...filters, offer: e.target.value })}
            >
              <option value="">Toutes offres</option>
              {offerTargets.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <input
              className={fieldClass}
              placeholder="Ville / zone"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            />
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    "Entreprise",
                    "Contact",
                    "Ville",
                    "Catégorie",
                    "Étape",
                    "Statut",
                    "Prochaine action",
                    "Valeur",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-border hover:bg-muted"
                    onClick={() => openProspect(p)}
                  >
                    <td className="px-4 py-3 font-medium">{p.company_name}</td>
                    <td className="px-4 py-3">{contactName(p.contacts[0])}</td>
                    <td className="px-4 py-3">{p.city || "—"}</td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={p.category} />
                    </td>
                    <td className="px-4 py-3">{p.current_stage}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">{formatDate(p.next_action_date)}</td>
                    <td className="px-4 py-3">{formatEuro(p.estimated_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 lg:hidden">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openProspect(p)}
                className="rounded-xl border border-border bg-card p-4 text-left"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.company_name}</span>
                  <CategoryBadge category={p.category} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {contactName(p.contacts[0])} · {p.city}
                </p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-medium">
              {selected ? "Modifier le prospect" : "Ajouter un prospect"}
            </h3>
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Entreprise">
              <input
                className={fieldClass}
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Ville">
                <input
                  className={fieldClass}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="Effectifs">
                <select
                  className={fieldClass}
                  value={form.headcount_range}
                  onChange={(e) =>
                    setForm({ ...form, headcount_range: e.target.value as HeadcountRange })
                  }
                >
                  {headcountRanges.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Catégorie">
                <select
                  className={fieldClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {categories.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Statut">
                <select
                  className={fieldClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProspectStatus })}
                >
                  {statuses.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Offre">
                <select
                  className={fieldClass}
                  value={form.offer_target}
                  onChange={(e) =>
                    setForm({ ...form, offer_target: e.target.value as OfferTarget })
                  }
                >
                  {offerTargets.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Étape">
                <select
                  className={fieldClass}
                  value={form.current_stage}
                  onChange={(e) =>
                    setForm({ ...form, current_stage: e.target.value as CycleStage })
                  }
                >
                  {stages.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valeur €">
                <input
                  className={fieldClass}
                  type="number"
                  value={form.estimated_value}
                  onChange={(e) => setForm({ ...form, estimated_value: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Prénom">
                <input
                  className={fieldClass}
                  value={contactForm.first_name}
                  onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                />
              </Field>
              <Field label="Nom">
                <input
                  className={fieldClass}
                  value={contactForm.last_name}
                  onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Rôle / titre">
              <input
                className={fieldClass}
                value={contactForm.role_title}
                onChange={(e) => setContactForm({ ...contactForm, role_title: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Téléphone accueil">
                <input
                  className={fieldClass}
                  value={form.main_phone}
                  onChange={(e) => setForm({ ...form, main_phone: e.target.value })}
                />
              </Field>
              <Field label="Téléphone direct">
                <input
                  className={fieldClass}
                  value={contactForm.direct_phone}
                  onChange={(e) => setContactForm({ ...contactForm, direct_phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Email">
              <input
                className={fieldClass}
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                className={fieldClass}
                value={contactForm.linkedin_url}
                onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })}
              />
            </Field>
            <Field label="Horaires accueil">
              <textarea
                className={`${fieldClass} min-h-20 py-2`}
                value={form.reception_hours}
                onChange={(e) => setForm({ ...form, reception_hours: e.target.value })}
              />
            </Field>
            <Field label="Commentaires">
              <textarea
                className={`${fieldClass} min-h-24 py-2`}
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
              />
            </Field>
            <div className="grid gap-2 md:grid-cols-2">
              <Button variant="neutral" onClick={openPappers}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Rechercher sur Pappers
              </Button>
              <Button variant="neutral" onClick={openGoogle}>
                Rechercher sur Google
              </Button>
              <Button variant="neutral" onClick={openLinkedIn}>
                Rechercher sur LinkedIn
              </Button>
              <Button variant="warning" onClick={enrichPlaces}>
                Enrichir via Google Places
              </Button>
            </div>
            {placesStatus ? (
              <p className="rounded-lg bg-script p-3 text-sm">{placesStatus}</p>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

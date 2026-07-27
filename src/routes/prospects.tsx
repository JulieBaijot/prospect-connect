import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  bestPhone,
  dataQualityIssues,
  deleteProspect,
  formatDate,
  formatEuro,
  isDueTodayOrLate,
  headcountRanges,
  loadProspects,
  offerTargets,
  saveProspect,
  statuses,
  stages,
  suggestProspectCategory,
  updateProspect,
  type Category,
  type Contact,
  type CycleStage,
  type HeadcountRange,
  type OfferTarget,
  type Prospect,
  type ProspectStatus,
  type ProspectWithRelations,
} from "@/lib/prm";
import { enrichCompany } from "@/lib/prospect-search.functions";

export const Route = createFileRoute("/prospects")({
  head: () => ({
    meta: [
      { title: "Base prospects — PRM Santé-Sécurité" },
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
  offer_target: "Formation SST" as OfferTarget,
  estimated_value: 0,
  current_stage: "J1" as CycleStage,
  status: "Tiède" as ProspectStatus,
  next_action_date: "",
  main_phone: "",
  main_email: "",
  website: "",
  address: "",
  reception_hours: "",
  comments: "",
  sector: "",
  siren: "",
  naf_code: "",
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
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    offer: "",
    city: "",
    q: "",
    view: "",
    source: "",
  });
  const [placesStatus, setPlacesStatus] = useState("");
  const [batchStatus, setBatchStatus] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");

  useEffect(() => {
    void refresh();
  }, []);
  async function refresh() {
    setProspects(await loadProspects());
  }

  const filtered = useMemo(
    () =>
      prospects.filter((p) => {
        const q = filters.q.toLowerCase();
        const searchable = [
          p.company_name,
          p.city,
          p.siren,
          p.main_phone,
          p.import_source,
          ...p.contacts.flatMap((c) => [
            c.first_name,
            c.last_name,
            c.email,
            c.direct_phone,
            c.role_title,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const issues = dataQualityIssues(p);
        return (
          (!filters.q || searchable.includes(q)) &&
          (!filters.status || p.status === filters.status) &&
          (!filters.category || p.category === filters.category) &&
          (!filters.offer || p.offer_target === filters.offer) &&
          (!filters.city || (p.city || "").toLowerCase().includes(filters.city.toLowerCase())) &&
          (!filters.source || (p.import_source || p.source || "").includes(filters.source)) &&
          (!filters.view ||
            (filters.view === "due" && isDueTodayOrLate(p.next_action_date)) ||
            (filters.view === "no_phone" && !bestPhone(p)) ||
            (filters.view === "no_contact" && !p.contacts.length) ||
            (filters.view === "no_next" && !p.next_action_date) ||
            (filters.view === "incomplete" && issues.length > 0))
        );
      }),
    [prospects, filters],
  );

  const counters = useMemo(
    () => ({
      total: prospects.length,
      due: prospects.filter((p) => isDueTodayOrLate(p.next_action_date)).length,
      incomplete: prospects.filter((p) => dataQualityIssues(p).length > 0).length,
      hot: prospects.filter((p) => p.status === "Chaud").length,
      converted: prospects.filter((p) => p.status === "Converti").length,
    }),
    [prospects],
  );
  const incompleteProspects = useMemo(
    () => prospects.filter((p) => dataQualityIssues(p).length > 0),
    [prospects],
  );
  const autoCategory = useMemo(
    () =>
      suggestProspectCategory({
        headcount_range: form.headcount_range,
        offer_target: form.offer_target,
        sector: selected?.sector,
        estimated_value: form.estimated_value,
        comments: form.comments,
        contactKnown: Boolean(
          contactForm.first_name ||
          contactForm.last_name ||
          contactForm.role_title ||
          contactForm.email ||
          contactForm.direct_phone,
        ),
        history: selected?.prospection_logs,
      }),
    [
      form.headcount_range,
      form.offer_target,
      form.estimated_value,
      form.comments,
      contactForm,
      selected,
    ],
  );

  function openProspect(prospect: ProspectWithRelations) {
    setSelected(prospect);
    setForm({
      ...emptyProspect,
      ...prospect,
      next_action_date: prospect.next_action_date || "",
      city: prospect.city || "",
      headcount_range: prospect.headcount_range || "20-49",
      offer_target: prospect.offer_target || "Formation SST",
      main_phone: prospect.main_phone || "",
      main_email: prospect.main_email || "",
      website: prospect.website || "",
      address: prospect.address || "",
      reception_hours: prospect.reception_hours || "",
      comments: prospect.comments || "",
      sector: prospect.sector || "",
      siren: prospect.siren || "",
      naf_code: prospect.naf_code || "",
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
    setDeleteStatus("");
    setPlacesStatus("Nouvelle fiche : renseignez au minimum le nom de l'entreprise puis Sauvegarder.");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      companyInputRef.current?.focus();
    });
  }

  async function save() {
    if (!form.company_name.trim()) {
      setPlacesStatus("Le nom de l'entreprise est obligatoire.");
      companyInputRef.current?.focus();
      return;
    }
    try {
      const saved = await saveProspect(
        {
          ...(selected?.id ? { id: selected.id } : {}),
          ...form,
          company_name: form.company_name.trim(),
          estimated_value: Number(form.estimated_value) || 0,
          next_action_date: form.next_action_date || null,
        } as Partial<Prospect> & { company_name: string },
        {
          ...(selected?.contacts[0]?.id ? { id: selected.contacts[0].id } : {}),
          ...contactForm,
        } as Partial<Contact>,
      );
      const wasNew = !selected;
      await refresh();
      if (wasNew) {
        setFilters({ status: "", category: "", offer: "", city: "", q: "", view: "", source: "" });
      }
      setPlacesStatus(
        wasNew ? `${saved.company_name} ajouté à la base.` : "Prospect sauvegardé.",
      );
      setDeleteStatus("");
    } catch (error) {
      setPlacesStatus(
        `Échec de l'enregistrement : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function removeSelected() {
    if (!selected) return;
    const confirmed = window.confirm(
      `Supprimer définitivement ${selected.company_name} et son historique ?`,
    );
    if (!confirmed) return;
    await deleteProspect(selected.id);
    setProspects((current) => current.filter((prospect) => prospect.id !== selected.id));
    addNew();
    setPlacesStatus("");
    setDeleteStatus("Prospect supprimé.");
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
    setPlacesStatus("Recherche Google Places + Perplexity en cours…");
    try {
      const result = await runEnrichment({
        data: {
          name: form.company_name,
          city: form.city,
          activity: form.sector || undefined,
          address: form.address || undefined,
        },
      });
      if (result.status === "missing_key") {
        setPlacesStatus("Aucune clé d'enrichissement configurée.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        address: prev.address || result.address || "",
        main_phone: prev.main_phone || result.phone || "",
        website: prev.website || result.website || "",
        reception_hours: prev.reception_hours || result.hours || "",
        google_place_id: prev.google_place_id || result.placeId || "",
      }));
      if (selected) {
        const patch: Partial<Prospect> & { enriched_at?: string } = {
          decision_maker: selected.decision_maker || result.decision_maker || null,
          employees_count: selected.employees_count || result.employees_count || null,
          additional_info: selected.additional_info || result.additional_info || null,
          social_links: selected.social_links || result.social_links || null,
          icebreakers:
            selected.icebreakers && selected.icebreakers.length
              ? selected.icebreakers
              : result.icebreakers || null,
          average_rating: selected.average_rating ?? result.average_rating ?? null,
          reviews_count: selected.reviews_count ?? result.reviews_count ?? null,
          google_maps_url: selected.google_maps_url || result.google_maps_url || null,
          enrichment_sources: result.sources,
          enriched_at: new Date().toISOString(),
        };
        await updateProspect(selected.id, patch);
        await refresh();
      }
      const gp = result.sources.google_places;
      const pp = result.sources.perplexity;
      setPlacesStatus(
        `Enrichissement ${result.status === "found" ? "complet" : result.status === "partial" ? "partiel" : "vide"}. ` +
          `Google Places : ${gp.status}${gp.message ? ` (${gp.message})` : ""}. ` +
          `Perplexity : ${pp.status}${pp.message ? ` (${pp.message})` : ""}.`,
      );
    } catch {
      setPlacesStatus("Erreur réseau pendant l'enrichissement.");
    }
  }

  async function qualifyIncompleteBatch() {
    const targets = incompleteProspects.slice(0, 20);
    if (!targets.length || batchBusy) return;
    setBatchBusy(true);
    setBatchStatus(`Qualification de ${targets.length} prospect(s) incomplet(s)…`);
    let updated = 0;
    for (const prospect of targets) {
      const suggested = suggestProspectCategory({
        headcount_range: prospect.headcount_range,
        offer_target: prospect.offer_target,
        sector: prospect.sector,
        estimated_value: prospect.estimated_value,
        comments: prospect.comments,
        contactKnown: prospect.contacts.length > 0,
        history: prospect.prospection_logs,
      });
      const patch: Partial<Prospect> = {};
      if (suggested && (!prospect.category || prospect.category === "C – Porte d'entrée")) {
        patch.category = suggested.category;
      }
      if (!prospect.next_action_date)
        patch.next_action_date = new Date().toISOString().slice(0, 10);
      if (!prospect.offer_target) patch.offer_target = "Formation SST";
      if (!prospect.status) patch.status = "Tiède";
      if (!prospect.main_phone || !prospect.website || !prospect.address) {
        try {
          const place = await runEnrichment({
            data: {
              name: prospect.company_name,
              city: prospect.city || "",
              activity: prospect.sector || undefined,
              address: prospect.address || undefined,
            },
          });
          if (place.status === "found" || place.status === "partial") {
            if (!prospect.main_phone && place.phone) patch.main_phone = place.phone;
            if (!prospect.website && place.website) patch.website = place.website;
            if (!prospect.address && place.address) patch.address = place.address;
            if (!prospect.reception_hours && place.hours) patch.reception_hours = place.hours;
            if (!prospect.google_place_id && place.placeId) patch.google_place_id = place.placeId;
            if (!prospect.decision_maker && place.decision_maker) patch.decision_maker = place.decision_maker;
            if (!prospect.employees_count && place.employees_count) patch.employees_count = place.employees_count;
            if (!prospect.social_links && place.social_links) patch.social_links = place.social_links;
            if ((!prospect.icebreakers || !prospect.icebreakers.length) && place.icebreakers) patch.icebreakers = place.icebreakers;
            if (prospect.average_rating == null && place.average_rating != null) patch.average_rating = place.average_rating;
            if (prospect.reviews_count == null && place.reviews_count != null) patch.reviews_count = place.reviews_count;
            if (!prospect.google_maps_url && place.google_maps_url) patch.google_maps_url = place.google_maps_url;
            if (!prospect.additional_info && place.additional_info) patch.additional_info = place.additional_info;
            patch.enrichment_sources = place.sources;
            (patch as Partial<Prospect> & { enriched_at?: string }).enriched_at = new Date().toISOString();
          }
        } catch {
          // Le batch continue même si un enrichissement échoue.
        }
      }
      if (Object.keys(patch).length) {
        await updateProspect(prospect.id, patch);
        updated += 1;
      }
    }
    await refresh();
    setBatchBusy(false);
    setFilters((prev) => ({ ...prev, view: "incomplete" }));
    setBatchStatus(
      `${updated} prospect(s) qualifié(s). Les fiches restantes sont à compléter manuellement ou via enrichissement.`,
    );
  }

  return (
    <>
      <PageTitle
        title="Base prospects"
        subtitle="Tableau desktop filtrable avec panneau d'ajout et d'édition."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="neutral"
              onClick={qualifyIncompleteBatch}
              disabled={batchBusy || !incompleteProspects.length}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Qualifier incomplets
            </Button>
            <Button onClick={addNew}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un prospect
            </Button>
          </div>
        }
      />
      {batchStatus ? <p className="mb-4 rounded-lg bg-script p-3 text-sm">{batchStatus}</p> : null}
      {deleteStatus ? (
        <p className="mb-4 rounded-lg bg-script p-3 text-sm">{deleteStatus}</p>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <MiniKpi label="Total" value={counters.total} />
        <MiniKpi label="À appeler" value={counters.due} />
        <MiniKpi label="À compléter" value={counters.incomplete} />
        <MiniKpi label="Chauds" value={counters.hot} />
        <MiniKpi label="Convertis" value={counters.converted} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-4 xl:grid-cols-7">
            <input
              className={`${fieldClass} md:col-span-2`}
              placeholder="Recherche entreprise, contact, email, téléphone…"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
            <select
              className={fieldClass}
              value={filters.view}
              onChange={(e) => setFilters({ ...filters, view: e.target.value })}
            >
              <option value="">Toutes vues</option>
              <option value="due">À appeler</option>
              <option value="incomplete">À compléter</option>
              <option value="no_phone">Sans téléphone</option>
              <option value="no_contact">Sans contact</option>
              <option value="no_next">Sans prochaine action</option>
            </select>
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
            <select
              className={fieldClass}
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            >
              <option value="">Toutes sources</option>
              <option value="excel">Import Excel</option>
              <option value="api_batch">Batch API</option>
            </select>
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
                    "Actions",
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
                    <td className="px-4 py-3">
                      <div>{formatEuro(p.estimated_value)}</div>
                      {dataQualityIssues(p).length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {dataQualityIssues(p).length} point(s) à compléter
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="neutral"
                        onClick={(event) => {
                          event.stopPropagation();
                          openProspect(p);
                        }}
                      >
                        Modifier
                      </Button>
                    </td>
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-medium">
              {selected ? "Modifier le prospect" : "Ajouter un prospect"}
            </h3>
            <div className="flex flex-wrap justify-end gap-2">
              {selected ? (
                <Button variant="danger" onClick={removeSelected}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              ) : null}
              <Button onClick={save}>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
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
              <Field label="Secteur">
                <input
                  className={fieldClass}
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
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
                {autoCategory && autoCategory.category !== form.category ? (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, category: autoCategory.category })}
                    className="mt-1 inline-flex min-h-8 items-center gap-2 rounded-lg bg-secondary px-3 text-left text-xs text-secondary-foreground hover:bg-accent"
                  >
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase text-primary-foreground">
                      Auto
                    </span>
                    {autoCategory.category} · {autoCategory.reasons.join(", ")}
                  </button>
                ) : null}
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
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email entreprise">
                <input
                  className={fieldClass}
                  type="email"
                  value={form.main_email}
                  onChange={(e) => setForm({ ...form, main_email: e.target.value })}
                />
              </Field>
              <Field label="SIRET">
                <input
                  className={fieldClass}
                  value={form.siren}
                  onChange={(e) => setForm({ ...form, siren: e.target.value })}
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
            {selected && (selected.decision_maker || selected.average_rating != null || selected.icebreakers?.length || selected.social_links) ? (
              <div className="rounded-lg border border-border bg-card p-3 text-sm">
                <p className={labelClass}>Données enrichies</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {selected.decision_maker ? <span>👤 {selected.decision_maker}</span> : null}
                  {selected.employees_count ? <span>👥 {selected.employees_count}</span> : null}
                  {selected.average_rating != null ? <span>⭐ {selected.average_rating.toFixed(1)}{selected.reviews_count != null ? ` (${selected.reviews_count})` : ""}</span> : null}
                  {selected.google_maps_url ? <a className="text-primary underline" href={selected.google_maps_url} target="_blank" rel="noreferrer">Maps</a> : null}
                  {selected.social_links?.linkedin ? <a className="text-primary underline" href={selected.social_links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> : null}
                  {selected.social_links?.facebook ? <a className="text-primary underline" href={selected.social_links.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
                  {selected.social_links?.instagram ? <a className="text-primary underline" href={selected.social_links.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}
                </div>
                {selected.additional_info ? <p className="mt-2 text-muted-foreground">{selected.additional_info}</p> : null}
                {selected.icebreakers?.length ? (
                  <div className="mt-2 grid gap-2">
                    {selected.icebreakers.map((item, i) => (
                      <div key={i} className="rounded-md border border-border bg-background p-2 text-xs">
                        <span className="font-medium">{item.title}</span>
                        {item.url ? <> · <a className="text-primary underline" href={item.url} target="_blank" rel="noreferrer">Lien</a></> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {selected ? (
              <div className="grid gap-3 border-t border-border pt-4">
                <div>
                  <p className={labelClass}>Contacts enregistrés</p>
                  <div className="mt-2 grid gap-2">
                    {selected.contacts.length ? (
                      selected.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="rounded-lg border border-border bg-card p-3 text-sm"
                        >
                          <p className="font-medium">{contactName(contact)}</p>
                          <p className="text-muted-foreground">
                            {contact.role_title || "Rôle à qualifier"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {contact.direct_phone || contact.main_phone ? (
                              <a
                                href={`tel:${contact.direct_phone || contact.main_phone}`}
                                className="underline"
                              >
                                Appeler
                              </a>
                            ) : null}
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="underline">
                                Email
                              </a>
                            ) : null}
                            {contact.linkedin_url ? (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                LinkedIn
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className={labelClass}>Historique récent</p>
                  <div className="mt-2 grid gap-2">
                    {selected.prospection_logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-border bg-card p-3 text-sm"
                      >
                        <p className="font-medium">
                          {formatDate(log.action_date)} · {log.result || log.action_type}
                        </p>
                        <p className="text-muted-foreground">{log.notes || log.objective || "—"}</p>
                      </div>
                    ))}
                    {!selected.prospection_logs.length ? (
                      <p className="text-sm text-muted-foreground">Aucun historique.</p>
                    ) : null}
                  </div>
                </div>
              </div>
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

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-[20px] font-medium">{value}</p>
    </Card>
  );
}

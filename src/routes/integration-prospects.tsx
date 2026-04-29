import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/prm/AppLayout";
import {
  Button,
  Card,
  CategoryBadge,
  PageTitle,
  fieldClass,
  labelClass,
} from "@/components/prm/ui";
import {
  categories,
  headcountRanges,
  offerTargets,
  saveProspect,
  type Category,
  type HeadcountRange,
  type OfferTarget,
  type SearchSource,
} from "@/lib/prm";
import { enrichCompany, searchCompaniesBatch } from "@/server/prospect-search.functions";

export const Route = createFileRoute("/integration-prospects")({
  head: () => ({
    meta: [
      { title: "Intégration prospects — PRM SST" },
      {
        name: "description",
        content: "Wizard de recherche, enrichissement, contacts et qualification.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <IntegrationPage />
    </AppLayout>
  ),
});

type Company = {
  id: string;
  name: string;
  city: string;
  headcount?: string;
  naf?: string;
  siren?: string;
  address?: string;
  sector?: string;
  source?: SearchSource;
  keyword?: string;
  externalId?: string;
  score?: number;
  representatives?: { name: string; role: string }[];
  enrichment: "En attente" | "En cours" | "Trouvé" | "Non trouvé";
  qualification: "À qualifier" | "Qualifié";
  phone?: string;
  website?: string;
  placeId?: string;
  hours?: string;
  contacts: ContactDraft[];
  category?: Category;
  offer?: OfferTarget;
  value?: number;
  comments?: string;
};
type ContactDraft = {
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  linkedin: string;
  maturity: string;
  offer: OfferTarget;
  category: Category;
  value: number;
  comments: string;
};

type Filters = {
  q: string;
  keywords: string;
  departments: string[];
  headcounts: string[];
  sector: string;
  legal: string;
  limit: number;
};

type Step1Props = {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  source: SearchSource;
  setSource: (source: SearchSource) => void;
  loading: boolean;
  results: Company[];
  quotaBanner: boolean;
  batchRuns: Array<{ keyword: string; source: SearchSource; status: "terminé" | "erreur"; count: number; error?: string }>;
  missingKeys: string[];
  searchCompanies: (source?: SearchSource) => void;
  switchSource: (source: SearchSource) => void;
  selectCompany: (company: Company) => void;
  selected: Company[];
};

type UpdateContact = (company: Company, idx: number, patch: Partial<ContactDraft>) => void;

const defaultDepartments = ["07", "26", "38", "42", "69", "01", "73", "74"];
const sectors = [
  "Industrie manufacturière",
  "Logistique & transport",
  "Agroalimentaire",
  "Chimie & pharmacie",
  "Médico-social & santé",
  "BTP",
  "Services aux entreprises",
];
const sources = {
  pappers: "Pappers API",
  insee: "INSEE Sirene",
  annuaire: "Annuaire Entreprises",
} as const;
const quotas = {
  pappers: "Quota : 100 req/mois gratuites",
  insee: "Gratuit, sans limite",
  annuaire: "Gratuit, sans limite",
} as const;

function IntegrationPage() {
  const navigate = useNavigate();
  const runBatchSearch = useServerFn(searchCompaniesBatch);
  const runEnrichment = useServerFn(enrichCompany);
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<SearchSource>(
    () => (localStorage.getItem("prm-search-source") as SearchSource) || "annuaire",
  );
  const [filters, setFilters] = useState({
    q: "",
    keywords: "industrie annonay\nlogistique valence\nehpad ardèche",
    departments: defaultDepartments,
    headcounts: ["20-49", "50-99"],
    sector: "Industrie manufacturière",
    legal: "",
    limit: 8,
  });
  const [results, setResults] = useState<Company[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [quotaBanner, setQuotaBanner] = useState(false);
  const [batchRuns, setBatchRuns] = useState<
    Array<{ keyword: string; source: SearchSource; status: "terminé" | "erreur"; count: number; error?: string }>
  >([]);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [activeCompany, setActiveCompany] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("prm-search-source", source);
  }, [source]);
  useEffect(() => {
    if (step === 2) void enrichAll();
    // L'enrichissement se déclenche uniquement à l'entrée de l'étape 2.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === activeCompany) || companies[0],
    [companies, activeCompany],
  );

  async function searchCompanies(nextSource = source) {
    setLoading(true);
    setQuotaBanner(false);
    setBatchRuns([]);
    setMissingKeys([]);
    try {
      const keywords = filters.keywords
        .split("\n")
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      const response = await runBatchSearch({
        data: {
          source: nextSource,
          filters: { ...filters, keywords, limit: Number(filters.limit) || 8 },
        },
      });
      setBatchRuns(response.runs);
      setMissingKeys(response.missingKeys);
      setQuotaBanner(response.runs.some((run) => run.status === "erreur"));
      setResults(
        response.results.map((result) => ({
          id: result.id,
          name: result.name,
          city: result.city,
          headcount: result.headcount,
          naf: result.naf,
          siren: result.siren,
          address: result.address,
          sector: result.sector,
          source: result.source,
          keyword: result.keyword,
          externalId: result.externalId,
          score: result.score,
          representatives: result.representatives || [],
          enrichment: "En attente" as const,
          qualification: "À qualifier" as const,
          contacts: [],
        })),
      );
    } catch (error) {
      setBatchRuns([{ keyword: "Batch", source: nextSource, status: "erreur", count: 0, error: error instanceof Error ? error.message : "Erreur API" }]);
      setQuotaBanner(true);
    } finally {
      setLoading(false);
    }
  }

  function switchSource(next: SearchSource) {
    setSource(next);
    void searchCompanies(next);
  }
  function selectCompany(company: Company) {
    setCompanies((prev) => (prev.some((x) => x.id === company.id) ? prev : [...prev, company]));
    setActiveCompany(company.id);
  }

  async function enrichAll() {
    setCompanies((prev) =>
      prev.map((c) => ({
        ...c,
        enrichment: c.enrichment === "En attente" ? "En cours" : c.enrichment,
      })),
    );
    await Promise.all(
      companies.map(async (company) => {
        if (company.enrichment !== "En attente") return;
        try {
          const place = await runEnrichment({ data: { name: company.name, city: company.city } });
          updateCompany(
            company.id,
            place.status === "found"
              ? { enrichment: "Trouvé", address: place.address, phone: place.phone, website: place.website, placeId: place.placeId, hours: place.hours }
              : { enrichment: "Non trouvé" },
          );
        } catch {
          updateCompany(company.id, { enrichment: "Non trouvé" });
        }
      }),
    );
  }

  function updateCompany(id: string, patch: Partial<Company>) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addContact(company: Company, contact?: Partial<ContactDraft>) {
    const draft: ContactDraft = {
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      role: contact?.role || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      linkedin: contact?.linkedin || "",
      maturity: "Pas joint",
      offer: company.offer || "SST FI",
      category: company.category || "C – Porte d'entrée",
      value: company.value || 0,
      comments: "",
    };
    updateCompany(company.id, { contacts: [...company.contacts, draft] });
  }
  function updateContact(company: Company, idx: number, patch: Partial<ContactDraft>) {
    updateCompany(company.id, {
      contacts: company.contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
      qualification: "Qualifié",
    });
  }

  async function saveAll(continueAfter = false) {
    for (const company of companies) {
      const first = company.contacts[0];
      await saveProspect(
        {
          company_name: company.name,
          city: company.city,
          headcount_range: (company.headcount || "20-49") as HeadcountRange,
          category: first?.category || company.category || "C – Porte d'entrée",
          offer_target: first?.offer || company.offer || "SST FI",
          estimated_value: first?.value || company.value || 0,
          current_stage: "J1",
          status: "Tiède",
          main_phone: company.phone || "",
          website: company.website || "",
          address: company.address || "",
          reception_hours: company.hours || "",
          comments: company.comments || "",
          google_place_id: company.placeId || "",
          siren: company.siren || "",
          naf_code: company.naf || "",
          source: company.source || source,
          sector: company.sector || "",
          batch_keyword: company.keyword || "",
          external_source_id: company.externalId || company.siren || "",
          import_source: "api_batch",
        },
        first
          ? {
              first_name: first.firstName,
              last_name: first.lastName,
              role_title: first.role,
              direct_phone: first.phone,
              email: first.email,
              linkedin_url: first.linkedin,
              maturity_level: first.maturity,
              offer_target: first.offer,
              estimated_value: first.value,
              category: first.category,
              comments: first.comments,
            }
          : undefined,
      );
    }
    if (continueAfter) {
      setStep(1);
      setResults([]);
      setCompanies([]);
    } else {
      navigate({ to: "/prospects" });
    }
  }

  return (
    <>
      <PageTitle
        title="Intégration prospects"
        subtitle="Recherche, enrichissement, contacts et qualification finale."
      />
      <Stepper step={step} setStep={setStep} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="p-4">
          {step === 1 && (
            <Step1
              filters={filters}
              setFilters={setFilters}
              source={source}
              setSource={setSource}
              loading={loading}
              results={results}
              quotaBanner={quotaBanner}
              batchRuns={batchRuns}
              missingKeys={missingKeys}
              searchCompanies={searchCompanies}
              switchSource={switchSource}
              selectCompany={selectCompany}
              selected={companies}
            />
          )}
          {step === 2 && <Step2 companies={companies} updateCompany={updateCompany} enrichAll={enrichAll} />}
          {step === 3 && (
            <Step3 companies={companies} addContact={addContact} updateContact={updateContact} />
          )}
          {step === 4 && (
            <Step4
              companies={companies}
              updateContact={updateContact}
              updateCompany={updateCompany}
              saveAll={saveAll}
            />
          )}
          {step < 4 ? (
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && companies.length === 0}
              >
                Passer à l'étape {step + 1} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </Card>
        <Summary companies={companies} active={selectedCompany?.id} setActive={setActiveCompany} />
      </div>
    </>
  );
}

function Stepper({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {["Recherche entreprise", "Enrichissement", "Recherche contact", "Qualification finale"].map(
        (label, i) => {
          const n = i + 1;
          const state =
            n < step
              ? "bg-status-won text-primary-foreground"
              : n === step
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground";
          return (
            <button
              key={label}
              onClick={() => n <= step && setStep(n)}
              className="flex shrink-0 items-center gap-2"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${state}`}
              >
                {n < step ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className="text-sm font-medium">{label}</span>
              {n < 4 ? <span className="h-px w-8 bg-border" /> : null}
            </button>
          );
        },
      )}
    </div>
  );
}
function Step1(props: Step1Props) {
  const keywordCount = props.filters.keywords.split("\n").map((x) => x.trim()).filter(Boolean).length;
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
        <textarea
          className={`${fieldClass} min-h-28 py-2`}
          placeholder={"Mots-clés batch, un par ligne\nindustrie annonay\nlogistique valence"}
          value={props.filters.keywords}
          onChange={(e) => props.setFilters({ ...props.filters, keywords: e.target.value, q: e.target.value.split("\n")[0] || "" })}
        />
        <select
          className={fieldClass}
          value={props.filters.sector}
          onChange={(e) => props.setFilters({ ...props.filters, sector: e.target.value })}
        >
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          className={fieldClass}
          placeholder="Statut juridique"
          value={props.filters.legal}
          onChange={(e) => props.setFilters({ ...props.filters, legal: e.target.value })}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <div>
          <label className={labelClass}>Source de recherche</label>
          <select
            className={`${fieldClass} mt-1 w-full`}
            value={props.source}
            onChange={(e) => props.setSource(e.target.value as SearchSource)}
          >
            {Object.entries(sources).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            {quotas[props.source as SearchSource]}
          </p>
        </div>
        <div>
          <label className={labelClass}>Résultats par mot-clé</label>
          <input
            className={`${fieldClass} mt-1 w-full`}
            type="number"
            min={1}
            max={25}
            value={props.filters.limit}
            onChange={(e) => props.setFilters({ ...props.filters, limit: Number(e.target.value) })}
          />
          <p className="mt-1 text-xs text-muted-foreground">{keywordCount} mot(s)-clé(s)</p>
        </div>
        <Button onClick={() => props.searchCompanies()} disabled={props.loading}>
          <Search className="mr-2 h-4 w-4" />
          {props.loading ? "Batch en cours…" : "Lancer le batch"}
        </Button>
      </div>
      {props.quotaBanner ? (
        <div className="rounded-lg bg-script p-3 text-sm">
          Certaines recherches n'ont pas abouti — basculer vers une autre source ?{" "}
          <button className="ml-3 underline" onClick={() => props.switchSource("insee")}>
            INSEE Sirene
          </button>
          <button className="ml-3 underline" onClick={() => props.switchSource("annuaire")}>
            Annuaire Entreprises
          </button>
        </div>
      ) : null}
      {props.missingKeys.length ? (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          API à configurer : {props.missingKeys.join(", ")}. Les sources gratuites ou la saisie manuelle restent utilisables.
        </div>
      ) : null}
      {props.batchRuns.length ? (
        <div className="grid gap-2 md:grid-cols-3">
          {props.batchRuns.map((run) => (
            <div key={`${run.keyword}-${run.source}`} className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-medium">{run.keyword}</p>
              <p className="text-muted-foreground">{sources[run.source]} · {run.count} résultat(s)</p>
              {run.error ? <p className="text-xs text-muted-foreground">{run.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              {["Mot-clé", "Source", "Nom", "Ville", "Effectifs", "NAF", "SIREN", "Score", ""].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.results.map((r: Company) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.keyword || "—"}</td>
                <td className="px-3 py-2">{r.source ? sources[r.source] : "—"}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.city}</td>
                <td className="px-3 py-2">{r.headcount}</td>
                <td className="px-3 py-2">{r.naf}</td>
                <td className="px-3 py-2">{r.siren}</td>
                <td className="px-3 py-2">{r.score || "—"}</td>
                <td className="px-3 py-2">
                  <Button variant="neutral" onClick={() => props.selectCompany(r)}>
                    Sélectionner
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {props.selected.length} entreprise(s) en staging.
      </p>
    </div>
  );
}
function Step2({
  companies,
  updateCompany,
  enrichAll,
}: {
  companies: Company[];
  updateCompany: (id: string, p: Partial<Company>) => void;
  enrichAll: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <Button variant="neutral" onClick={enrichAll}>Relancer l'enrichissement</Button>
      </div>
      {companies.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex justify-between">
            <h3 className="font-medium">{c.name}</h3>
            <span className="text-sm text-muted-foreground">{c.enrichment}</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className={fieldClass}
              placeholder="Numéro accueil"
              value={c.phone || ""}
              onChange={(e) => updateCompany(c.id, { phone: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Site web"
              value={c.website || ""}
              onChange={(e) => updateCompany(c.id, { website: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Adresse complète"
              value={c.address || ""}
              onChange={(e) => updateCompany(c.id, { address: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Google Place ID"
              value={c.placeId || ""}
              onChange={(e) => updateCompany(c.id, { placeId: e.target.value })}
            />
          </div>
          <textarea
            className={`${fieldClass} mt-3 min-h-20 w-full py-2`}
            placeholder="Horaires"
            value={c.hours || ""}
            onChange={(e) => updateCompany(c.id, { hours: e.target.value })}
          />
        </Card>
      ))}
    </div>
  );
}
function Step3({
  companies,
  addContact,
  updateContact,
}: {
  companies: Company[];
  addContact: (company: Company, contact?: Partial<ContactDraft>) => void;
  updateContact: UpdateContact;
}) {
  return (
    <div className="grid gap-3">
      {companies.map((c: Company) => (
        <Card key={c.id} className="p-4">
          <h3 className="font-medium">{c.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.sector?.includes("Médico")
              ? "Cibles prioritaires : Directeur, Responsable formation, Infirmier(e) coordinateur(trice)"
              : c.sector?.includes("Transport")
                ? "Cibles prioritaires : Responsable QSE, DRH, Gérant"
                : "Cibles prioritaires : Responsable HSE, Responsable RH, Dirigeant"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="neutral"
              onClick={() => window.open(`${c.website || ""}/contact`, "_blank")}
            >
              Site web → Page équipe
            </Button>
            <Button
              variant="neutral"
              onClick={() =>
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(`"${c.name}" "responsable RH" OR "responsable sécurité" OR "QHSE" OR "responsable HSE" OR "DRH" site:linkedin.com`)}`,
                  "_blank",
                )
              }
            >
              Google : responsable RH/Sécurité
            </Button>
            <Button
              variant="neutral"
              onClick={() => window.open("https://hunter.io/search", "_blank")}
            >
              Hunter.io : trouver email
            </Button>
            <Button onClick={() => addContact(c)}>Ajouter contact manuellement</Button>
          </div>
          {c.representatives?.map((r) => (
            <Button
              key={r.name}
              className="mt-2"
              variant="info"
              onClick={() =>
                addContact(c, {
                  firstName: r.name.split(" ")[0],
                  lastName: r.name.split(" ").slice(1).join(" "),
                  role: r.role,
                })
              }
            >
              Ajouter {r.name}
            </Button>
          ))}
          <ContactEditors company={c} updateContact={updateContact} />
        </Card>
      ))}
    </div>
  );
}
function Step4({
  companies,
  updateContact,
  updateCompany,
  saveAll,
}: {
  companies: Company[];
  updateContact: UpdateContact;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  saveAll: (continueAfter?: boolean) => void;
}) {
  return (
    <div className="grid gap-3">
      {companies.map((c: Company) => (
        <Card key={c.id} className="p-4">
          <div className="flex justify-between gap-2">
            <h3 className="font-medium">{c.name}</h3>
            <CategoryBadge
              category={c.contacts[0]?.category || c.category || "C – Porte d'entrée"}
            />
          </div>
          <ContactEditors company={c} updateContact={updateContact} qualification />
          <textarea
            className={`${fieldClass} mt-3 min-h-20 w-full py-2`}
            placeholder="Commentaires entreprise"
            value={c.comments || ""}
            onChange={(e) => updateCompany(c.id, { comments: e.target.value })}
          />
        </Card>
      ))}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="neutral" onClick={() => saveAll(true)}>
          Sauvegarder et continuer
        </Button>
        <Button onClick={() => saveAll(false)}>Ajouter au PRM</Button>
      </div>
    </div>
  );
}
function ContactEditors({
  company,
  updateContact,
  qualification = false,
}: {
  company: Company;
  updateContact: UpdateContact;
  qualification?: boolean;
}) {
  return (
    <div className="mt-3 grid gap-3">
      {company.contacts.map((ct: ContactDraft, idx: number) => (
        <div key={idx} className="rounded-lg border border-border bg-background p-3">
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="Prénom"
              value={ct.firstName}
              onChange={(e) => updateContact(company, idx, { firstName: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Nom"
              value={ct.lastName}
              onChange={(e) => updateContact(company, idx, { lastName: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Rôle/Titre"
              value={ct.role}
              onChange={(e) => updateContact(company, idx, { role: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Téléphone direct"
              value={ct.phone}
              onChange={(e) => updateContact(company, idx, { phone: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Email"
              value={ct.email}
              onChange={(e) => updateContact(company, idx, { email: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="LinkedIn URL"
              value={ct.linkedin}
              onChange={(e) => updateContact(company, idx, { linkedin: e.target.value })}
            />
          </div>
          {qualification ? (
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <select
                className={fieldClass}
                value={ct.maturity}
                onChange={(e) => updateContact(company, idx, { maturity: e.target.value })}
              >
                {[
                  "Pas joint",
                  "Intérêt",
                  "RDV",
                  "Devis",
                  "Décision",
                  "Pas de sujet",
                  "Intérêt à relancer",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={ct.offer}
                onChange={(e) =>
                  updateContact(company, idx, { offer: e.target.value as OfferTarget })
                }
              >
                {offerTargets.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={ct.category}
                onChange={(e) =>
                  updateContact(company, idx, { category: e.target.value as Category })
                }
              >
                {categories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <input
                className={fieldClass}
                type="number"
                value={ct.value}
                onChange={(e) => updateContact(company, idx, { value: Number(e.target.value) })}
              />
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Button
              variant="neutral"
              onClick={() =>
                window.open(
                  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${ct.firstName} ${ct.lastName} ${company.name}`)}`,
                  "_blank",
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Rechercher sur LinkedIn
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
function Summary({
  companies,
  active,
  setActive,
}: {
  companies: Company[];
  active?: string;
  setActive: (id: string) => void;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-[16px] font-medium">Résumé session</h3>
      <div className="mt-3 grid gap-2">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`rounded-lg border border-border p-3 text-left ${active === c.id ? "bg-script" : "bg-card"}`}
          >
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground">
              {c.city} · {c.contacts.length} contact(s)
            </p>
            <p className="text-xs text-muted-foreground">
              Enrichissement : {c.enrichment} · {c.qualification}
            </p>
          </button>
        ))}
      </div>
    </Card>
  );
}

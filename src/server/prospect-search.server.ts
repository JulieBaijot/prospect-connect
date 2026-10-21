import type { SearchSource } from "@/lib/prm";

export type CompanySearchFilters = {
  keywords: string[];
  departments: string[];
  headcounts: string[];
  sector: string;
  legal: string;
  limit: number;
};

export type CompanySearchResult = {
  id: string;
  name: string;
  city: string;
  headcount?: string;
  naf?: string;
  siren?: string;
  address?: string;
  sector?: string;
  source: SearchSource;
  keyword: string;
  externalId?: string;
  score?: number;
  representatives?: { name: string; role: string }[];
};

export type BatchSearchResponse = {
  results: CompanySearchResult[];
  runs: Array<{
    keyword: string;
    source: SearchSource;
    status: "terminé" | "erreur";
    count: number;
    error?: string;
  }>;
  missingKeys: string[];
};

const ANNUAIRE_URL = "https://recherche-entreprises.api.gouv.fr/search";
const PAPPERS_URL = "https://api.pappers.fr/v2/recherche";
const SIRENE_URL = "https://api.insee.fr/api-sirene/3.11/siret";

function normalizeHeadcount(value: unknown): string | undefined {
  const text = String(value || "").trim();
  const map: Record<string, string> = {
    "01": "10-19",
    "02": "10-19",
    "03": "20-49",
    "11": "10-19",
    "12": "20-49",
    "21": "50-99",
    "22": "100-199",
    "31": "200-249",
    "32": "250-499",
    "41": "500-999",
    "42": "1000+",
    "51": "1000+",
    "52": "1000+",
    "53": "1000+",
  };
  if (map[text]) return map[text];
  if (/10.*19/.test(text)) return "10-19";
  if (/20.*49/.test(text)) return "20-49";
  if (/50.*99/.test(text)) return "50-99";
  if (/100.*199/.test(text)) return "100-199";
  if (/200.*249/.test(text)) return "200-249";
  if (/250.*499/.test(text)) return "250-499";
  if (/500.*999/.test(text)) return "500-999";
  if (/1000/.test(text)) return "1000+";
  return undefined;
}

function safeId(prefix: string, keyword: string, value?: string) {
  return `${prefix}-${keyword}-${value || crypto.randomUUID()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function filterByHeadcount<T extends CompanySearchResult>(rows: T[], wanted: string[]) {
  if (!wanted.length) return rows;
  return rows.filter((row) => !row.headcount || wanted.includes(row.headcount));
}

async function searchAnnuaire(keyword: string, filters: CompanySearchFilters): Promise<CompanySearchResult[]> {
  const params = new URLSearchParams({ q: keyword, per_page: String(filters.limit) });
  filters.departments.forEach((department) => params.append("departement", department));
  const res = await fetch(`${ANNUAIRE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Annuaire Entreprises ${res.status}`);
  const json = await res.json() as { results?: Array<Record<string, unknown>> };
  const rows = (json.results || []).map((item) => {
    const siege = (item.siege || {}) as Record<string, unknown>;
    const dirigeants = Array.isArray(item.dirigeants) ? item.dirigeants as Array<Record<string, unknown>> : [];
    const name = String(item.nom_complet || item.nom_raison_sociale || item.nom_entreprise || "Entreprise sans nom");
    return {
      id: safeId("annuaire", keyword, String(item.siren || siege.siren || name)),
      name,
      city: String(siege.libelle_commune || siege.commune || ""),
      headcount: normalizeHeadcount(item.tranche_effectif_salarie || siege.tranche_effectif_salarie),
      naf: String(item.activite_principale || siege.activite_principale || ""),
      siren: String(item.siren || ""),
      address: [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean).join(" "),
      sector: filters.sector,
      source: "annuaire" as const,
      keyword,
      externalId: String(item.siren || ""),
      score: Number(item.matching_etablissements || 0) || undefined,
      representatives: dirigeants.slice(0, 3).map((d) => ({
        name: String(d.nom || d.prenoms || d.nom_complet || "").trim(),
        role: String(d.qualite || "Dirigeant"),
      })).filter((d) => d.name),
    };
  });
  return filterByHeadcount(rows, filters.headcounts);
}

async function searchPappers(keyword: string, filters: CompanySearchFilters): Promise<CompanySearchResult[]> {
  const key = process.env.PAPPERS_API_KEY;
  if (!key) throw new Error("Clé Pappers absente");
  const params = new URLSearchParams({ api_token: key, q: keyword, par_page: String(filters.limit) });
  filters.departments.forEach((department) => params.append("departement", department));
  const res = await fetch(`${PAPPERS_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Pappers ${res.status}`);
  const json = await res.json() as { resultats?: Array<Record<string, unknown>> };
  const rows = (json.resultats || []).map((item) => {
    const reps = Array.isArray(item.representants) ? item.representants as Array<Record<string, unknown>> : [];
    const siege = (item.siege || {}) as Record<string, unknown>;
    const name = String(item.nom_entreprise || item.denomination || "Entreprise sans nom");
    return {
      id: safeId("pappers", keyword, String(item.siren || name)),
      name,
      city: String(item.ville || ""),
      headcount: normalizeHeadcount(item.tranche_effectif || item.effectif),
      naf: String(item.code_naf || ""),
      siren: String(item.siren || ""),
      address: String(siege.adresse_ligne_1 || item.adresse || ""),
      sector: filters.sector,
      source: "pappers" as const,
      keyword,
      externalId: String(item.siren || ""),
      score: Number(item.score || 0) || undefined,
      representatives: reps.slice(0, 3).map((r) => ({
        name: [r.prenom, r.nom].filter(Boolean).join(" ") || String(r.nom_complet || ""),
        role: String(r.qualite || "Dirigeant"),
      })).filter((r) => r.name),
    };
  });
  return filterByHeadcount(rows, filters.headcounts);
}

async function searchSirene(keyword: string, filters: CompanySearchFilters): Promise<CompanySearchResult[]> {
  const token = process.env.SIRENE_API_KEY;
  if (!token) return searchAnnuaire(keyword, filters);
  const q = [`denominationUniteLegale:${keyword}*`, filters.legal ? `categorieJuridiqueUniteLegale:${filters.legal}` : ""].filter(Boolean).join(" AND ");
  const params = new URLSearchParams({ q, nombre: String(filters.limit) });
  const res = await fetch(`${SIRENE_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`INSEE Sirene ${res.status}`);
  const json = await res.json() as { etablissements?: Array<Record<string, unknown>> };
  const rows = (json.etablissements || []).map((item) => {
    const unite = (item.uniteLegale || {}) as Record<string, unknown>;
    const adresse = (item.adresseEtablissement || {}) as Record<string, unknown>;
    const name = String(unite.denominationUniteLegale || unite.nomUniteLegale || "Entreprise sans nom");
    return {
      id: safeId("insee", keyword, String(item.siren || item.siret || name)),
      name,
      city: String(adresse.libelleCommuneEtablissement || ""),
      headcount: normalizeHeadcount(item.trancheEffectifsEtablissement || unite.trancheEffectifsUniteLegale),
      naf: String(item.activitePrincipaleEtablissement || unite.activitePrincipaleUniteLegale || ""),
      siren: String(item.siren || ""),
      address: [adresse.numeroVoieEtablissement, adresse.typeVoieEtablissement, adresse.libelleVoieEtablissement, adresse.codePostalEtablissement, adresse.libelleCommuneEtablissement].filter(Boolean).join(" "),
      sector: filters.sector,
      source: "insee" as const,
      keyword,
      externalId: String(item.siret || item.siren || ""),
    };
  });
  return filterByHeadcount(rows, filters.headcounts);
}

function dedupe(rows: CompanySearchResult[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.siren || `${row.name.toLowerCase()}-${row.city.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchCompaniesBatchServer(input: { source: SearchSource; filters: CompanySearchFilters }): Promise<BatchSearchResponse> {
  const missingKeys: string[] = [];
  if (input.source === "pappers" && !process.env.PAPPERS_API_KEY) missingKeys.push("PAPPERS_API_KEY");
  if (input.source === "insee" && !process.env.SIRENE_API_KEY) missingKeys.push("SIRENE_API_KEY : fallback Annuaire utilisé");

  const results: CompanySearchResult[] = [];
  const runs: BatchSearchResponse["runs"] = [];
  for (const keyword of input.filters.keywords) {
    try {
      const rows = input.source === "pappers"
        ? await searchPappers(keyword, input.filters)
        : input.source === "insee"
          ? await searchSirene(keyword, input.filters)
          : await searchAnnuaire(keyword, input.filters);
      results.push(...rows);
      runs.push({ keyword, source: input.source, status: "terminé", count: rows.length });
    } catch (error) {
      if (input.source === "pappers") {
        try {
          const fallback = await searchAnnuaire(keyword, input.filters);
          results.push(...fallback.map((row) => ({ ...row, source: "annuaire" as const })));
          runs.push({ keyword, source: "annuaire", status: "terminé", count: fallback.length, error: error instanceof Error ? error.message : "Fallback Annuaire" });
          continue;
        } catch {
          // Keep original error below.
        }
      }
      runs.push({ keyword, source: input.source, status: "erreur", count: 0, error: error instanceof Error ? error.message : "Erreur API" });
    }
  }
  return { results: dedupe(results), runs, missingKeys };
}

// ─── Enrichment (Recherche d'entreprises + Perplexity) ───

export type SourceStatus = { status: "ok" | "error" | "skipped"; message?: string };

export type Icebreaker = { type?: string; title: string; source?: string; date?: string; url?: string };

export const SOURCE_LABELS = {
  recherche_entreprises: "Recherche d'entreprises (api.gouv.fr)",
  perplexity: "Perplexity",
} as const;
export type EnrichmentSourceKey = keyof typeof SOURCE_LABELS;

export type EnrichmentResult = {
  status: "found" | "partial" | "not_found" | "missing_key";
  // Recherche d'entreprises
  siren?: string;
  address?: string;
  headcount_range?: string;
  naf_code?: string;
  dirigeants?: { name: string; role: string }[];
  // Perplexity
  phone?: string;
  website?: string;
  hr_contact?: string;
  decision_maker?: string;
  employees_count?: string;
  social_links?: { facebook?: string; instagram?: string; linkedin?: string };
  icebreakers?: Icebreaker[];
  additional_info?: string;
  /** Origine de chaque information renvoyée. */
  field_sources: Record<string, EnrichmentSourceKey>;
  sources: { recherche_entreprises: SourceStatus; perplexity: SourceStatus };
};

// Codes INSEE de tranche d'effectif → tranches du PRM.
const TRANCHE_MAP: Record<string, string> = {
  "01": "1-9", "02": "1-9", "03": "1-9",
  "11": "10-19", "12": "20-49", "21": "50-99", "22": "100-199",
  "31": "200-249", "32": "250-499", "41": "500-999", "42": "1000+",
  "51": "1000+", "52": "1000+", "53": "1000+",
};

type RechercheData = Pick<EnrichmentResult, "siren" | "address" | "headcount_range" | "naf_code" | "dirigeants">;

async function fetchRechercheEntreprises(input: { name: string; city?: string }): Promise<{ data: RechercheData; source: SourceStatus }> {
  const q = [input.name, input.city].filter(Boolean).join(" ");
  const res = await fetch(`${ANNUAIRE_URL}?${new URLSearchParams({ q, per_page: "1" }).toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Recherche d'entreprises error:", res.status, body);
    const message = res.status === 429 ? "Trop de requêtes, réessayez dans une minute" : `Erreur Recherche d'entreprises (${res.status})`;
    return { data: {}, source: { status: "error", message } };
  }
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  const item = json.results?.[0];
  if (!item) return { data: {}, source: { status: "ok", message: "Aucune entreprise trouvée" } };
  const siege = (item.siege || {}) as Record<string, unknown>;
  const dirigeants = (Array.isArray(item.dirigeants) ? (item.dirigeants as Array<Record<string, unknown>>) : [])
    .map((d) => ({
      name: [d.prenoms, d.nom].filter(Boolean).join(" ").trim() || String(d.denomination || "").trim(),
      role: String(d.qualite || "Dirigeant"),
    }))
    .filter((d) => d.name)
    .slice(0, 5);
  const tranche = String(item.tranche_effectif_salarie || siege.tranche_effectif_salarie || "");
  const address =
    String(siege.adresse || "").trim() ||
    [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean).join(" ");
  const data: RechercheData = {};
  if (item.siren) data.siren = String(item.siren);
  if (address) data.address = address;
  if (TRANCHE_MAP[tranche]) data.headcount_range = TRANCHE_MAP[tranche];
  const naf = String(item.activite_principale || siege.activite_principale || "");
  if (naf) data.naf_code = naf;
  if (dirigeants.length) data.dirigeants = dirigeants;
  return { data, source: { status: "ok" } };
}

type PerplexityData = Pick<
  EnrichmentResult,
  "phone" | "website" | "hr_contact" | "decision_maker" | "employees_count" | "social_links" | "icebreakers" | "additional_info"
>;

async function fetchPerplexity(input: { name: string; city?: string; activity?: string; address?: string }): Promise<{ data: PerplexityData; source: SourceStatus }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { data: {}, source: { status: "skipped", message: "Clé Perplexity non configurée" } };

  const location = [input.address, input.city].filter(Boolean).join(", ") || "France";
  const prompt = `Recherche des informations commerciales sur l'entreprise "${input.name}"${input.activity ? `, ${input.activity}` : ""}, située à ${location} (France).

Retourne en JSON :
- phone: numéro de téléphone du standard / accueil de l'établissement (format français)
- website: site web officiel (URL)
- hr_contact: nom et fonction d'un interlocuteur RH, QSE, HSE ou sécurité si publiquement disponible
- decision_maker: nom et fonction du dirigeant ou directeur de site
- employees_count: estimation du nombre d'employés (ex: "50-99")
- social_links: objet avec clés facebook, instagram, linkedin (URLs)
- icebreakers: actualités récentes (max 5) avec type (news/event/social/award), title, source, date (ISO), url
- additional_info: autre info utile pour un commercial B2B en santé-sécurité au travail

Ne retourne QUE des informations vérifiables. Si tu ne trouves rien pour un champ, omets-le.`;

  const str = { type: "string" };
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "Tu es un assistant de recherche commerciale. Réponds uniquement en JSON valide." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prospect_enrichment",
          schema: {
            type: "object",
            properties: {
              phone: str, website: str, hr_contact: str, decision_maker: str, employees_count: str,
              social_links: { type: "object", properties: { facebook: str, instagram: str, linkedin: str } },
              icebreakers: {
                type: "array",
                items: {
                  type: "object",
                  properties: { type: { type: "string", enum: ["news", "event", "social", "award"] }, title: str, source: str, date: str, url: str },
                  required: ["title"],
                },
              },
              additional_info: str,
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Perplexity error:", res.status, errText);
    let message = `Erreur Perplexity (${res.status})`;
    if (res.status === 429) message = "Limite de requêtes Perplexity atteinte";
    if (res.status === 402 || (res.status === 401 && errText.includes("insufficient_quota"))) message = "Crédits Perplexity épuisés";
    else if (res.status === 401) message = "Clé Perplexity invalide";
    return { data: {}, source: { status: "error", message } };
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return { data: {}, source: { status: "error", message: "Réponse Perplexity vide" } };
  try {
    const parsed = JSON.parse(content) as PerplexityData;
    const cleaned: PerplexityData = {};
    for (const key of ["phone", "website", "hr_contact", "decision_maker", "employees_count", "additional_info"] as const) {
      const v = parsed[key];
      if (typeof v === "string" && v.trim()) cleaned[key] = v.trim();
    }
    if (parsed.social_links && Object.values(parsed.social_links).some((v) => typeof v === "string" && v.length > 0)) {
      cleaned.social_links = parsed.social_links;
    }
    if (Array.isArray(parsed.icebreakers) && parsed.icebreakers.length) {
      cleaned.icebreakers = parsed.icebreakers.filter((i) => i && typeof i.title === "string" && i.title.length > 0).slice(0, 5);
    }
    return { data: cleaned, source: { status: "ok" } };
  } catch (error) {
    console.error("Perplexity JSON parse error:", error);
    return { data: {}, source: { status: "error", message: "Réponse Perplexity invalide" } };
  }
}

export async function enrichCompanyServer(input: { name: string; city?: string; activity?: string; address?: string }): Promise<EnrichmentResult> {
  const [re, pp] = await Promise.allSettled([fetchRechercheEntreprises(input), fetchPerplexity(input)]);
  const reRes = re.status === "fulfilled" ? re.value : { data: {} as RechercheData, source: { status: "error" as const, message: "Recherche d'entreprises injoignable" } };
  const ppRes = pp.status === "fulfilled" ? pp.value : { data: {} as PerplexityData, source: { status: "error" as const, message: "Perplexity injoignable" } };

  const field_sources: Record<string, EnrichmentSourceKey> = {};
  for (const k of Object.keys(reRes.data)) field_sources[k] = "recherche_entreprises";
  for (const k of Object.keys(ppRes.data)) field_sources[k] = "perplexity";

  const anyData = Object.keys(field_sources).length > 0;
  const status: EnrichmentResult["status"] = !anyData
    ? "not_found"
    : reRes.source.status === "ok" && ppRes.source.status === "ok"
      ? "found"
      : "partial";

  return {
    status,
    ...reRes.data,
    ...ppRes.data,
    field_sources,
    sources: { recherche_entreprises: reRes.source, perplexity: ppRes.source },
  };
}

export async function findEmailServer(input: { domain?: string; company?: string; firstName?: string; lastName?: string }) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return { status: "missing_key" as const, missingKey: "HUNTER_API_KEY" };
  const params = new URLSearchParams({ api_key: key });
  if (input.domain) params.set("domain", input.domain.replace(/^https?:\/\//, "").split("/")[0]);
  if (input.company) params.set("company", input.company);
  if (input.firstName) params.set("first_name", input.firstName);
  if (input.lastName) params.set("last_name", input.lastName);
  const res = await fetch(`https://api.hunter.io/v2/email-finder?${params.toString()}`);
  if (!res.ok) throw new Error(`Hunter.io ${res.status}`);
  const json = await res.json();
  const email = json.data?.email || "";
  return email ? { status: "found" as const, email, score: json.data?.score || null } : { status: "not_found" as const };
}

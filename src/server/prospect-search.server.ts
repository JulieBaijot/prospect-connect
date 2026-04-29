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

export async function enrichCompanyServer(input: { name: string; city?: string }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { status: "missing_key" as const, missingKey: "GOOGLE_PLACES_API_KEY" };
  const text = encodeURIComponent(`${input.name} ${input.city || ""}`.trim());
  const search = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${text}&key=${key}`);
  if (!search.ok) throw new Error(`Google Places ${search.status}`);
  const json = await search.json();
  const place = json.results?.[0];
  if (!place?.place_id) return { status: "not_found" as const };
  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", place.place_id);
  detailsUrl.searchParams.set("fields", "formatted_address,formatted_phone_number,website,opening_hours,place_id");
  detailsUrl.searchParams.set("key", key);
  const detailsRes = await fetch(detailsUrl);
  const details = detailsRes.ok ? await detailsRes.json() : {};
  const result = details.result || place;
  return {
    status: "found" as const,
    address: result.formatted_address || place.formatted_address || "",
    phone: result.formatted_phone_number || "",
    website: result.website || "",
    placeId: result.place_id || place.place_id || "",
    hours: Array.isArray(result.opening_hours?.weekday_text) ? result.opening_hours.weekday_text.join("\n") : "",
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

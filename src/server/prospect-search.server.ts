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

// ─── Enrichment (Google Places v1 + Perplexity) ───

export type SourceStatus = { status: "ok" | "error" | "skipped"; message?: string };

export type Icebreaker = {
  type?: string;
  title: string;
  source?: string;
  date?: string;
  url?: string;
};

export type EnrichmentResult = {
  status: "found" | "partial" | "not_found" | "missing_key";
  missingKey?: string;
  // Google Places
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;
  placeId?: string;
  average_rating?: number;
  reviews_count?: number;
  google_maps_url?: string;
  // Perplexity
  decision_maker?: string;
  employees_count?: string;
  social_links?: { facebook?: string; instagram?: string; linkedin?: string };
  icebreakers?: Icebreaker[];
  additional_info?: string;
  // Diagnostics
  sources: { google_places: SourceStatus; perplexity: SourceStatus };
};

type GooglePlacesData = {
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;
  placeId?: string;
  average_rating?: number;
  reviews_count?: number;
  google_maps_url?: string;
};

type PerplexityData = {
  decision_maker?: string;
  employees_count?: string;
  social_links?: { facebook?: string; instagram?: string; linkedin?: string };
  icebreakers?: Icebreaker[];
  additional_info?: string;
};

async function fetchGooglePlacesV1(input: {
  name: string;
  city?: string;
  activity?: string;
  address?: string;
}): Promise<{ data: GooglePlacesData; source: SourceStatus }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { data: {}, source: { status: "skipped", message: "GOOGLE_PLACES_API_KEY non configurée" } };

  const textQuery = [input.name, input.activity, input.address || input.city]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fieldMask = [
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.regularOpeningHours",
    "places.id",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({ textQuery, languageCode: "fr", regionCode: "FR", pageSize: 1 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Google Places v1 error:", res.status, errText);
    const message =
      res.status === 403
        ? "Clé invalide ou Places API (New) désactivée sur Google Cloud"
        : res.status === 429
          ? "Quota Google Places atteint"
          : `Erreur Google Places (${res.status})`;
    return { data: {}, source: { status: "error", message } };
  }

  const json = (await res.json()) as { places?: Array<Record<string, unknown>> };
  const place = json.places?.[0];
  if (!place) return { data: {}, source: { status: "ok", message: "Aucun résultat trouvé" } };

  const oh = (place.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined);
  const hours = oh?.weekdayDescriptions?.length ? oh.weekdayDescriptions.join(" | ") : undefined;

  return {
    data: {
      address: (place.formattedAddress as string) || undefined,
      phone:
        (place.nationalPhoneNumber as string) ||
        (place.internationalPhoneNumber as string) ||
        undefined,
      website: (place.websiteUri as string) || undefined,
      hours,
      placeId: (place.id as string) || undefined,
      average_rating: typeof place.rating === "number" ? (place.rating as number) : undefined,
      reviews_count:
        typeof place.userRatingCount === "number" ? (place.userRatingCount as number) : undefined,
      google_maps_url: (place.googleMapsUri as string) || undefined,
    },
    source: { status: "ok" },
  };
}

async function fetchPerplexity(input: {
  name: string;
  city?: string;
  activity?: string;
  address?: string;
}): Promise<{ data: PerplexityData; source: SourceStatus }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey)
    return { data: {}, source: { status: "skipped", message: "PERPLEXITY_API_KEY non configurée" } };

  const location = [input.address, input.city].filter(Boolean).join(", ") || "France";
  const prompt = `Recherche des informations commerciales sur "${input.name}"${
    input.activity ? `, ${input.activity}` : ""
  }, situé à ${location}.

Trouve et retourne en JSON :
- decision_maker: nom et fonction du gérant/décideur si trouvé
- employees_count: estimation du nombre d'employés (ex: "5-10")
- social_links: objet avec clés facebook, instagram, linkedin (URLs)
- icebreakers: tableau d'actualités récentes (max 5), chaque élément avec type (news/event/social/award), title, source, date (ISO), url
- additional_info: toute autre info pertinente pour un commercial B2B en santé-sécurité au travail

Ne retourne QUE des informations vérifiables. Si tu ne trouves rien pour un champ, omets-le.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant de recherche commerciale. Réponds uniquement en JSON valide.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prospect_enrichment",
          schema: {
            type: "object",
            properties: {
              decision_maker: { type: "string" },
              employees_count: { type: "string" },
              social_links: {
                type: "object",
                properties: {
                  facebook: { type: "string" },
                  instagram: { type: "string" },
                  linkedin: { type: "string" },
                },
              },
              icebreakers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["news", "event", "social", "award"] },
                    title: { type: "string" },
                    source: { type: "string" },
                    date: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["title"],
                },
              },
              additional_info: { type: "string" },
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
    if (res.status === 429) message = "Limites de requêtes Perplexity dépassées";
    if (res.status === 402) message = "Crédits Perplexity insuffisants";
    if (res.status === 401) message = "Clé API Perplexity invalide";
    return { data: {}, source: { status: "error", message } };
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return { data: {}, source: { status: "error", message: "Réponse Perplexity vide" } };

  try {
    const parsed = JSON.parse(content) as PerplexityData;
    const cleaned: PerplexityData = {};
    if (parsed.decision_maker) cleaned.decision_maker = parsed.decision_maker;
    if (parsed.employees_count) cleaned.employees_count = parsed.employees_count;
    if (
      parsed.social_links &&
      Object.values(parsed.social_links).some((value) => typeof value === "string" && value.length > 0)
    ) {
      cleaned.social_links = parsed.social_links;
    }
    if (Array.isArray(parsed.icebreakers) && parsed.icebreakers.length) {
      cleaned.icebreakers = parsed.icebreakers
        .filter((item) => item && typeof item.title === "string" && item.title.length > 0)
        .slice(0, 5);
    }
    if (parsed.additional_info) cleaned.additional_info = parsed.additional_info;
    return { data: cleaned, source: { status: "ok" } };
  } catch (error) {
    console.error("Perplexity JSON parse error:", error);
    return { data: {}, source: { status: "error", message: "Réponse Perplexity invalide" } };
  }
}

export async function enrichCompanyServer(input: {
  name: string;
  city?: string;
  activity?: string;
  address?: string;
}): Promise<EnrichmentResult> {
  if (!process.env.GOOGLE_PLACES_API_KEY && !process.env.PERPLEXITY_API_KEY) {
    return {
      status: "missing_key",
      missingKey: "GOOGLE_PLACES_API_KEY & PERPLEXITY_API_KEY",
      sources: {
        google_places: { status: "skipped", message: "GOOGLE_PLACES_API_KEY non configurée" },
        perplexity: { status: "skipped", message: "PERPLEXITY_API_KEY non configurée" },
      },
    };
  }

  const [gp, pp] = await Promise.allSettled([fetchGooglePlacesV1(input), fetchPerplexity(input)]);

  const gpRes =
    gp.status === "fulfilled"
      ? gp.value
      : { data: {} as GooglePlacesData, source: { status: "error" as const, message: "Exception Google Places" } };
  const ppRes =
    pp.status === "fulfilled"
      ? pp.value
      : { data: {} as PerplexityData, source: { status: "error" as const, message: "Exception Perplexity" } };

  const gpData = gpRes.data;
  const ppData = ppRes.data;
  const sources = { google_places: gpRes.source, perplexity: ppRes.source };

  const anyData =
    Object.keys(gpData).length > 0 || Object.keys(ppData).length > 0;
  const bothFailed =
    gpRes.source.status !== "ok" && ppRes.source.status !== "ok";
  const status: EnrichmentResult["status"] = !anyData
    ? bothFailed
      ? "not_found"
      : "not_found"
    : gpRes.source.status === "ok" && ppRes.source.status === "ok"
      ? "found"
      : "partial";

  return { status, ...gpData, ...ppData, sources };
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

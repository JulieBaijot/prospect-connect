import { supabase } from "@/integrations/supabase/client";

export type HeadcountRange =
  | "1-9"
  | "10-19"
  | "20-49"
  | "50-99"
  | "100-199"
  | "200-249"
  | "250-499"
  | "500-999"
  | "1000+";
export type Category =
  | "A – Pilier"
  | "B – Socle prévention"
  | "B – Socle SST"
  | "C – Porte d'entrée"
  | "Récurrent"
  | "Exceptionnel";
export type OfferTarget = "SST" | "DUERP" | "SSCT / CSE" | "QVCT / RPS" | "Sur mesure";
export type DecisionLevel = "site" | "groupe" | "inconnu";
export type Segment = "Moins de 11" | "11 à 24" | "25 à 49" | "50 et plus";

export type ProspectStatus =
  | "À qualifier"
  | "En contact"
  | "En discussion"
  | "Parké"
  | "Converti"
  | "Perdu";
export type Canal = "email" | "téléphone" | "physique";
export type LogResult = "NRP" | "Pas dispo" | "Échange" | "RDV";
export type SearchSource = "pappers" | "insee" | "annuaire";

export interface Prospect {
  id: string;
  company_name: string;
  city: string | null;
  headcount_range: HeadcountRange | null;
  /** Colonne générée en base, lecture seule. */
  segment: Segment | null;

  offer_target: OfferTarget | null;
  estimated_value: number;
  status: ProspectStatus;
  decision_level: DecisionLevel;
  group_name: string | null;
  parking_trigger: string | null;
  parking_date: string | null;
  last_contacted_at: string | null;
  next_action_date: string | null;
  main_phone: string | null;
  main_email: string | null;
  website: string | null;
  address: string | null;
  reception_hours: string | null;
  comments: string | null;
  google_place_id: string | null;
  siren: string | null;
  naf_code: string | null;
  legal_status: string | null;
  source: string | null;
  sector: string | null;
  batch_keyword: string | null;
  external_source_id: string | null;
  import_source: string | null;
  import_batch_id: string | null;
  decision_maker: string | null;
  employees_count: string | null;
  social_links: { facebook?: string; instagram?: string; linkedin?: string } | null;
  icebreakers: Array<{ type?: string; title: string; source?: string; date?: string; url?: string }> | null;
  additional_info: string | null;
  average_rating: number | null;
  reviews_count: number | null;
  google_maps_url: string | null;
  enrichment_sources: {
    google_places?: { status: string; message?: string };
    perplexity?: { status: string; message?: string };
  } | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
  role_title: string | null;
  main_phone: string | null;
  direct_phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  maturity_level: string | null;
  offer_target: OfferTarget | null;
  estimated_value: number | null;
  category: Category | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectionLog {
  id: string;
  prospect_id: string;
  contact_id: string | null;
  action_date: string;
  action_type: string;
  canal: Canal;
  /** Situation consignée (voir `Situation`). */
  stage: string | null;
  objective: string | null;
  result: LogResult | null;
  notes: string | null;
  /** Relance que je me fixe à moi-même. */
  next_action_date: string | null;
  meeting_date: string | null;
  meeting_duration_minutes: number | null;
  video_link: string | null;
  /** Engagement pris auprès du prospect, en clair. */
  promise_text: string | null;
  /** Date promise au prospect — distincte de next_action_date. */
  promise_date: string | null;
  promise_kept: boolean | null;
  /** Modèle d'email utilisé (canal email). */
  template_used: string | null;
  created_at: string;
}


export interface ProspectWithRelations extends Prospect {
  contacts: Contact[];
  prospection_logs: ProspectionLog[];
}

export const headcountRanges: HeadcountRange[] = [
  "1-9",
  "10-19",
  "20-49",
  "50-99",
  "100-199",
  "200-249",
  "250-499",
  "500-999",
  "1000+",
];
export const categories: Category[] = [
  "A – Pilier",
  "B – Socle prévention",
  "C – Porte d'entrée",
  "Récurrent",
  "Exceptionnel",
];
export const offerTargets: OfferTarget[] = [
  "SST",
  "DUERP",
  "SSCT / CSE",
  "QVCT / RPS",
  "Sur mesure",
];
export const decisionLevels: DecisionLevel[] = ["site", "groupe", "inconnu"];

export const segmentRules: Record<
  Segment,
  { ranges: HeadcountRange[]; defaultOffer: OfferTarget; targetValue: number }
> = {
  "Moins de 11": { ranges: ["1-9"], defaultOffer: "DUERP", targetValue: 350 },
  "11 à 24": { ranges: ["10-19"], defaultOffer: "DUERP", targetValue: 900 },
  "25 à 49": { ranges: ["20-49"], defaultOffer: "DUERP", targetValue: 3600 },
  "50 et plus": {
    ranges: ["50-99", "100-199", "200-249", "250-499", "500-999", "1000+"],
    defaultOffer: "SSCT / CSE",
    targetValue: 5890,
  },
};

export function segmentOf(headcount: HeadcountRange | string | null | undefined): Segment | null {
  if (!headcount) return null;
  const found = (Object.keys(segmentRules) as Segment[]).find((seg) =>
    segmentRules[seg].ranges.includes(headcount as HeadcountRange),
  );
  return found || null;
}

/** Valeur cible dérivée du segment — jamais saisie par l'utilisateur. */
export function targetValueOf(headcount: HeadcountRange | string | null | undefined) {
  const segment = segmentOf(headcount);
  return segment ? segmentRules[segment].targetValue : 0;
}

export function defaultOfferOf(headcount: HeadcountRange | string | null | undefined) {
  const segment = segmentOf(headcount);
  return segment ? segmentRules[segment].defaultOffer : null;
}


export const statuses: ProspectStatus[] = [
  "À qualifier",
  "En contact",
  "En discussion",
  "Parké",
  "Converti",
  "Perdu",
];

/** Script d'ouverture unique — plus de cycle numéroté. */
export const callScript = {
  label: "Ouverture d'appel",
  objective:
    "Identifier le bon interlocuteur et ouvrir une discussion santé-sécurité au travail.",
  text: "Bonjour, je m'appelle Julie Baijot. J'accompagne les entreprises sur leurs sujets formation, prévention et santé-sécurité au travail : SST, DUERP, QVCT, CSE ou besoins sur mesure. Qui pilote ces sujets chez vous ?",
  checklist: [
    "Identifier RH / direction / HSE / CSE",
    "Valider l'effectif approximatif",
    "Repérer la porte d'entrée : formation, DUERP, QVCT, SSCT ou conseil",
  ],
};


export function categoryClass(category: Category | null | undefined) {
  if (category === "A – Pilier") return "bg-category-a text-category-a-foreground";
  if (category === "B – Socle prévention" || category === "B – Socle SST")
    return "bg-category-b text-category-b-foreground";
  if (category === "C – Porte d'entrée") return "bg-category-c text-category-c-foreground";
  if (category === "Récurrent") return "bg-category-recurring text-category-recurring-foreground";
  return "bg-category-exceptional text-category-exceptional-foreground";
}

export function suggestProspectCategory(input: {
  headcount_range?: HeadcountRange | string | null;
  offer_target?: OfferTarget | string | null;
  sector?: string | null;
  estimated_value?: number | string | null;
  comments?: string | null;
  contactKnown?: boolean;
  history?: Array<{
    notes?: string | null;
    action_type?: string | null;
    objective?: string | null;
  }>;
}): { category: Category; reasons: string[] } | null {
  const text = [
    input.sector,
    input.offer_target,
    input.comments,
    ...(input.history || []).flatMap((log) => [log.notes, log.action_type, log.objective]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const value = Number(input.estimated_value || 0);
  const headcountMin = input.headcount_range?.toString().startsWith("1000")
    ? 1000
    : Number(input.headcount_range?.toString().split("-")[0] || 0);
  const offer = (input.offer_target || "").toString().toLowerCase();
  const sector = (input.sector || "").toLowerCase();
  const hasWords = (words: string[]) => words.some((word) => text.includes(word));
  if (
    hasWords([
      "client existant",
      "déjà client",
      "contrat signé",
      "contrat signe",
      "signé",
      "signe",
      "accord obtenu",
      "commande",
    ])
  ) {
    return { category: "Récurrent", reasons: ["relation client ou contrat identifié"] };
  }
  const aReasons = [
    headcountMin >= 200 ? "effectif ≥ 200" : "",
    ["cse", "cssct", "ssct", "qvct", "rps", "émotions", "emotions"].some((item) =>
      offer.includes(item),
    )
      ? "offre stratégique"
      : "",
    [
      "médico",
      "medico",
      "collectivité",
      "collectivite",
      "hôpital",
      "hopital",
      "santé",
      "sante",
    ].some((item) => sector.includes(item))
      ? "secteur prioritaire"
      : "",
    value >= 4000 ? "valeur ≥ 4 000 €" : "",
    hasWords([
      "réseau commun",
      "reseau commun",
      "relation existante",
      "connaissance",
      "recommandé",
      "recommande",
      "mise en relation",
    ])
      ? "réseau ou relation existante"
      : "",
  ].filter(Boolean);
  if (aReasons.length >= 2) return { category: "A – Pilier", reasons: aReasons };
  if (
    headcountMin >= 20 &&
    headcountMin <= 199 &&
    ["industrie", "logistique", "agro", "btp"].some((item) => sector.includes(item)) &&
    ["sst fi", "sst mac", "formation sst", "duerp"].some((item) => offer.includes(item))
  ) {
    return {
      category: "B – Socle prévention",
      reasons: ["20–199 salariés", "secteur terrain", offer.includes("duerp") ? "offre DUERP" : "offre SST"],
    };
  }
  if (offer.includes("duerp")) {
    return { category: "C – Porte d'entrée", reasons: ["DUERP : porte d'entrée réglementaire"] };
  }
  if (
    headcountMin < 20 ||
    ["tertiaire", "services", "artisanal", "artisan"].some((item) => sector.includes(item)) ||
    offer === "excel" ||
    input.contactKnown === false
  ) {
    return { category: "C – Porte d'entrée", reasons: ["cible simple ou contact à qualifier"] };
  }
  return null;
}

/** Modèles d'email disponibles, tracés dans `template_used`. */
export const emailTemplates = [
  "Prise de contact — DUERP",
  "Prise de contact — SST",
  "Prise de contact — SSCT / CSE",
  "Prise de contact — QVCT / RPS",
  "Relance après appel",
  "Envoi de coordonnées",
  "Proposition de créneau RDV",
  "Devis / proposition",
];

/** Un email consigné ne peut pas proposer un rappel le jour même : minimum J+1. */
export function minCallbackDate(canal: Canal | string | null | undefined) {
  return canal === "email" ? addDaysIso(1).slice(0, 10) : todayIsoDate();
}

export function enforceCallbackRule(canal: Canal | string | null | undefined, date: string) {
  const min = minCallbackDate(canal);
  if (!date) return min;
  return date < min ? min : date;
}

/** Promesse faite au prospect et non tenue (date passée ou du jour, non cochée). */
export function isPromiseBroken(log: {
  promise_date?: string | null;
  promise_kept?: boolean | null;
}) {
  if (!log.promise_date || log.promise_kept === true) return false;
  return log.promise_date <= todayIsoDate();
}

export function brokenPromises<T extends { promise_date?: string | null; promise_kept?: boolean | null }>(
  logs: T[],
) {
  return logs
    .filter(isPromiseBroken)
    .sort((a, b) => (a.promise_date || "").localeCompare(b.promise_date || ""));
}


export function statusBandClass(status: ProspectStatus | null | undefined) {
  if (status === "En contact" || status === "En discussion") return "bg-status-hot";
  if (status === "À qualifier") return "bg-status-warm";
  if (status === "Converti") return "bg-status-won";
  return "bg-status-waiting";
}

export function contactName(contact?: Contact | null) {
  const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ").trim();
  return name || "Contact à qualifier";
}

export function formatEuro(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function shortDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDueTodayOrLate(value: string | null | undefined) {
  return Boolean(value && value <= todayIsoDate());
}

/** Un prospect est « en sommeil » tant que sa date de réveil n'est pas atteinte. */
export function isParked(
  prospect: { status: string | null; parking_date?: string | null },
  today = todayIsoDate(),
) {
  if (prospect.status !== "Parké") return false;
  if (!prospect.parking_date) return true;
  return prospect.parking_date > today;
}

/** Le parking est arrivé à échéance : le prospect doit réapparaître. */
export function isParkingDue(
  prospect: { status: string | null; parking_date?: string | null },
  today = todayIsoDate(),
) {
  return (
    prospect.status === "Parké" && Boolean(prospect.parking_date) && prospect.parking_date! <= today
  );
}

/** Parque un prospect : motif de reprise et date de réveil obligatoires. */
export async function parkProspect(id: string, motif: string, wakeDate: string) {
  if (!motif.trim()) throw new Error("Le motif de reprise est obligatoire.");
  if (!wakeDate) throw new Error("La date de réveil est obligatoire.");
  await updateProspect(id, {
    status: "Parké",
    parking_trigger: motif.trim(),
    parking_date: wakeDate,
    next_action_date: wakeDate,
  });
}



export function bestPhone(prospect: ProspectWithRelations) {
  const contactPhone = prospect.contacts.find((c) => c.direct_phone || c.main_phone);
  return contactPhone?.direct_phone || contactPhone?.main_phone || prospect.main_phone || "";
}

export function dataQualityIssues(prospect: ProspectWithRelations) {
  return [
    !bestPhone(prospect) ? "Téléphone manquant" : "",
    !prospect.contacts.length && !prospect.main_email ? "Contact manquant" : "",
    !prospect.next_action_date ? "Relance non planifiée" : "",
    !prospect.siren ? "SIRET manquant" : "",
    !prospect.prospection_logs.length ? "Aucun historique" : "",
  ].filter(Boolean);
}

/** Décale une date ISO d'un nombre de jours. */
export function shiftIso(value: string, days: number) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Situations possibles à l'issue d'un contact — remplace le cycle en sept étapes. */
export type Situation =
  | "nrp"
  | "barrage"
  | "email_envoye"
  | "pas_le_bon_moment"
  | "decision_groupe"
  | "interet"
  | "refus"
  | "rdv";

export interface SituationOption {
  key: Situation;
  label: string;
  result: LogResult;
  actionType: string;
}

export const situationOptions: SituationOption[] = [
  { key: "nrp", label: "NRP / personne au bout du fil", result: "NRP", actionType: "NRP" },
  { key: "barrage", label: "Barrage accueil", result: "Pas dispo", actionType: "Barrage accueil" },
  { key: "email_envoye", label: "Email envoyé", result: "Pas dispo", actionType: "Email envoyé" },
  {
    key: "pas_le_bon_moment",
    label: "Échange — pas le bon moment",
    result: "Échange",
    actionType: "Pas le bon moment",
  },
  {
    key: "decision_groupe",
    label: "Échange — décision au niveau groupe",
    result: "Échange",
    actionType: "Décision groupe",
  },
  {
    key: "interet",
    label: "Échange — intérêt exprimé",
    result: "Échange",
    actionType: "Intérêt exprimé",
  },
  { key: "refus", label: "Refus net", result: "Échange", actionType: "Refus net" },
  { key: "rdv", label: "RDV obtenu", result: "RDV", actionType: "RDV obtenu" },
];

export interface EtapeContexte {
  situation: Situation;
  /** Date donnée par le prospect, date de promesse ou date du RDV selon la situation. */
  dateSaisie?: string | null;
  motif?: string | null;
  promesse?: string | null;
}

export interface Etape {
  situation: Situation;
  /** Action proposée — toujours renseignée. */
  action: string;
  /** Canal proposé — null quand l'action ne passe par aucun canal (parquer, préparer). */
  canal: Canal | null;
  /** Date proposée (YYYY-MM-DD) — toujours renseignée. */
  date: string;
  /** Raison, toujours affichée à l'écran. */
  raison: string;
  status?: ProspectStatus;
  decision_level?: DecisionLevel;
  /** « Parquer » exige toujours un motif écrit. */
  motifRequis: boolean;
  /** Date à saisir obligatoirement (donnée par le prospect / RDV). */
  dateRequise: boolean;
  /** Promesse datée obligatoire. */
  promesseRequise: boolean;
}

type EtapeProspect = {
  decision_maker?: string | null;
  contacts?: Array<{ first_name: string | null; last_name: string | null }>;
  prospection_logs?: Array<{ result: string | null; action_date: string }>;
};

/** Nombre de NRP consécutifs, en comptant celui qu'on consigne. */
export function nrpStreak(prospect: EtapeProspect) {
  const logs = [...(prospect.prospection_logs || [])].sort(
    (a, b) => +new Date(b.action_date) - +new Date(a.action_date),
  );
  let streak = 0;
  for (const log of logs) {
    if (log.result === "NRP") streak += 1;
    else break;
  }
  return streak;
}

function contactConnu(prospect: EtapeProspect) {
  if (prospect.decision_maker?.trim()) return true;
  return Boolean(prospect.contacts?.some((c) => (c.first_name || c.last_name || "").trim()));
}

/**
 * Table de décision unique : renvoie toujours une action, un canal et une date.
 * La proposition s'applique automatiquement mais reste modifiable avant validation.
 */
export function prochaineEtape(prospect: EtapeProspect, dernierLog: EtapeContexte): Etape {
  const base = {
    situation: dernierLog.situation,
    motifRequis: false,
    dateRequise: false,
    promesseRequise: false,
  };
  const saisie = dernierLog.dateSaisie?.slice(0, 10) || "";

  switch (dernierLog.situation) {
    case "nrp": {
      const count = nrpStreak(prospect) + 1;
      if (count <= 1)
        return {
          ...base,
          action: "Rappeler sur un autre créneau de la journée",
          canal: "téléphone",
          date: addDaysIso(3),
          raison: "1er NRP — on retente sur un autre créneau",
        };
      if (count === 2)
        return {
          ...base,
          action: "Basculer sur l'écrit",
          canal: "email",
          date: addDaysIso(1),
          raison: "2e NRP, on passe à l'écrit",
        };
      return {
        ...base,
        action: "Parquer",
        canal: null,
        date: addDaysIso(90),
        raison: `${count}e NRP — on parque 3 mois`,
        status: "Parké",
        motifRequis: true,
      };
    }
    case "barrage":
      return contactConnu(prospect)
        ? {
            ...base,
            action: "Écrire directement au contact",
            canal: "email",
            date: addDaysIso(1),
            raison: "Barrage accueil, contact nommé connu — on écrit en direct",
          }
        : {
            ...base,
            action: "Rappeler pour obtenir le nom et l'adresse",
            canal: "téléphone",
            date: addDaysIso(7),
            raison: "Barrage accueil sans contact identifié — objectif : nom + email",
          };
    case "email_envoye":
      return {
        ...base,
        action: "Rappeler",
        canal: "téléphone",
        date: enforceCallbackRule("email", addDaysIso(2)),
        raison: "Email envoyé — rappel à J+2 minimum, jamais le jour même",
      };
    case "pas_le_bon_moment":
      return {
        ...base,
        action: "Parquer à la date donnée par le prospect",
        canal: null,
        date: saisie || addDaysIso(30),
        raison: "Pas le bon moment — on parque à la date annoncée",
        status: "Parké",
        motifRequis: true,
        dateRequise: true,
      };
    case "decision_groupe":
      return {
        ...base,
        action: "Basculer le prospect en décision groupe",
        canal: null,
        date: addDaysIso(180),
        raison: "Décision au niveau groupe — suivi à 6 mois",
        decision_level: "groupe",
      };
    case "interet":
      return {
        ...base,
        action: "Tenir la promesse faite au prospect",
        canal: null,
        date: saisie || addDaysIso(2),
        raison: "Intérêt exprimé — la date de la promesse fait foi",
        status: "En discussion",
        promesseRequise: true,
        dateRequise: true,
      };
    case "refus":
      return {
        ...base,
        action: "Parquer sur déclencheur",
        canal: null,
        date: saisie || addDaysIso(180),
        raison: "Refus net — réveil uniquement sur déclencheur",
        status: "Parké",
        motifRequis: true,
      };
    case "rdv":
    default:
      return {
        ...base,
        situation: "rdv",
        action: "Préparer le rendez-vous",
        canal: null,
        date: saisie ? shiftIso(saisie, -1) : addDaysIso(1),
        raison: "RDV obtenu — préparation la veille du rendez-vous",
        status: "En discussion",
        dateRequise: true,
      };
  }
}

/** « Prochaine étape : rappeler le 12/08 — 2e NRP, on passe à l'écrit ». */
export function formatEtape(etape: Etape) {
  const action = etape.action.charAt(0).toLowerCase() + etape.action.slice(1);
  return `Prochaine étape : ${action} le ${formatDate(etape.date)} — ${etape.raison}`;
}


export function sessionReason(prospect: ProspectWithRelations) {
  if (isDueTodayOrLate(prospect.next_action_date)) return "Relance prévue aujourd'hui ou en retard";
  if (!bestPhone(prospect)) return "À enrichir avant appel";
  if (!prospect.contacts.length) return "Contact à identifier";
  if (prospect.status === "En contact" || prospect.status === "En discussion")
    return "Échange en cours à suivre";
  if (prospect.import_source) return "Prospect importé à qualifier";
  return "Priorité selon statut et fraîcheur";
}

export async function loadProspects(): Promise<ProspectWithRelations[]> {
  const { data, error } = await supabase
    .from("prospects")
    .select("*, contacts(*), prospection_logs(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as ProspectWithRelations[]).map((prospect) => ({
    ...prospect,
    contacts: prospect.contacts || [],
    prospection_logs: (prospect.prospection_logs || []).sort(
      (a, b) => +new Date(b.action_date) - +new Date(a.action_date),
    ),
  }));
}

export async function loadLogs(): Promise<
  Array<ProspectionLog & { prospects: Prospect | null; contacts: Contact | null }>
> {
  const { data, error } = await supabase
    .from("prospection_logs")
    .select("*, prospects(*), contacts(*)")
    .order("action_date", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Array<
    ProspectionLog & { prospects: Prospect | null; contacts: Contact | null }
  >;
}

/** `segment` est calculée en base : jamais envoyée en écriture.
 *  `estimated_value` est dérivée du segment sauf valeur explicite (cas particulier). */
function prepareProspectWrite<T extends Partial<Prospect>>(input: T) {
  const { segment: _segment, ...rest } = input as T & { segment?: unknown };
  const payload = rest as Partial<Prospect>;
  if (
    "headcount_range" in payload &&
    "estimated_value" in payload &&
    Number(payload.estimated_value ?? 0) === 0
  ) {
    payload.estimated_value = targetValueOf(payload.headcount_range);
  }
  return payload;
}

export async function saveProspect(
  input: Partial<Prospect> & { company_name: string },
  contact?: Partial<Contact>,
) {
  const { data: prospect, error } = await supabase
    .from("prospects")
    .upsert(prepareProspectWrite(input) as never)
    .select()
    .single();
  if (error) throw error;
  if (
    contact &&
    (contact.first_name ||
      contact.last_name ||
      contact.email ||
      contact.direct_phone ||
      contact.role_title)
  ) {
    const payload = { ...contact, prospect_id: prospect.id };
    const { error: contactError } = await supabase
      .from("contacts")
      .upsert(payload)
      .select()
      .single();
    if (contactError) throw contactError;
  }
  return prospect as unknown as Prospect;
}

export async function addLog(
  payload: Partial<ProspectionLog> & { prospect_id: string; action_type: string },
) {
  const { data, error } = await supabase.from("prospection_logs").insert(payload).select().single();
  if (error) throw error;
  return data as unknown as ProspectionLog;
}

export async function setPromiseKept(logId: string, kept: boolean | null) {
  const { error } = await supabase
    .from("prospection_logs")
    .update({ promise_kept: kept } as never)
    .eq("id", logId);
  if (error) throw error;
}


export async function updateProspect(id: string, payload: Partial<Prospect>) {
  const { error } = await supabase
    .from("prospects")
    .update(prepareProspectWrite(payload) as never)
    .eq("id", id);
  if (error) throw error;
}


export async function deleteProspect(id: string) {
  const { error: logsError } = await supabase
    .from("prospection_logs")
    .delete()
    .eq("prospect_id", id);
  if (logsError) throw logsError;
  const { error: contactsError } = await supabase.from("contacts").delete().eq("prospect_id", id);
  if (contactsError) throw contactsError;
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw error;
}

export function prioritizeSession(prospects: ProspectWithRelations[]) {
  const statusRank: Record<string, number> = {
    "En discussion": 0,
    "En contact": 1,
    "À qualifier": 2,
    Parké: 3,
    Converti: 4,
    Perdu: 5,
  };
  return [...prospects]
    .filter((prospect) => !["Perdu", "Converti"].includes(prospect.status))
    .sort((a, b) => {
      const byDue =
        Number(!isDueTodayOrLate(a.next_action_date)) -
        Number(!isDueTodayOrLate(b.next_action_date));
      if (byDue !== 0) return byDue;
      const byCallable = Number(!bestPhone(a)) - Number(!bestPhone(b));
      if (byCallable !== 0) return byCallable;
      const byDate =
        +new Date(a.next_action_date || "2099-12-31") -
        +new Date(b.next_action_date || "2099-12-31");
      if (byDate !== 0) return byDate;
      const byStatus = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return dataQualityIssues(a).length - dataQualityIssues(b).length;
    })
    .slice(0, 20);
}

export function prioritizeCallSession(prospects: ProspectWithRelations[], limit = 20) {
  return prioritizeSession(prospects.filter((prospect) => bestPhone(prospect))).slice(0, limit);
}

export function prioritizeQualificationSession(prospects: ProspectWithRelations[], limit = 20) {
  return [...prospects]
    .filter(
      (prospect) =>
        !["Perdu", "Converti"].includes(prospect.status) && dataQualityIssues(prospect).length > 0,
    )
    .sort((a, b) => {
      const byDue =
        Number(!isDueTodayOrLate(a.next_action_date)) -
        Number(!isDueTodayOrLate(b.next_action_date));
      if (byDue !== 0) return byDue;
      return dataQualityIssues(b).length - dataQualityIssues(a).length;
    })
    .slice(0, limit);
}

export function buildCalendarUrl(args: {
  prospect: Prospect;
  contact?: Contact;
  date: string;
  duration: number;
  videoLink?: string;
}) {
  const start = new Date(args.date);
  const end = new Date(start.getTime() + args.duration * 60_000);
  const toGoogleDate = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const title = `RDV ${args.prospect.company_name} – ${args.prospect.offer_target || "Santé-sécurité"}`;
  const details = [
    `Contact : ${contactName(args.contact)}`,
    `Téléphone : ${args.contact?.direct_phone || args.contact?.main_phone || args.prospect.main_phone || "à compléter"}`,
    `Offre : ${args.prospect.offer_target || "à préciser"}`,
    args.videoLink ? `Visio : ${args.videoLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details,
    location: args.videoLink || args.prospect.address || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function exportCsv(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
) {
  const headers = Object.keys(rows[0] || { vide: "" });
  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

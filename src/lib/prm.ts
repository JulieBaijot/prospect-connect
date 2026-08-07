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

export type CycleStage = "J1" | "J2" | "J4" | "J6" | "J10" | "J15" | "J21";
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

export interface PlaybookOutcome {
  key: string;
  label: string;
  result: LogResult;
  actionType: string;
  nextStage: CycleStage;
  delayDays: number;
  status?: ProspectStatus;
  note: string;
  mode?: "callback" | "exchange" | "meeting";
}

export interface PlaybookNode {
  key: CycleStage;
  label: string;
  objective: string;
  script: string;
  checklist: string[];
  outcomes: PlaybookOutcome[];
}

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
  stage: CycleStage | null;
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

export const stages: CycleStage[] = ["J1", "J2", "J4", "J6", "J10", "J15", "J21"];
export const statuses: ProspectStatus[] = [
  "À qualifier",
  "En contact",
  "En discussion",
  "Parké",
  "Converti",
  "Perdu",
];

export const playbookNodes: Record<CycleStage, PlaybookNode> = {
  J1: {
    key: "J1",
    label: "J1 – Premier contact",
    objective:
      "Identifier le bon interlocuteur et ouvrir une discussion santé-sécurité au travail.",
    script:
      "Bonjour, je m'appelle Julie Baijot. J'accompagne les entreprises sur leurs sujets formation, prévention et santé-sécurité au travail : SST, DUERP, QVCT, CSE ou besoins sur mesure. Qui pilote ces sujets chez vous ?",
    checklist: [
      "Identifier RH / direction / HSE / CSE",
      "Valider l'effectif approximatif",
      "Repérer la porte d'entrée : formation, DUERP, QVCT, SSCT ou conseil",
    ],
    outcomes: [
      {
        key: "nrp",
        label: "NRP / standard muet",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J2",
        delayDays: 1,
        status: "À qualifier",
        note: "Pas de réponse. Relance douce au prochain créneau.",
      },
      {
        key: "barrage",
        label: "Barrage accueil",
        result: "Pas dispo",
        actionType: "Barrage accueil",
        nextStage: "J2",
        delayDays: 2,
        status: "À qualifier",
        note: "Accueil filtrant. Revenir avec une accroche courte sur formation, DUERP ou obligations prévention.",
        mode: "callback",
      },
      {
        key: "interet",
        label: "Sujet prévention ouvert",
        result: "Échange",
        actionType: "Échange qualifiant",
        nextStage: "J4",
        delayDays: 2,
        status: "En contact",
        note: "Ouverture identifiée. Prochaine étape : qualifier le besoin exact, le décideur et l'échéance.",
        mode: "exchange",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV diagnostic obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "En contact",
        note: "Rendez-vous obtenu pour cadrer les besoins formation, conseil ou accompagnement.",
        mode: "meeting",
      },
    ],
  },
  J2: {
    key: "J2",
    label: "J2 – Relance douce",
    objective: "Rebondir sans pression et comprendre qui pilote les sujets prévention.",
    script:
      "Je me permets de vous recontacter suite à mon précédent message. Est-ce que les sujets formation sécurité, DUERP, QVCT ou CSE sont gérés en interne, par la direction/RH, ou avec un intervenant externe ?",
    checklist: [
      "Identifier le décideur",
      "Repérer prestataire ou organisation actuelle",
      "Noter fenêtre budgétaire ou réglementaire",
    ],
    outcomes: [
      {
        key: "nrp",
        label: "Toujours NRP",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J4",
        delayDays: 2,
        status: "À qualifier",
        note: "Deuxième tentative sans réponse. Relance avec angle de qualification prévention.",
      },
      {
        key: "pas-moment",
        label: "Pas le bon moment",
        result: "Pas dispo",
        actionType: "Pas le bon moment",
        nextStage: "J6",
        delayDays: 4,
        status: "Parké",
        note: "Moment peu favorable. Programmer un rappel contextualisé sur la prochaine échéance utile.",
        mode: "callback",
      },
      {
        key: "qualification",
        label: "Qualification prévention",
        result: "Échange",
        actionType: "Qualification prévention",
        nextStage: "J4",
        delayDays: 2,
        status: "En contact",
        note: "Informations obtenues. Approfondir le sujet prioritaire : SST, DUERP, QVCT, SSCT, audit ou sur mesure.",
        mode: "exchange",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV diagnostic obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "En contact",
        note: "Rendez-vous planifié pour diagnostiquer le besoin global santé-sécurité.",
        mode: "meeting",
      },
    ],
  },
  J4: {
    key: "J4",
    label: "J4 – Qualification besoin",
    objective: "Identifier la porte d'entrée commerciale et le niveau d'urgence.",
    script:
      "Pour voir comment je peux vous être utile : votre priorité actuelle concerne plutôt la formation SST, le DUERP, la QVCT/RPS, le CSE-SSCT, ou un besoin spécifique de conseil ou formation sur mesure ?",
    checklist: [
      "Sujet prioritaire",
      "Échéance réglementaire ou opérationnelle",
      "Décideur et budget",
      "Contraintes site / équipes",
    ],
    outcomes: [
      {
        key: "besoin-urgent",
        label: "Besoin prioritaire",
        result: "Échange",
        actionType: "Besoin prioritaire identifié",
        nextStage: "J10",
        delayDays: 1,
        status: "En contact",
        note: "Besoin concret identifié : DUERP à mettre à jour, formation à planifier, sujet QVCT/RPS, demande CSE ou accompagnement sur mesure.",
        mode: "exchange",
      },
      {
        key: "besoin-futur",
        label: "Besoin futur",
        result: "Échange",
        actionType: "Besoin futur identifié",
        nextStage: "J6",
        delayDays: 7,
        status: "À qualifier",
        note: "Fenêtre future. Relance avec un contenu utile lié au sujet détecté et une proposition de cadrage.",
        mode: "exchange",
      },
      {
        key: "deja-couvert",
        label: "Déjà couvert",
        result: "Pas dispo",
        actionType: "Déjà couvert",
        nextStage: "J21",
        delayDays: 30,
        status: "Parké",
        note: "Organisation ou intervenant déjà en place. Revenir sur une fenêtre trimestrielle avec un angle complémentaire.",
        mode: "callback",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV diagnostic obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "En contact",
        note: "Rendez-vous obtenu suite à qualification du besoin prévention.",
        mode: "meeting",
      },
    ],
  },
  J6: {
    key: "J6",
    label: "J6 – Apport de valeur",
    objective:
      "Rendre le sujet concret avec un angle utile : obligation, échéance ou irritant terrain.",
    script:
      "Je peux vous envoyer un mémo très court selon votre sujet : DUERP, renouvellement SST, rôle du CSE en SSCT, QVCT/RPS ou plan d'actions prévention. Quel angle serait le plus utile pour vous ?",
    checklist: [
      "Choisir l'angle utile",
      "Envoyer mémo ou ressource",
      "Proposer deux créneaux de cadrage",
    ],
    outcomes: [
      {
        key: "contenu-envoye",
        label: "Contenu envoyé",
        result: "Échange",
        actionType: "Contenu prévention envoyé",
        nextStage: "J10",
        delayDays: 4,
        status: "À qualifier",
        note: "Contenu envoyé. Relancer avec une demande de rendez-vous court pour cadrer l'action possible.",
        mode: "exchange",
      },
      {
        key: "nrp",
        label: "NRP après contenu",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J10",
        delayDays: 4,
        status: "À qualifier",
        note: "Pas de réponse après contenu. Relance demande RDV avec angle prévention global.",
      },
      {
        key: "hors-cible",
        label: "Hors cible",
        result: "Pas dispo",
        actionType: "Hors cible",
        nextStage: "J21",
        delayDays: 30,
        status: "Perdu",
        note: "Besoin non pertinent à court terme ou structure hors cible.",
        mode: "callback",
      },
    ],
  },
  J10: {
    key: "J10",
    label: "J10 – Demande RDV",
    objective: "Obtenir un créneau court pour diagnostiquer besoin, contexte et suite possible.",
    script:
      "Est-ce qu'on bloque 20 à 30 minutes pour faire le point sur vos besoins santé-sécurité au travail et voir si une formation, un accompagnement ou un conseil sur mesure serait pertinent ?",
    checklist: [
      "Proposer deux créneaux",
      "Confirmer les personnes à inviter",
      "Préparer questions diagnostic",
    ],
    outcomes: [
      {
        key: "rdv",
        label: "RDV accepté",
        result: "RDV",
        actionType: "RDV diagnostic obtenu",
        nextStage: "J15",
        delayDays: 0,
        status: "En contact",
        note: "Rendez-vous accepté. Préparer diagnostic, hypothèses d'offre et questions de cadrage.",
        mode: "meeting",
      },
      {
        key: "hesitation",
        label: "Hésitation / à confirmer",
        result: "Échange",
        actionType: "RDV à confirmer",
        nextStage: "J15",
        delayDays: 5,
        status: "En contact",
        note: "Intérêt présent mais créneau non confirmé. Relancer avec une proposition précise et l'angle de valeur détecté.",
        mode: "exchange",
      },
      {
        key: "refus",
        label: "Refus poli",
        result: "Pas dispo",
        actionType: "Refus poli",
        nextStage: "J21",
        delayDays: 30,
        status: "Parké",
        note: "Refus sans fermeture définitive. Revenir plus tard avec un angle opportunité ou échéance réglementaire.",
        mode: "callback",
      },
    ],
  },
  J15: {
    key: "J15",
    label: "J15 – Proposition",
    objective: "Transformer l'échange en devis, plan d'action ou prochaine décision datée.",
    script:
      "Pour avancer concrètement, je peux vous envoyer une proposition cadrée : formation, accompagnement DUERP/QVCT/SSCT, diagnostic ou format sur mesure. Quels éléments doivent absolument apparaître pour que ce soit utile ?",
    checklist: [
      "Valider périmètre",
      "Valider livrables",
      "Identifier validation interne",
      "Envoyer proposition",
    ],
    outcomes: [
      {
        key: "devis",
        label: "Proposition à envoyer",
        result: "Échange",
        actionType: "Proposition à envoyer",
        nextStage: "J21",
        delayDays: 6,
        status: "En contact",
        note: "Proposition attendue. Relance décision à programmer avec prochaines étapes claires.",
        mode: "exchange",
      },
      {
        key: "gagne",
        label: "Accord obtenu",
        result: "RDV",
        actionType: "Accord obtenu",
        nextStage: "J21",
        delayDays: 0,
        status: "Converti",
        note: "Opportunité convertie. Passer en suivi client et planifier la mise en œuvre.",
        mode: "meeting",
      },
      {
        key: "silence",
        label: "Silence décision",
        result: "NRP",
        actionType: "Silence après proposition",
        nextStage: "J21",
        delayDays: 6,
        status: "Parké",
        note: "Décision en attente. Dernier contact avant relance longue ou archivage.",
      },
    ],
  },
  J21: {
    key: "J21",
    label: "J21 – Reprise / archivage",
    objective: "Clore proprement ou obtenir une fenêtre de reprise sur les sujets prévention.",
    script:
      "Je tente un dernier message avant de vous laisser tranquille : soit ce n'est pas le bon moment, soit le sujet n'est plus prioritaire. Souhaitez-vous que je vous recontacte plus tard sur vos sujets formation, DUERP, QVCT, CSE ou prévention ?",
    checklist: ["Rester léger", "Demander fenêtre de reprise", "Archiver proprement"],
    outcomes: [
      {
        key: "reprise",
        label: "Reprise plus tard",
        result: "Pas dispo",
        actionType: "Reprise ultérieure",
        nextStage: "J1",
        delayDays: 90,
        status: "Parké",
        note: "Relance trimestrielle programmée sur une fenêtre réglementaire, budgétaire ou formation.",
        mode: "callback",
      },
      {
        key: "relance-chaude",
        label: "Réponse tardive positive",
        result: "Échange",
        actionType: "Réponse tardive positive",
        nextStage: "J10",
        delayDays: 1,
        status: "En contact",
        note: "Réactivation positive. Repartir sur un diagnostic court.",
        mode: "exchange",
      },
      {
        key: "archiver",
        label: "Archiver",
        result: "Pas dispo",
        actionType: "Archivage commercial",
        nextStage: "J21",
        delayDays: 90,
        status: "Parké",
        note: "Aucune ouverture. Archivage avec relance longue si la cible reste pertinente.",
      },
    ],
  },
};
export const stageScripts: Record<CycleStage, { label: string; text: string; objective: string }> =
  Object.fromEntries(
    stages.map((stage) => [
      stage,
      {
        label: playbookNodes[stage].label,
        objective: playbookNodes[stage].objective,
        text: playbookNodes[stage].script,
      },
    ]),
  ) as Record<CycleStage, { label: string; text: string; objective: string }>;

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

export function nextStage(stage: CycleStage): CycleStage {
  const index = stages.indexOf(stage);
  return stages[Math.min(index + 1, stages.length - 1)] || "J2";
}

export function nextDateForStage(stage: CycleStage) {
  const delays: Record<CycleStage, number> = {
    J1: 1,
    J2: 2,
    J4: 2,
    J6: 4,
    J10: 5,
    J15: 6,
    J21: 30,
  };
  return addDaysIso(delays[stage] || 2);
}

export function currentStageOf(prospect: {
  prospection_logs?: Array<{ stage: CycleStage | null; action_date: string }>;
}): CycleStage {
  const logs = [...(prospect.prospection_logs || [])].sort(
    (a, b) => +new Date(b.action_date) - +new Date(a.action_date),
  );
  const last = logs.find((log) => log.stage);
  return last?.stage || "J1";
}

export function nodeForStage(stage: CycleStage | null | undefined) {
  return playbookNodes[stage || "J1"] || playbookNodes.J1;
}

export function dateForOutcome(outcome: PlaybookOutcome) {
  return addDaysIso(outcome.delayDays);
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

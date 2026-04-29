import { supabase } from "@/integrations/supabase/client";

export type HeadcountRange =
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
  | "B – Socle SST"
  | "C – Porte d'entrée"
  | "Récurrent"
  | "Exceptionnel";
export type OfferTarget = "SST FI" | "SST MAC" | "CSE-CSSCT" | "QVCT" | "Émotions" | "Excel";
export type CycleStage = "J1" | "J2" | "J4" | "J6" | "J10" | "J15" | "J21";
export type ProspectStatus = "Chaud" | "Tiède" | "En attente" | "Perdu" | "Converti";
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
  category: Category;
  offer_target: OfferTarget | null;
  estimated_value: number;
  current_stage: CycleStage;
  status: ProspectStatus;
  next_action_date: string | null;
  main_phone: string | null;
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
  next_action_date: string | null;
  meeting_date: string | null;
  meeting_duration_minutes: number | null;
  video_link: string | null;
  created_at: string;
}

export interface ProspectWithRelations extends Prospect {
  contacts: Contact[];
  prospection_logs: ProspectionLog[];
}

export const headcountRanges: HeadcountRange[] = [
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
  "B – Socle SST",
  "C – Porte d'entrée",
  "Récurrent",
  "Exceptionnel",
];
export const offerTargets: OfferTarget[] = [
  "SST FI",
  "SST MAC",
  "CSE-CSSCT",
  "QVCT",
  "Émotions",
  "Excel",
];
export const stages: CycleStage[] = ["J1", "J2", "J4", "J6", "J10", "J15", "J21"];
export const statuses: ProspectStatus[] = ["Chaud", "Tiède", "En attente", "Perdu", "Converti"];

export const playbookNodes: Record<CycleStage, PlaybookNode> = {
  J1: {
    key: "J1",
    label: "J1 – Premier contact",
    objective: "Identifier le bon interlocuteur et ouvrir la discussion SST.",
    script:
      "Bonjour, je m'appelle Julie Baijot, formatrice SST basée à Annonay. Je voulais vérifier qui pilote les formations sécurité chez vous et voir si le sujet SST est d'actualité cette année.",
    checklist: ["Confirmer le bon contact", "Valider l'effectif approximatif", "Repérer SST initiale ou MAC"],
    outcomes: [
      {
        key: "nrp",
        label: "NRP / standard muet",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J2",
        delayDays: 1,
        status: "Tiède",
        note: "Pas de réponse. Relance douce au prochain créneau.",
      },
      {
        key: "barrage",
        label: "Barrage accueil",
        result: "Pas dispo",
        actionType: "Barrage accueil",
        nextStage: "J2",
        delayDays: 2,
        status: "Tiède",
        note: "Accueil filtrant. Revenir avec une accroche réglementaire courte.",
        mode: "callback",
      },
      {
        key: "interet",
        label: "Intérêt / sujet ouvert",
        result: "Échange",
        actionType: "Échange qualifiant",
        nextStage: "J4",
        delayDays: 2,
        status: "Chaud",
        note: "Sujet SST identifié. Prochaine étape : qualifier besoin, volume et calendrier.",
        mode: "exchange",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "Chaud",
        note: "Rendez-vous obtenu pour cadrer le besoin.",
        mode: "meeting",
      },
    ],
  },
  J2: {
    key: "J2",
    label: "J2 – Relance douce",
    objective: "Rebondir sans pression et obtenir une première réponse utile.",
    script:
      "Je me permets de vous recontacter suite à mon précédent message. Je travaille avec des entreprises de la région sur la formation SST ; est-ce un sujet que vous gérez en interne ou avec un organisme externe ?",
    checklist: ["Demander qui décide", "Identifier prestataire actuel", "Noter période de renouvellement"],
    outcomes: [
      {
        key: "nrp",
        label: "Toujours NRP",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J4",
        delayDays: 2,
        status: "Tiède",
        note: "Deuxième tentative sans réponse. Relance avec angle de qualification.",
      },
      {
        key: "pas-moment",
        label: "Pas le bon moment",
        result: "Pas dispo",
        actionType: "Pas le bon moment",
        nextStage: "J6",
        delayDays: 4,
        status: "En attente",
        note: "Moment peu favorable. Programmer un rappel contextualisé.",
        mode: "callback",
      },
      {
        key: "qualification",
        label: "Qualification SST",
        result: "Échange",
        actionType: "Qualification SST",
        nextStage: "J4",
        delayDays: 2,
        status: "Chaud",
        note: "Informations obtenues. Approfondir besoin, échéance et décideur.",
        mode: "exchange",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "Chaud",
        note: "Rendez-vous planifié après relance.",
        mode: "meeting",
      },
    ],
  },
  J4: {
    key: "J4",
    label: "J4 – Qualification sujet",
    objective: "Transformer l'intérêt en besoin concret ou en prochaine fenêtre claire.",
    script:
      "Pour savoir si je peux vous être utile : combien de personnes sont concernées, avez-vous des recyclages SST à prévoir, et à quelle période prenez-vous ces décisions ?",
    checklist: ["Volume apprenants", "Échéance MAC ou FI", "Budget / décision", "Contraintes site"],
    outcomes: [
      {
        key: "besoin-urgent",
        label: "Besoin urgent",
        result: "Échange",
        actionType: "Besoin urgent identifié",
        nextStage: "J10",
        delayDays: 1,
        status: "Chaud",
        note: "Besoin prioritaire. Proposer RDV ou cadrage rapide.",
        mode: "exchange",
      },
      {
        key: "besoin-futur",
        label: "Besoin futur",
        result: "Échange",
        actionType: "Besoin futur identifié",
        nextStage: "J6",
        delayDays: 7,
        status: "Tiède",
        note: "Fenêtre future. Relance avec contenu réglementaire et proposition de planning.",
        mode: "exchange",
      },
      {
        key: "deja-couvert",
        label: "Déjà couvert",
        result: "Pas dispo",
        actionType: "Déjà couvert",
        nextStage: "J21",
        delayDays: 30,
        status: "En attente",
        note: "Prestataire déjà en place. Revenir sur une fenêtre trimestrielle.",
        mode: "callback",
      },
      {
        key: "rdv",
        label: "RDV diagnostic",
        result: "RDV",
        actionType: "RDV obtenu",
        nextStage: "J10",
        delayDays: 0,
        status: "Chaud",
        note: "Rendez-vous obtenu suite à qualification.",
        mode: "meeting",
      },
    ],
  },
  J6: {
    key: "J6",
    label: "J6 – Rappel réglementaire",
    objective: "Rendre le sujet concret avec un rappel d'obligation et une question simple.",
    script:
      "Je vous renvoie un mémo très court sur les obligations SST. La vraie question est surtout : où en êtes-vous sur vos recyclages et vos nouveaux entrants ?",
    checklist: ["Envoyer mémo", "Poser une question fermée", "Proposer deux créneaux"],
    outcomes: [
      {
        key: "memo-envoye",
        label: "Mémo envoyé",
        result: "Échange",
        actionType: "Mémo réglementaire envoyé",
        nextStage: "J10",
        delayDays: 4,
        status: "Tiède",
        note: "Contenu envoyé. Relancer sur une demande de rendez-vous.",
        mode: "exchange",
      },
      {
        key: "nrp",
        label: "NRP après mémo",
        result: "NRP",
        actionType: "NRP",
        nextStage: "J10",
        delayDays: 4,
        status: "Tiède",
        note: "Pas de réponse après contenu. Relance demande RDV.",
      },
      {
        key: "hors-cible",
        label: "Hors cible",
        result: "Pas dispo",
        actionType: "Hors cible",
        nextStage: "J21",
        delayDays: 30,
        status: "Perdu",
        note: "Besoin non pertinent à court terme.",
        mode: "callback",
      },
    ],
  },
  J10: {
    key: "J10",
    label: "J10 – Demande RDV",
    objective: "Obtenir un créneau court pour cadrer besoin, dates et devis.",
    script:
      "Je passe sur votre secteur prochainement. Est-ce qu'on bloque 20 à 30 minutes pour faire le point sur vos besoins SST et voir si je peux vous proposer quelque chose d'utile ?",
    checklist: ["Proposer deux créneaux", "Confirmer décideur", "Préparer éléments devis"],
    outcomes: [
      {
        key: "rdv",
        label: "RDV accepté",
        result: "RDV",
        actionType: "RDV obtenu",
        nextStage: "J15",
        delayDays: 0,
        status: "Chaud",
        note: "Rendez-vous accepté. Préparer diagnostic et offre.",
        mode: "meeting",
      },
      {
        key: "hesitation",
        label: "Hésitation / à confirmer",
        result: "Échange",
        actionType: "RDV à confirmer",
        nextStage: "J15",
        delayDays: 5,
        status: "Chaud",
        note: "Intérêt présent mais créneau non confirmé. Relancer avec proposition précise.",
        mode: "exchange",
      },
      {
        key: "refus",
        label: "Refus poli",
        result: "Pas dispo",
        actionType: "Refus poli",
        nextStage: "J21",
        delayDays: 30,
        status: "En attente",
        note: "Refus sans fermeture définitive. Revenir plus tard avec angle opportunité.",
        mode: "callback",
      },
    ],
  },
  J15: {
    key: "J15",
    label: "J15 – Transformation devis",
    objective: "Convertir l'échange en devis ou en décision datée.",
    script:
      "Pour avancer concrètement, je peux vous envoyer une proposition cadrée avec volume, dates possibles et tarif. Quels éléments doivent absolument apparaître pour que ce soit utile ?",
    checklist: ["Valider volume", "Valider dates", "Identifier validation interne", "Envoyer devis"],
    outcomes: [
      {
        key: "devis",
        label: "Devis à envoyer",
        result: "Échange",
        actionType: "Devis à envoyer",
        nextStage: "J21",
        delayDays: 6,
        status: "Chaud",
        note: "Devis attendu. Relance décision à programmer.",
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
        note: "Opportunité convertie. Passer en suivi client.",
        mode: "meeting",
      },
      {
        key: "silence",
        label: "Silence décision",
        result: "NRP",
        actionType: "Silence après proposition",
        nextStage: "J21",
        delayDays: 6,
        status: "En attente",
        note: "Décision en attente. Dernier contact avant archivage.",
      },
    ],
  },
  J21: {
    key: "J21",
    label: "J21 – Dernier contact",
    objective: "Clore proprement ou obtenir une fenêtre de reprise.",
    script:
      "Je tente un dernier message avant de vous laisser tranquille : soit ce n'est pas le bon moment, soit le sujet n'est plus prioritaire. Souhaitez-vous que je vous recontacte plus tard ?",
    checklist: ["Rester léger", "Demander fenêtre de reprise", "Archiver proprement"],
    outcomes: [
      {
        key: "reprise",
        label: "Reprise plus tard",
        result: "Pas dispo",
        actionType: "Reprise ultérieure",
        nextStage: "J1",
        delayDays: 90,
        status: "En attente",
        note: "Relance trimestrielle programmée.",
        mode: "callback",
      },
      {
        key: "relance-chaude",
        label: "Réponse tardive positive",
        result: "Échange",
        actionType: "Réponse tardive positive",
        nextStage: "J10",
        delayDays: 1,
        status: "Chaud",
        note: "Réactivation positive. Repartir sur une demande RDV.",
        mode: "exchange",
      },
      {
        key: "archiver",
        label: "Archiver",
        result: "Pas dispo",
        actionType: "Archivage commercial",
        nextStage: "J21",
        delayDays: 90,
        status: "En attente",
        note: "Aucune ouverture. Archivage avec relance longue.",
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
  if (category === "B – Socle SST") return "bg-category-b text-category-b-foreground";
  if (category === "C – Porte d'entrée") return "bg-category-c text-category-c-foreground";
  if (category === "Récurrent") return "bg-category-recurring text-category-recurring-foreground";
  return "bg-category-exceptional text-category-exceptional-foreground";
}

export function statusBandClass(status: ProspectStatus | null | undefined) {
  if (status === "Chaud") return "bg-status-hot";
  if (status === "Tiède") return "bg-status-warm";
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
    !prospect.contacts.length ? "Contact manquant" : "",
    !prospect.next_action_date ? "Relance non planifiée" : "",
    !prospect.siren ? "SIREN manquant" : "",
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
  if (prospect.status === "Chaud") return "Prospect chaud à suivre";
  if (prospect.import_source) return "Prospect importé à qualifier";
  return "Priorité selon catégorie et statut";
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

export async function saveProspect(
  input: Partial<Prospect> & { company_name: string },
  contact?: Partial<Contact>,
) {
  const { data: prospect, error } = await supabase
    .from("prospects")
    .upsert(input)
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

export async function updateProspect(id: string, payload: Partial<Prospect>) {
  const { error } = await supabase.from("prospects").update(payload).eq("id", id);
  if (error) throw error;
}

export function prioritizeSession(prospects: ProspectWithRelations[]) {
  const categoryRank: Record<string, number> = {
    "A – Pilier": 0,
    "B – Socle SST": 1,
    "C – Porte d'entrée": 2,
    Récurrent: 3,
    Exceptionnel: 4,
  };
  const statusRank: Record<string, number> = {
    Chaud: 0,
    Tiède: 1,
    "En attente": 2,
    Converti: 3,
    Perdu: 4,
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
      const byCategory = (categoryRank[a.category] ?? 9) - (categoryRank[b.category] ?? 9);
      if (byCategory !== 0) return byCategory;
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
  const title = `RDV ${args.prospect.company_name} – ${args.prospect.offer_target || "SST"}`;
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

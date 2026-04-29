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

export const stageScripts: Record<CycleStage, { label: string; text: string; objective: string }> =
  {
    J1: {
      label: "J1 – Premier contact",
      objective: "Obtenir l'attention du bon interlocuteur.",
      text: "Objectif : obtenir l'attention du bon interlocuteur. Action : email court sur les obligations SST, annonce d'un appel. Script appel : 'Bonjour, je m'appelle Julie Baijot, je suis formatrice SST basée à Annonay. J'ai envoyé un email à [contact] — je voulais vérifier qu'il était bien arrivé et voir si vous êtes la bonne personne pour en parler.'",
    },
    J2: {
      label: "J2 – Relance 1",
      objective: "Relancer avec bienveillance, proposer un RDV.",
      text: "Objectif : relancer avec bienveillance, proposer un RDV. Script : 'Je me permets de recontacter suite à mon email. Je travaille avec des entreprises industrielles de la région sur la formation SST — est-ce que c'est un sujet d'actualité pour vous en ce moment ?'",
    },
    J4: {
      label: "J4 – Qualification sujet",
      objective: "Vérifier s'il y a un vrai sujet.",
      text: "Objectif : vérifier s'il y a un vrai sujet. Script : 'Je reprends contact — avez-vous eu le temps de regarder mon email ? Je propose souvent un échange de 20 minutes pour voir si je peux vous être utile, sans engagement.'",
    },
    J6: {
      label: "J6 – Rappel réglementaire",
      objective: "Envoyer un récapitulatif des obligations légales + CTA.",
      text: "Objectif : email récapitulatif des obligations légales + CTA. Action : envoyer email de rappel réglementaire avec call-to-action 'Où en êtes-vous sur votre plan SST ?'",
    },
    J10: {
      label: "J10 – Demande RDV",
      objective: "Obtenir un vrai RDV.",
      text: "Objectif : obtenir un vrai RDV. Script : 'Je reviens vers vous car je passe dans votre secteur la semaine prochaine — est-ce qu'un créneau de 30 minutes serait possible pour qu'on fasse le point ensemble ?'",
    },
    J15: {
      label: "J15 – Transformation devis",
      objective: "Transformer en devis.",
      text: "Objectif : transformer en devis. Script : 'Derniers créneaux disponibles ce trimestre — je voulais vous proposer de bloquer une date avant que mon planning soit complet.'",
    },
    J21: {
      label: "J21 – Dernier contact",
      objective: "Dernier contact humoristique avant archivage.",
      text: "Objectif : dernier contact humoristique avant archivage. Action : email décalé du type 'Soit la planète s'est arrêtée de tourner, soit ce n'est vraiment pas le bon moment…' puis archiver dans 'En attente', relance trimestrielle.",
    },
  };

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
      const byCategory = (categoryRank[a.category] ?? 9) - (categoryRank[b.category] ?? 9);
      if (byCategory !== 0) return byCategory;
      const byDate =
        +new Date(a.next_action_date || "2099-12-31") -
        +new Date(b.next_action_date || "2099-12-31");
      if (byDate !== 0) return byDate;
      return (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
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

import { addDaysIso, todayIsoDate } from "@/lib/prm";

/** Liste du jour préparée la veille : appels, emails et entreprises à qualifier. */
export interface DayPlan {
  /** Jour d'exécution (YYYY-MM-DD). */
  date: string;
  /** Identifiants des prospects à appeler. */
  calls: string[];
  /** Identifiants des prospects à contacter par email. */
  emails: string[];
  /** Identifiants des prospects à qualifier, orientés le lendemain vers appel ou email. */
  qualify: string[];
  /** Journée clôturée. */
  closed?: boolean;
}

const PREFIX = "prm-day-plan-";

export function emptyPlan(date: string): DayPlan {
  return { date, calls: [], emails: [], qualify: [], closed: false };
}

export function loadPlan(date: string): DayPlan {
  if (typeof window === "undefined") return emptyPlan(date);
  try {
    const raw = window.localStorage.getItem(PREFIX + date);
    if (!raw) return emptyPlan(date);
    const parsed = JSON.parse(raw) as Partial<DayPlan>;
    return {
      date,
      calls: Array.isArray(parsed.calls) ? parsed.calls.slice(0, 6) : [],
      emails: Array.isArray(parsed.emails) ? parsed.emails.slice(0, 3) : [],
      qualify: Array.isArray(parsed.qualify) ? parsed.qualify.slice(0, 3) : [],
      closed: Boolean(parsed.closed),
    };
  } catch {
    return emptyPlan(date);
  }
}

export function savePlan(plan: DayPlan) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + plan.date, JSON.stringify(plan));
}

/** Ajoute un prospect à une liste d'un jour donné (utilisé au moment de la qualification). */
export function addToPlan(date: string, list: "calls" | "emails" | "qualify", id: string) {
  const plan = loadPlan(date);
  const limit = list === "calls" ? 6 : 3;
  const others = (["calls", "emails", "qualify"] as const).filter((key) => key !== list);
  for (const key of others) plan[key] = plan[key].filter((item) => item !== id);
  if (!plan[list].includes(id)) {
    if (plan[list].length >= limit) return { plan, added: false };
    plan[list] = [...plan[list], id];
  }
  savePlan(plan);
  return { plan, added: true };
}

export function tomorrowIso() {
  return addDaysIso(1).slice(0, 10);
}

export function todayPlan() {
  return loadPlan(todayIsoDate());
}

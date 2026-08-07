import { addDaysIso, todayIsoDate } from "@/lib/prm";

/** Liste du jour préparée la veille : 3 appels + 3 emails. */
export interface DayPlan {
  /** Jour d'exécution (YYYY-MM-DD). */
  date: string;
  /** Identifiants des prospects à appeler. */
  calls: string[];
  /** Identifiants des prospects à contacter par email. */
  emails: string[];
  /** Journée clôturée. */
  closed?: boolean;
}

const PREFIX = "prm-day-plan-";

export function emptyPlan(date: string): DayPlan {
  return { date, calls: [], emails: [], closed: false };
}

export function loadPlan(date: string): DayPlan {
  if (typeof window === "undefined") return emptyPlan(date);
  try {
    const raw = window.localStorage.getItem(PREFIX + date);
    if (!raw) return emptyPlan(date);
    const parsed = JSON.parse(raw) as DayPlan;
    return {
      date,
      calls: Array.isArray(parsed.calls) ? parsed.calls.slice(0, 3) : [],
      emails: Array.isArray(parsed.emails) ? parsed.emails.slice(0, 3) : [],
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

export function tomorrowIso() {
  return addDaysIso(1).slice(0, 10);
}

export function todayPlan() {
  return loadPlan(todayIsoDate());
}

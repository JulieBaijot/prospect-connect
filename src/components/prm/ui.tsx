import type { ReactNode } from "react";
import { categoryClass, statusBandClass, type Category, type ProspectStatus } from "@/lib/prm";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>;
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-[22px] font-medium leading-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CategoryBadge({ category }: { category: Category | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-normal ${categoryClass(category)}`}
    >
      {category || "Non classé"}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProspectStatus | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-normal ${statusBandClass(status)} text-status-foreground`}
    >
      {status || "—"}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "neutral" | "danger" | "warning" | "info" | "success";
}) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    neutral: "bg-secondary text-secondary-foreground hover:bg-accent",
    danger: "bg-action-nrp text-action-nrp-foreground hover:bg-action-nrp/80",
    warning: "bg-action-callback text-action-callback-foreground hover:bg-action-callback/80",
    info: "bg-action-exchange text-action-exchange-foreground hover:bg-action-exchange/80",
    success: "bg-action-meeting text-action-meeting-foreground hover:bg-action-meeting/80",
  } as const;
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "min-h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
export const labelClass = "text-xs font-medium uppercase tracking-normal text-muted-foreground";

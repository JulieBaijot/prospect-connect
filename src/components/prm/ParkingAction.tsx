import { PauseCircle } from "lucide-react";
import { useState } from "react";
import { Button, fieldClass, labelClass } from "@/components/prm/ui";
import { addDaysIso, formatDate } from "@/lib/prm";

/**
 * Action « Parquer » réutilisable : motif de reprise et date de réveil
 * tous deux obligatoires avant enregistrement.
 */
export function ParkingAction({
  id,
  defaultMotif = "",
  defaultDate = "",
  onPark,
  className = "",
}: {
  id: string;
  defaultMotif?: string;
  defaultDate?: string;
  onPark: (motif: string, wakeDate: string) => Promise<void> | void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState(defaultMotif);
  const [date, setDate] = useState(defaultDate || addDaysIso(90));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!motif.trim()) {
      setError("Le motif de reprise est obligatoire.");
      return;
    }
    if (!date) {
      setError("La date de réveil est obligatoire.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onPark(motif.trim(), date);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du parking.");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <Button
        variant="neutral"
        className={`min-h-9 px-3 ${className}`}
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        <PauseCircle className="mr-2 h-4 w-4" />
        Parquer
      </Button>
    );
  }

  return (
    <div className="mt-2 grid w-full gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-sm font-medium">Parquer ce prospect</p>
      <div className="grid gap-1">
        <label className={labelClass} htmlFor={`park-motif-${id}`}>
          Motif de reprise (obligatoire)
        </label>
        <input
          id={`park-motif-${id}`}
          autoFocus
          className={fieldClass}
          value={motif}
          onChange={(event) => setMotif(event.target.value)}
          placeholder="Budget voté en janvier, notification du taux AT/MP…"
        />
      </div>
      <div className="grid gap-1">
        <label className={labelClass} htmlFor={`park-date-${id}`}>
          Date de réveil (obligatoire)
        </label>
        <input
          id={`park-date-${id}`}
          type="date"
          className={fieldClass}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Le prospect disparaîtra des listes de travail jusqu'au {formatDate(date)}, puis reviendra en
        tête de « Préparer demain » avec son motif.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={submit}>
          Confirmer le parking
        </Button>
        <Button variant="neutral" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

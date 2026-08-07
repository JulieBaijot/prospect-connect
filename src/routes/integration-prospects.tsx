import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, FileUp, Upload } from "lucide-react";
import { AppLayout } from "@/components/prm/AppLayout";
import { Button, Card, PageTitle, fieldClass, labelClass } from "@/components/prm/ui";
import {
  headcountRanges,
  loadProspects,
  offerTargets,
  saveProspect,
  targetValueOf,
  updateProspect,
  type Contact,
  type HeadcountRange,
  type OfferTarget,
  type Prospect,
  type ProspectWithRelations,
} from "@/lib/prm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/integration-prospects")({
  head: () => ({
    meta: [
      { title: "Import CSV — PRM Santé-Sécurité" },
      {
        name: "description",
        content: "Import CSV simple : dépôt du fichier, mappage des colonnes, aperçu, import.",
      },
      { property: "og:title", content: "Import CSV — PRM Santé-Sécurité" },
      {
        property: "og:description",
        content: "Importez vos prospects depuis un CSV avec détection des doublons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout>
      <ImportCsvPage />
    </AppLayout>
  ),
});

/** Champs importables : clé technique + libellé affiché dans le mappage. */
const importFields = [
  { key: "company_name", label: "Entreprise *" },
  { key: "city", label: "Ville" },
  { key: "headcount_range", label: "Tranche d'effectif" },
  { key: "offer_target", label: "Offre visée" },
  { key: "sector", label: "Secteur" },
  { key: "main_phone", label: "Téléphone standard" },
  { key: "main_email", label: "Email générique" },
  { key: "website", label: "Site web" },
  { key: "address", label: "Adresse" },
  { key: "siren", label: "SIRET / SIREN" },
  { key: "naf_code", label: "Code NAF" },
  { key: "comments", label: "Commentaires" },
  { key: "contact_first_name", label: "Contact — prénom" },
  { key: "contact_last_name", label: "Contact — nom" },
  { key: "contact_role_title", label: "Contact — fonction" },
  { key: "contact_email", label: "Contact — email" },
  { key: "contact_phone", label: "Contact — téléphone direct" },
] as const;

type FieldKey = (typeof importFields)[number]["key"];
type Mapping = Partial<Record<FieldKey, string>>;
type Row = Record<string, string>;

function splitLine(line: string, sep: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === sep && !quoted) {
      out.push(current);
      current = "";
    } else current += char;
  }
  out.push(current);
  return out.map((value) => value.trim());
}

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [] as string[], rows: [] as Row[] };
  const sep = [";", ",", "\t"]
    .map((candidate) => ({ candidate, count: splitLine(lines[0], candidate).length }))
    .sort((a, b) => b.count - a.count)[0].candidate;
  const headers = splitLine(lines[0], sep).map((header, index) => header || `Colonne ${index + 1}`);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line, sep);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
  return { headers, rows };
}

/** Devine le mappage à partir des intitulés de colonnes du fichier. */
function guessMapping(headers: string[]): Mapping {
  const hints: Record<FieldKey, string[]> = {
    company_name: ["entreprise", "société", "societe", "raison sociale", "company", "nom"],
    city: ["ville", "commune", "city"],
    headcount_range: ["effectif", "tranche", "salariés", "salaries", "headcount"],
    offer_target: ["offre", "offer"],
    sector: ["secteur", "activité", "activite", "sector"],
    main_phone: ["téléphone", "telephone", "tel", "standard", "phone"],
    main_email: ["email générique", "email generique", "mail entreprise"],
    website: ["site", "web", "url"],
    address: ["adresse", "address"],
    siren: ["siret", "siren"],
    naf_code: ["naf", "ape"],
    comments: ["commentaire", "notes", "remarque"],
    contact_first_name: ["prénom", "prenom", "first"],
    contact_last_name: ["nom du contact", "nom contact", "last"],
    contact_role_title: ["fonction", "poste", "titre", "role"],
    contact_email: ["email", "mail", "courriel"],
    contact_phone: ["portable", "direct", "mobile", "ligne directe"],
  };
  const mapping: Mapping = {};
  const used = new Set<string>();
  for (const field of importFields) {
    const match = headers.find(
      (header) =>
        !used.has(header) &&
        hints[field.key].some((hint) => header.toLowerCase().includes(hint)),
    );
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchHeadcount(value: string): HeadcountRange | "" {
  const found = headcountRanges.find((range) => range === value.trim());
  if (found) return found;
  const digits = Number(value.replace(/[^0-9]/g, ""));
  if (!digits) return "";
  if (digits < 10) return "1-9";
  if (digits < 20) return "10-19";
  if (digits < 50) return "20-49";
  if (digits < 100) return "50-99";
  return "100-199";
}

function matchOffer(value: string): OfferTarget | "" {
  const found = offerTargets.find((offer) => normalize(offer) === normalize(value));
  return found || "";
}

interface MappedRow {
  index: number;
  values: Partial<Record<FieldKey, string>>;
  duplicate: ProspectWithRelations | null;
}

function ImportCsvPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [existing, setExisting] = useState<ProspectWithRelations[]>([]);
  const [completeDuplicates, setCompleteDuplicates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.headers));
    setStatus(`${parsed.rows.length} ligne(s) lue(s) dans ${file.name}.`);
    try {
      setExisting(await loadProspects());
    } catch (error) {
      setStatus(
        `Fichier lu, mais base inaccessible : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const mapped = useMemo<MappedRow[]>(() => {
    if (!mapping.company_name) return [];
    return rows
      .map((row, index) => {
        const values: Partial<Record<FieldKey, string>> = {};
        for (const field of importFields) {
          const column = mapping[field.key];
          if (column) values[field.key] = (row[column] || "").trim();
        }
        const name = normalize(values.company_name);
        const city = normalize(values.city);
        const duplicate =
          existing.find(
            (prospect) =>
              normalize(prospect.company_name) === name &&
              normalize(prospect.city) === city,
          ) || null;
        return { index, values, duplicate };
      })
      .filter((row) => Boolean(row.values.company_name));
  }, [rows, mapping, existing]);

  const duplicateCount = mapped.filter((row) => row.duplicate).length;
  const newCount = mapped.length - duplicateCount;

  async function runImport() {
    if (!mapped.length || busy) return;
    setBusy(true);
    let created = 0;
    let completed = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of mapped) {
      const values = row.values;
      const headcount = matchHeadcount(values.headcount_range || "");
      const offer = matchOffer(values.offer_target || "");
      const contact: Partial<Contact> = {
        first_name: values.contact_first_name || null,
        last_name: values.contact_last_name || null,
        role_title: values.contact_role_title || null,
        email: values.contact_email || null,
        direct_phone: values.contact_phone || null,
      };
      try {
        if (row.duplicate) {
          if (!completeDuplicates) {
            skipped += 1;
            continue;
          }
          const target = row.duplicate;
          const patch: Partial<Prospect> = {};
          const fill = (key: keyof Prospect, value: string | null) => {
            if (value && !target[key]) (patch as Record<string, unknown>)[key] = value;
          };
          fill("city", values.city || null);
          fill("sector", values.sector || null);
          fill("main_phone", values.main_phone || null);
          fill("main_email", values.main_email || null);
          fill("website", values.website || null);
          fill("address", values.address || null);
          fill("siren", values.siren || null);
          fill("naf_code", values.naf_code || null);
          fill("comments", values.comments || null);
          if (headcount && !target.headcount_range) patch.headcount_range = headcount;
          if (offer && !target.offer_target) patch.offer_target = offer;
          const hasContactData = Boolean(
            contact.first_name || contact.last_name || contact.email || contact.direct_phone,
          );
          if (Object.keys(patch).length) await updateProspect(target.id, patch);
          if (hasContactData && !target.contacts.length) {
            const { error } = await supabase
              .from("contacts")
              .insert({ ...contact, prospect_id: target.id } as never);
            if (error) throw error;
          }
          if (Object.keys(patch).length || (hasContactData && !target.contacts.length)) {
            completed += 1;
          } else skipped += 1;
        } else {
          await saveProspect(
            {
              company_name: values.company_name as string,
              city: values.city || null,
              sector: values.sector || null,
              main_phone: values.main_phone || null,
              main_email: values.main_email || null,
              website: values.website || null,
              address: values.address || null,
              siren: values.siren || null,
              naf_code: values.naf_code || null,
              comments: values.comments || null,
              headcount_range: headcount || "20-49",
              offer_target: offer || "SST",
              estimated_value: targetValueOf(headcount || "20-49"),
              status: "À qualifier",
              import_source: "csv",
            } as Partial<Prospect> & { company_name: string },
            contact,
          );
          created += 1;
        }
      } catch {
        failed += 1;
      }
    }

    setExisting(await loadProspects());
    setBusy(false);
    setStatus(
      `Import terminé : ${created} fiche(s) créée(s), ${completed} doublon(s) complété(s), ${skipped} ignoré(s)${failed ? `, ${failed} en erreur` : ""}.`,
    );
  }

  return (
    <>
      <PageTitle
        title="Import CSV"
        subtitle="Déposez un fichier, mappez les colonnes, vérifiez l'aperçu, importez."
        action={
          <Link
            to="/prospects"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux prospects
          </Link>
        }
      />

      {status ? <p className="mb-4 rounded-lg bg-script p-3 text-sm">{status}</p> : null}

      <div className="grid gap-4">
        <Card className="p-4">
          <h3 className="text-[16px] font-medium">1. Fichier</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV séparé par point-virgule, virgule ou tabulation. La première ligne doit contenir les
            intitulés de colonnes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button variant="neutral" onClick={() => inputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" />
              Choisir un fichier CSV
            </Button>
            {fileName ? (
              <span className="text-sm text-muted-foreground">
                {fileName} · {rows.length} ligne(s)
              </span>
            ) : null}
          </div>
        </Card>

        {headers.length ? (
          <Card className="p-4">
            <h3 className="text-[16px] font-medium">2. Mappage des colonnes</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {importFields.map((field) => (
                <label key={field.key} className="grid gap-1">
                  <span className={labelClass}>{field.label}</span>
                  <select
                    className={fieldClass}
                    value={mapping[field.key] || ""}
                    onChange={(event) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: event.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">— ignorer —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {!mapping.company_name ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                La colonne « Entreprise » est obligatoire pour continuer.
              </p>
            ) : null}
          </Card>
        ) : null}

        {mapped.length ? (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h3 className="text-[16px] font-medium">3. Aperçu</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {newCount} nouvelle(s) fiche(s) · {duplicateCount} doublon(s) détecté(s) sur
                  entreprise + ville.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={completeDuplicates}
                    onChange={(event) => setCompleteDuplicates(event.target.checked)}
                  />
                  Compléter les champs vides des doublons
                </label>
                <Button onClick={runImport} disabled={busy}>
                  <Upload className="mr-2 h-4 w-4" />
                  {busy ? "Import en cours…" : `Importer ${mapped.length} ligne(s)`}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Entreprise", "Ville", "Téléphone", "Contact", "Traitement"].map((head) => (
                      <th key={head} className="px-4 py-3">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 30).map((row) => (
                    <tr key={row.index} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{row.values.company_name}</td>
                      <td className="px-4 py-3">{row.values.city || "—"}</td>
                      <td className="px-4 py-3">{row.values.main_phone || "—"}</td>
                      <td className="px-4 py-3">
                        {[row.values.contact_first_name, row.values.contact_last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.duplicate ? (
                          <span className="text-action-callback-foreground">
                            {completeDuplicates
                              ? "Doublon → compléter la fiche existante"
                              : "Doublon → ignorer"}
                          </span>
                        ) : (
                          "Création"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mapped.length > 30 ? (
              <p className="border-t border-border p-4 text-sm text-muted-foreground">
                Aperçu limité aux 30 premières lignes ; l'import traite les {mapped.length} lignes.
              </p>
            ) : null}
          </Card>
        ) : null}
      </div>
    </>
  );
}

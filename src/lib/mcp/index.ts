import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProspects from "./tools/list-prospects";
import searchProspects from "./tools/search-prospects";
import getProspect from "./tools/get-prospect";
import todayActions from "./tools/today-actions";
import addProspectionLog from "./tools/add-prospection-log";
import updateProspect from "./tools/update-prospect";

// Direct Supabase issuer — the .lovable.cloud proxy is rejected by mcp-js.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "prm-sante-securite-mcp",
  title: "PRM Santé-Sécurité",
  version: "0.1.0",
  instructions:
    "Outils pour consulter et mettre à jour le PRM (prospects, contacts, historique) de formation et conseil en santé-sécurité au travail. Utilise `today_actions` pour voir les rappels et RDV du jour, `list_prospects` / `search_prospects` pour parcourir la base, `get_prospect` pour le détail d'une fiche, `add_prospection_log` pour tracer un appel, et `update_prospect` pour corriger une fiche.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProspects, searchProspects, getProspect, todayActions, addProspectionLog, updateProspect],
});

# Prospect Connect — PRM Santé-Sécurité

Outil de gestion de la prospection (PRM) de Julie Baijot, formatrice et conseil en santé-sécurité au travail (SST, DUERP, QVCT / RPS, SSCT / CSE, sur mesure). Application mono-utilisatrice, interface en français.

## Pages

| Page | Rôle |
| --- | --- |
| Aujourd'hui | Plan du jour : appels, emails et entreprises à qualifier |
| Demain | Préparation de la liste du lendemain |
| Calendrier | Relances et RDV planifiés |
| Prospects | Base prospects, fiche, enrichissement (Google Places + Perplexity) |
| Groupes | Prospects rattachés à un même groupe |
| Parking | Prospects mis en attente avec date de réveil |
| Modèles | Modèles d'emails par segment |
| Journal | Historique des actions, export CSV |
| Pilotage | Statistiques de prospection |
| Session d'appels | Enchaînement de fiches d'appel (NRP, Barrage, Pas dispo, Échange, RDV) |
| Intégration prospects | Import depuis Pappers / INSEE Sirene / Annuaire Entreprises |

## Modèle de données (Supabase)

- `prospects` — statut : À qualifier / En contact / En discussion / Parké / Converti / Perdu ; offre : SST, DUERP, SSCT / CSE, QVCT / RPS, Sur mesure ; `segment` calculé depuis la tranche d'effectifs.
- `contacts` — interlocuteurs d'un prospect.
- `prospection_logs` — journal (canal, résultat, promesses, emails envoyés).
- `email_templates`, `integration_batches`, `api_search_runs`.
- `app_owner` — compte(s) autorisé(s) à accéder aux données.

## Sécurité

- Pas d'inscription publique : seule la connexion est proposée.
- Toutes les tables sont protégées par RLS : accès réservé aux comptes listés dans `app_owner` (fonction `is_app_owner()`).
- Les fonctions serveur qui consomment des API payantes (Pappers, Google Places, Perplexity, Hunter) exigent une session de la propriétaire.
- Les clés API sont des secrets côté serveur, jamais préfixées `VITE_`.

## Serveur MCP

Exposé sur `/mcp` (OAuth Supabase) : `today_actions`, `list_prospects`, `search_prospects`, `get_prospect`, `add_prospection_log`, `update_prospect`.

## Développement

Projet [Lovable](https://lovable.dev/projects/826b438e-59d7-458a-8f49-fdb0cd82df1f) — TanStack Start, React, Tailwind, Supabase. Les modifications poussées sur `main` sont synchronisées dans Lovable.

```sh
npm i
npm run dev
```

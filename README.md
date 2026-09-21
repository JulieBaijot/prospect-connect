# Prospect Connect

Build a prospect relationship manager (PRM) app for a freelance occupational health & safety trainer. The app must work like a calling session tool. Use French language for all UI labels.

TECH STACK: React + TypeScript + Tailwind + Supabase (for persistence). No auth needed for now — single user app.

DATA MODEL — Prospect

Each prospect has: id, company name, city, headcount range (10-19 / 20-49 / 50-99 / 100-199 / 200-249 / 250-499 / 500-999 / 1000+), category (A–Pilier / B–Socle SST / C–Porte d'entrée / Récurrent / Exceptionnel), offer target (SST FI / SST MAC / CSE-CSSCT / QVCT / Émotions / Excel), estimated value (€), contact first+last name, role/title, main phone, direct phone, email, LinkedIn URL, reception hours, comments, current cycle stage (J1/J2/J4/J6/J10/J15/J21), status (Chaud / Tiède / En attente / Perdu / Converti), and a call history log (array of: date, action type, notes, next action date).

PAGE 1 — Session d'appels

Button to start a new session. The session pulls up to 20 prospects, prioritized by: (1) category A first, then B, then C; (2) within same category, those with the earliest next-action date; (3) status "Chaud" before "Tiède".

Display a call card one at a time (full-screen card, no scrolling needed). The card shows:

TOP: Company name, city, headcount, category badge (color-coded per design system below), offer target, estimated value

CONTACT BLOCK: Name, role, phone (clickable tel: link), email (clickable mailto:), LinkedIn (opens in new tab), reception hours, comments

STAGE BLOCK: Current cycle stage label (e.g. "J2 – Relance 1") + the full script/guidance for that stage (see scripts below)

CALL HISTORY: Last 3 entries from the log, showing date + short note

ACTION BUTTONS (bottom of card, large, easy to tap):

NRP (no answer) → logs "NRP" + timestamp, advances to next prospect

Pas dispo → logs "Pas disponible" + opens a small field: "Rappeler le [date picker]" → saves callback date

Échange → opens a text area for short notes → saves log entry, asks "Prochaine étape ?" with stage selector

RDV obtenu → opens a mini form: date picker, duration, optional visio link (Zoom/Teams/Google Meet) → saves log + generates a Google Calendar link (pre-filled with prospect name, company, phone, offer) that opens in new tab

Suivant → skip to next card without logging

Progress bar showing X/20 cards done in session. End-of-session summary: NRP count, RDV count, exchanges count.

CYCLE STAGE SCRIPTS (embed these in the app as constants):

J1: "Objectif : obtenir l'attention du bon interlocuteur. Action : email court sur les obligations SST, annonce d'un appel. Script appel : 'Bonjour, je m'appelle Julie Baijot, je suis formatrice SST basée à Annonay. J'ai envoyé un email à [contact] — je voulais vérifier qu'il était bien arrivé et voir si vous êtes la bonne personne pour en parler.'"

J2: "Objectif : relancer avec bienveillance, proposer un RDV. Script : 'Je me permets de recontacter suite à mon email. Je travaille avec des entreprises industrielles de la région sur la formation SST — est-ce que c'est un sujet d'actualité pour vous en ce moment ?'"

J4: "Objectif : vérifier s'il y a un vrai sujet. Script : 'Je reprends contact — avez-vous eu le temps de regarder mon email ? Je propose souvent un échange de 20 minutes pour voir si je peux vous être utile, sans engagement.'"

J6: "Objectif : email récapitulatif des obligations légales + CTA. Action : envoyer email de rappel réglementaire avec call-to-action 'Où en êtes-vous sur votre plan SST ?'"

J10: "Objectif : obtenir un vrai RDV. Script : 'Je reviens vers vous car je passe dans votre secteur la semaine prochaine — est-ce qu'un créneau de 30 minutes serait possible pour qu'on fasse le point ensemble ?'"

J15: "Objectif : transformer en devis. Script : 'Derniers créneaux disponibles ce trimestre — je voulais vous proposer de bloquer une date avant que mon planning soit complet.'"

J21: "Objectif : dernier contact humoristique avant archivage. Action : email décalé du type 'Soit la planète s'est arrêtée de tourner, soit ce n'est vraiment pas le bon moment…' puis archiver dans 'En attente', relance trimestrielle."

PAGE 2 — Base prospects

List view with columns: Company, Contact, City, Category, Stage, Status, Next action date, Estimated value. Filter by: status, category, offer type, city/zone. Click a row → opens prospect detail/edit panel. Button: "Ajouter un prospect" → opens add form (all fields).

From the add form, provide helper buttons:

"Rechercher sur Pappers" → opens https://www.pappers.fr/recherche?q=[company] in new tab

"Rechercher sur Google" → opens Google search "[contact name] [company] responsable RH OR sécurité" in new tab

"Rechercher sur LinkedIn" → opens https://www.linkedin.com/search/results/people/?keywords=[contact+company] in new tab

"Enrichir via Google Places" → calls Google Places Text Search API with query "[company name] [city]", API key from env VITE_GOOGLE_PLACES_API_KEY. Auto-fills: Numéro accueil (formatted_phone_number), Site web (website), Adresse (formatted_address), Horaires (opening_hours.weekday_text). Shows confirmation panel before saving. Stores Google Place ID.

PAGE 3 — Intégration prospects

A 4-step wizard with a visual stepper (Step 1 → 2 → 3 → 4). User can go back to any previous step. A persistent right-side summary panel shows all companies in the current session: company name, city, contacts found count, enrichment status (found / not found), qualification status. Clicking a company in this panel jumps to its card in the current step.

STEP 1 — Recherche entreprise

Search form fields:

Mot-clé / Nom entreprise (text, optional)

Département(s) (multi-select: 07, 26, 38, 42, 69, 01, 73, 74 — pre-filled by default)

Tranche d'effectifs (multi-select: 10-19, 20-49, 50-99, 100-199, 200-249, 250-499, 500-999, 1000+)

Secteur / Code NAF (multi-select: Industrie manufacturière, Logistique & transport, Agroalimentaire, Chimie & pharmacie, Médico-social & santé, BTP, Services aux entreprises)

Statut juridique (optional: SAS, SARL, SA, SCI, Association, Établissement public)

Source de recherche — dropdown selector, prominently positioned above the search button, persisted in localStorage:

Pappers API — Données légales enrichies, dirigeants inclus (100 req/mois gratuites) — calls GET https://api.pappers.fr/v2/entreprises, params: q, departement, tranche_effectif, code_naf, key from env VITE_PAPPERS_API_KEY

INSEE Sirene — Source officielle exhaustive, gratuit et sans limite — calls GET https://api.insee.fr/entreprises/sirene/V3/siret, params: q, departement, tranche_effectif_salarie, activite_principale, no key required

Annuaire Entreprises — API gouvernementale, gratuit et sans limite — calls GET https://recherche-entreprises.api.gouv.fr/search, params: q, departement, tranche_effectif_salarie, activite_principale, no key required

Next to the dropdown, show a static quota indicator per source: Pappers → "Quota : 100 req/mois gratuites", INSEE Sirene → "Gratuit, sans limite", Annuaire Entreprises → "Gratuit, sans limite".

When Pappers returns a 429 or quota error, display a banner: "Quota Pappers atteint — basculer vers une autre source ?" with buttons "INSEE Sirene" and "Annuaire Entreprises" that switch source and re-run the search instantly without losing current filters.

Results table: Nom, Ville, Effectifs, NAF, SIREN, Adresse. Each row has a checkbox + "Sélectionner" button. Staging list at the bottom with "Passer à l'étape 2 →" button and count badge.

STEP 2 — Enrichissement Google Places

For each selected company, auto-trigger a Google Places Text Search API call: query = "[company name] [city]", key from env VITE_GOOGLE_PLACES_API_KEY. Show per-card status: En cours / Trouvé / Non trouvé. When found, display editable fields: Numéro accueil, Site web, Adresse complète, Horaires (collapsible). Each field has a modify icon. If not found, show manual input form. Store Google Place ID. Button "Passer à l'étape 3 →" once all cards have a status.

STEP 3 — Recherche de contact

For each company card:

Auto-populated from Pappers (if used in step 1): display legal representatives (dirigeants) with name + role + "Ajouter comme contact" button.

Manual search helpers per company:

"Site web → Page équipe" → opens [website]/equipe or /team or /contact (small dropdown of slugs)

"Google : responsable RH/Sécurité" → opens Google search: "[company name]" "responsable RH" OR "responsable sécurité" OR "QHSE" OR "responsable HSE" OR "DRH" site:linkedin.com

"Hunter.io : trouver email" → if VITE_HUNTER_API_KEY is set, calls Hunter Domain Search API with company domain extracted from website URL, shows found emails with name + role + confidence score. If no key, opens hunter.io in new tab.

"Ajouter contact manuellement" → inline mini-form: Prénom, Nom, Rôle/Titre, Téléphone direct, Email, Commentaire.

Contextual tip per sector: Industrie → "Cibles prioritaires : Responsable HSE, Responsable RH, Dirigeant" / Médico-social → "Cibles prioritaires : Directeur, Responsable formation, Infirmier(e) coordinateur(trice)" / Transport → "Cibles prioritaires : Responsable QSE, DRH, Gérant" / CSE context → "Cibles prioritaires : Secrétaire CSE, Élu(e) référent(e) CSSCT".

Multiple contacts per company allowed. Each added contact appears as a chip on the card. Button "Passer à l'étape 4 →".

STEP 4 — LinkedIn & qualification finale

For each contact:

"Rechercher sur LinkedIn" → opens https://www.linkedin.com/search/results/people/?keywords=[firstname]+[lastname]+[company] in new tab

"Rechercher profil + rôle" → opens https://www.linkedin.com/search/results/people/?keywords=[company]+"responsable RH" OR "HSE" OR "QHSE" in new tab

LinkedIn URL field: paste input → saved to contact record

Qualification fields per contact: Niveau de maturité (Pas joint / Intérêt / RDV / Devis / Décision / Pas de sujet / Intérêt à relancer), Offre cible (SST FI / SST MAC / CSE-CSSCT / QVCT / Émotions / Excel), Valeur estimée (€), Catégorie (A / B / C / Récurrent / Exceptionnel), Commentaires libres.

Final summary panel before saving: recap card per company with all data. Allow last-minute edits.

Button "Ajouter au PRM" → saves all to database, sets initial stage to J1, status to "Tiède", redirects to prospect list. Button "Sauvegarder et continuer" → saves batch and resets wizard for new search.

PAGE 4 — Journal de prospection

Auto-populated table: Date, Entreprise, Contact, Canal (email / téléphone / physique), Étape, Objectif, Résultat (NRP / Pas dispo / Échange / RDV), Notes, RDV date. Filterable by week, month, canal, category. Exportable to CSV.

PAGE 5 — Stats

Cards: total prospects, appels passés cette semaine, taux de pénétration (barrages passés / appels), taux de RDV, taux de transformation, CA potentiel pipeline. Weekly chart: emails sent, calls made, RDV obtained.

DESIGN SYSTEM

Color palette:

--tc-50: #FAF0EB
--tc-100: #F5D5C2
--tc-200: #EEB599
--tc-400: #C8693A   /* terracotta — nav active, CTA principal, bandeau Chaud */
--tc-600: #8F4220
--tc-800: #5C2610

--sg-50: #EEF3EC
--sg-100: #C8DBCA
--sg-200: #9BBF9E
--sg-400: #5A8C5D   /* vert sauge — RDV, succès, catégorie A, bandeau Converti */
--sg-600: #3A6040
--sg-800: #224028

--oc-50: #FBF4E3
--oc-100: #F5DFA0
--oc-400: #C99A2E   /* ocre — Tiède, alertes douces, bloc script */
--oc-600: #8C6A18
--oc-800: #5A420E

--neutral-bg: #F7F3EE    /* fond général de l'app */
--neutral-card: #FFFFFF  /* fond des fiches d'appel */
--neutral-border: #D3CFC8
--neutral-muted: #888780

Typography: System font stack (Inter or system-ui). Weights: 400 (body), 500 (headings, labels). Never 600 or 700. Sizes: 22px page titles, 16px card titles, 14px body, 12px meta/labels, 11px uppercase tags.

Category badges (pill, border-radius 20px):

A – Pilier → background --sg-100, text --sg-800

B – Socle SST → background --oc-100, text --oc-800

C – Porte d'entrée → background --tc-100, text --tc-800

Récurrent → background #E8E4DE, text #4A4540

Exceptionnel → background #EAF1FB, text #1A4A7A

Call card (fiche cockpit):

Background: --neutral-card (#FFFFFF)

Border: 0.5px solid --neutral-border

Border-radius: 12px

Top colored band (8px height, full width): --tc-400 for "Chaud", --oc-400 for "Tiède", --sg-400 for "RDV obtenu / Converti", #D3CFC8 for "En attente"

Contact sub-card inside: background --neutral-bg (#F7F3EE), border-radius 8px

Script block: border-left 3px solid --oc-400, background --oc-50, border-radius 0 6px 6px 0

Action buttons (call session):

NRP → background #FCEAEA, text #7A2020

Pas dispo → background --oc-50, text --oc-800

Échange → background #EAF1FB, text #1A4A7A

RDV obtenu → background --sg-50, text --sg-800

Suivant → background #F1EFE8, text #5F5E5A

Navigation bar: Horizontal tabs. Active: background --tc-400, text white. Inactive: white background, text --neutral-muted. Border-radius 10px on container.

Stepper: Done steps: --sg-400 circle + white number. Active: --tc-400 circle + white number. Upcoming: #E8E4DE + gray number. Connector: 1px solid --neutral-border.

General UI: All cards: white background + 0.5px solid --neutral-border + border-radius 12px. Page background: --neutral-bg. No shadows, no gradients. Inputs: border 0.5px solid --neutral-border, focus ring --tc-200. Primary action buttons: --tc-400 background + white text.

Mobile-first: Call cards must work well on phone screen. Large tap targets for all action buttons. Keyboard shortcuts for desktop: 1=NRP, 2=Pas dispo, 3=Échange, 4=RDV, 5=Suivant.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/826b438e-59d7-458a-8f49-fdb0cd82df1f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# Fusion de l'enrichissement Caviste dans le PRM

## Ce qui change

L'enrichissement actuel utilise l'ancienne API Google Places (textsearch + details) et ne récupère que téléphone, site, adresse, horaires. On le remplace par le système caviste : **Google Places v1** (horaires propres, note, avis, Maps) **+ Perplexity** (décideur, effectif, réseaux sociaux, icebreakers d'actualité) en parallèle, avec retour d'un statut par source.

## 1. Base de données

Migration pour ajouter sur la table `prospects` :

- `decision_maker` (text) — nom + fonction du décideur
- `employees_count` (text) — estimation Perplexity ("5-10")
- `social_links` (jsonb) — `{ facebook, instagram, linkedin }`
- `icebreakers` (jsonb) — tableau `[{ type, title, source, date, url }]`
- `additional_info` (text)
- `average_rating` (numeric)
- `reviews_count` (integer)
- `google_maps_url` (text)
- `enrichment_sources` (jsonb) — `{ google_places: {status,message}, perplexity: {status,message} }`
- `enriched_at` (timestamptz)

Pas de nouvelle table, pas de RLS à recréer (existante sur `prospects`).

## 2. Secrets

- `GOOGLE_PLACES_API_KEY` : déjà présent. Vérifier que l'API **Places API (New) v1** est activée côté Google Cloud — sinon Google renvoie 403 et on le signale clairement.
- `PERPLEXITY_API_KEY` : à demander via `secrets--add_secret` après approbation du plan.

## 3. Backend (`src/server/prospect-search.server.ts`)

Réécriture de `enrichCompanyServer({ name, city, activity?, address? })` :

- Lance **en parallèle** `fetchGooglePlacesV1()` et `fetchPerplexity()` via `Promise.allSettled`.
- `fetchGooglePlacesV1` : POST `https://places.googleapis.com/v1/places:searchText` avec `X-Goog-Api-Key` et `X-Goog-FieldMask` (displayName, formattedAddress, nationalPhoneNumber, websiteUri, rating, userRatingCount, googleMapsUri, regularOpeningHours). Mapping vers `{ phone, website, address, hours, average_rating, reviews_count, google_maps_url, placeId }`.
- `fetchPerplexity` : POST `https://api.perplexity.ai/chat/completions` modèle `sonar` avec `response_format: json_schema` (schéma identique caviste : decision_maker / employees_count / social_links / icebreakers / additional_info). Nettoyage des champs vides.
- Renvoie `{ status: "found" | "partial" | "missing_key" | "not_found", fields: {...}, sources: { google_places, perplexity } }`. Gestion d'erreur explicite par code HTTP (401/402/429/403).

Pas de changement aux validateurs Zod côté `prospect-search.functions.ts` (juste extension du schéma de sortie). Ajout d'un nouveau serverFn `applyEnrichment` (auth `requireSupabaseAuth`) qui :

1. Appelle `enrichCompanyServer`.
2. Merge **sans écraser** les champs déjà renseignés manuellement (règle déjà admise dans le plan précédent).
3. Persiste les nouveaux champs + `enrichment_sources` + `enriched_at` sur la ligne `prospects`.
4. Renvoie le prospect mis à jour + le rapport de sources.

## 4. UI

### a. Qualification (`src/routes/qualification.tsx`)
- Bouton "Enrichir" → appelle `applyEnrichment`, affiche un **panneau de statut par source** (badge vert/rouge/gris avec message), pas juste un toast unique.
- Nouveaux blocs : note/avis (Google), décideur, effectif, réseaux sociaux (icônes cliquables), **liste icebreakers** (carte par item avec titre, source, date, lien).

### b. Session d'appel (`src/routes/session-appels.tsx`)
- Encart "Pour briser la glace" : top 3 icebreakers + nom du décideur + note Google, **lecture seule**. Pas de bouton enrichir ici (focus appel).

### c. Fiche prospect détaillée
- Ajouter une route `src/routes/prospects.$id.tsx` (ou panneau drawer depuis `prospects.tsx` selon ce qui existe — à confirmer pendant l'implémentation).
- Vue complète : tous les champs enrichis + bouton "Ré-enrichir" + dernière date d'enrichissement + statut détaillé par source.

## 5. Détails techniques

- Modèle Perplexity : `sonar` (rapide, suffisant pour ce besoin). Sortie JSON via `response_format.json_schema`.
- Lecture des clés API uniquement dans `.handler()`, jamais en module-scope (règle TanStack).
- Merge anti-écrasement : un champ existant non-vide en base est conservé ; seuls les champs vides sont remplis. Exception : `enrichment_sources` et `enriched_at` toujours mis à jour.
- Gestion d'erreur surfacée : `429` → "Limite atteinte, réessayez", `402` → "Crédits Perplexity épuisés", `403` Google → "Active Places API (New) sur Google Cloud", `401` → "Clé invalide".
- Icebreakers triés par date desc côté serveur, max 5.

## 6. Étapes d'implémentation

1. Migration DB (10 colonnes sur `prospects`).
2. Ajout du secret `PERPLEXITY_API_KEY`.
3. Réécriture `prospect-search.server.ts` (2 fetchers + merge).
4. Nouveau serverFn `applyEnrichment` + ajustement du schéma Zod de sortie.
5. UI qualification (statut par source + nouveaux blocs).
6. Encart icebreakers dans la session d'appel.
7. Fiche prospect détaillée (vue complète + ré-enrichir).
8. Vérifier l'enregistrement + relire un prospect existant pour valider que rien n'est écrasé.

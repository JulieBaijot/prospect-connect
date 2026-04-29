Je vais construire l’application PRM comme un outil de travail principalement conçu pour ordinateur, avec une interface dense, confortable au clavier et adaptée aux sessions d’appels sur grand écran. Elle restera utilisable sur mobile si besoin, mais le design ne sera pas mobile-first.

## Orientation UX révisée

L’usage principal sera ordinateur :

- pages en largeur confortable avec tableaux, panneaux latéraux et cartes détaillées
- navigation par onglets horizontaux
- session d’appels pensée comme un cockpit desktop avec fiche centrale et informations secondaires autour
- raccourcis clavier prioritaires pour aller vite pendant les appels
- mobile en responsive : les colonnes se replient, les panneaux deviennent empilés, les boutons restent tactiles

## Objectif produit

Créer un prospect relationship manager pour une formatrice freelance en santé/sécurité au travail, centré sur les sessions d’appels : préparer les prospects, appeler un par un, consigner rapidement les résultats, planifier les relances et suivre les performances.

Toute l’interface sera en français.

## Navigation principale

J’ajouterai une barre d’onglets horizontale :

1. Session d’appels
2. Base prospects
3. Intégration prospects
4. Journal de prospection
5. Stats

La page d’accueil affichera ou redirigera vers `Session d’appels`.

## Base de données Supabase

Je créerai les tables nécessaires :

- `prospects` : entreprise, ville, effectif, catégorie, offre cible, valeur estimée, étape du cycle, statut, commentaires, données Google Places, prochaine action, etc.
- `contacts` : prénom, nom, rôle, téléphone principal/direct, email, LinkedIn, commentaires, qualification, relié à un prospect.
- `prospection_logs` : date, action, canal, étape, objectif, résultat, notes, prochaine action, date de RDV, lien visio.

L’app étant sans auth pour l’instant, le schéma sera simple et adapté à une application mono-utilisateur. Il restera structuré pour pouvoir ajouter l’auth plus tard.

## Design system

J’appliquerai la palette demandée : terracotta, vert sauge, ocre et neutres.

Règles visuelles :

- fond général `#F7F3EE`
- cartes blanches avec bordure fine `0.5px`, radius `12px`
- aucune ombre, aucun dégradé
- typographie Inter/system-ui
- poids 400 pour le corps, 500 pour titres et labels uniquement
- pas de 600/700
- badges catégorie conformes aux couleurs fournies
- boutons principaux terracotta
- états succès/RDV en vert sauge
- alertes douces en ocre
- tableaux lisibles sur ordinateur avec colonnes compactes
- responsive mobile par repli progressif

## Page 1 — Session d’appels

Je construirai un cockpit d’appel desktop.

Disposition ordinateur :

```text
------------------------------------------------------
Navigation
------------------------------------------------------
Progression session + boutons démarrer / terminer
------------------------------------------------------
| Historique / contexte | Fiche appel principale | Actions rapides |
| derniers logs         | entreprise + contact   | NRP, RDV, etc.  |
| infos utiles          | script + notes         | résumé session  |
------------------------------------------------------
```

Sur mobile, cette disposition passera en une colonne : fiche, actions, historique.

Fonctionnalités :

- bouton `Démarrer une session`
- sélection automatique de jusqu’à 20 prospects selon :
  1. catégorie A, puis B, puis C, puis autres
  2. date de prochaine action la plus ancienne
  3. statut `Chaud` avant `Tiède`
- affichage d’un prospect à la fois
- progression `X/20`
- carte avec :
  - entreprise, ville, effectif, catégorie, offre, valeur estimée
  - bandeau supérieur coloré selon statut
  - contact, rôle, téléphone, email, LinkedIn, horaires, commentaires
  - étape courante et script complet
  - historique des 3 dernières actions
- actions :
  - `NRP`
  - `Pas dispo`
  - `Échange`
  - `RDV obtenu`
  - `Suivant`
- raccourcis clavier :
  - `1` = NRP
  - `2` = Pas dispo
  - `3` = Échange
  - `4` = RDV obtenu
  - `5` = Suivant

Comportement :

- `NRP` : log + horodatage + prospect suivant
- `Pas dispo` : champ `Rappeler le`, sauvegarde date de rappel
- `Échange` : notes + sélecteur prochaine étape, sauvegarde log
- `RDV obtenu` : mini-formulaire date, durée, lien visio optionnel, sauvegarde log et génère un lien Google Calendar prérempli ouvrant dans un nouvel onglet
- `Suivant` : passe sans journaliser

Fin de session : résumé NRP, RDV, échanges, prospects traités.

## Scripts de cycle intégrés

J’intégrerai les scripts J1, J2, J4, J6, J10, J15 et J21 exactement comme fournis, en constantes applicatives typées.

Ils apparaîtront dans un bloc script avec bord gauche ocre.

## Page 2 — Base prospects

Je construirai une vue tableau optimisée ordinateur.

Colonnes :

- Entreprise
- Contact
- Ville
- Catégorie
- Étape
- Statut
- Prochaine action
- Valeur estimée

Filtres :

- statut
- catégorie
- offre cible
- ville / zone

Actions :

- clic sur une ligne → panneau latéral de détail/édition
- bouton `Ajouter un prospect`
- formulaire complet prospect + contact
- helpers :
  - `Rechercher sur Pappers`
  - `Rechercher sur Google`
  - `Rechercher sur LinkedIn`
  - `Enrichir via Google Places`

Google Places :

- utilise `VITE_GOOGLE_PLACES_API_KEY`
- recherche `[entreprise] [ville]`
- préremplit numéro accueil, site web, adresse, horaires, Google Place ID
- affiche un panneau de confirmation avant sauvegarde

Sur mobile, le tableau deviendra une liste de cartes compactes.

## Page 3 — Intégration prospects

Je construirai un wizard 4 étapes avec stepper visuel et panneau récapitulatif persistant à droite sur ordinateur.

Disposition ordinateur :

```text
------------------------------------------------------
Stepper : 1 Recherche > 2 Enrichissement > 3 Contact > 4 Qualification
------------------------------------------------------
| Zone de travail principale                  | Résumé session |
| formulaires, tableaux, cartes entreprises   | entreprises    |
------------------------------------------------------
```

Sur mobile, le résumé passera sous forme de section repliable.

### Étape 1 — Recherche entreprise

Formulaire :

- mot-clé / nom entreprise
- départements multi-select : 07, 26, 38, 42, 69, 01, 73, 74 préremplis
- tranches d’effectifs
- secteur / code NAF
- statut juridique optionnel
- source de recherche au-dessus du bouton de recherche, persistée dans `localStorage`

Sources :

- Pappers API avec `VITE_PAPPERS_API_KEY`
- INSEE Sirene
- Annuaire Entreprises

Indicateur de quota :

- Pappers : `Quota : 100 req/mois gratuites`
- INSEE Sirene : `Gratuit, sans limite`
- Annuaire Entreprises : `Gratuit, sans limite`

Si Pappers renvoie une erreur quota/429 :

- bannière `Quota Pappers atteint — basculer vers une autre source ?`
- boutons `INSEE Sirene` et `Annuaire Entreprises`
- changement de source et relance immédiate sans perdre les filtres

Résultats :

- tableau Nom, Ville, Effectifs, NAF, SIREN, Adresse
- checkbox et bouton `Sélectionner`
- liste de staging en bas
- bouton `Passer à l’étape 2 →`

### Étape 2 — Enrichissement Google Places

Pour chaque entreprise sélectionnée :

- appel automatique Google Places Text Search
- statut `En cours`, `Trouvé`, `Non trouvé`
- si trouvé : champs éditables numéro, site web, adresse, horaires, Google Place ID
- si non trouvé : saisie manuelle
- bouton vers étape 3 activé quand toutes les entreprises ont un statut

### Étape 3 — Recherche de contact

Pour chaque entreprise :

- dirigeants Pappers affichés si disponibles
- bouton `Ajouter comme contact`
- helpers :
  - `Site web → Page équipe`
  - `Google : responsable RH/Sécurité`
  - `Hunter.io : trouver email`
  - `Ajouter contact manuellement`
- Hunter.io : si `VITE_HUNTER_API_KEY` est disponible, appel Domain Search ; sinon ouverture Hunter.io dans un nouvel onglet
- contacts multiples sous forme de chips
- conseils contextualisés par secteur

### Étape 4 — LinkedIn & qualification finale

Pour chaque contact :

- recherche LinkedIn contact
- recherche LinkedIn profil + rôle
- champ LinkedIn URL
- niveau de maturité
- offre cible
- valeur estimée
- catégorie
- commentaires

Avant sauvegarde :

- résumé final par entreprise
- édition de dernière minute
- `Ajouter au PRM` : sauvegarde, initialise J1 et `Tiède`, puis redirige vers la base prospects
- `Sauvegarder et continuer` : sauvegarde puis relance un nouveau batch

## Page 4 — Journal de prospection

Table alimentée automatiquement par les logs.

Colonnes :

- Date
- Entreprise
- Contact
- Canal
- Étape
- Objectif
- Résultat
- Notes
- Date RDV

Filtres :

- semaine
- mois
- canal
- catégorie

Export :

- bouton `Exporter CSV` pour les lignes filtrées.

## Page 5 — Stats

Tableau de bord avec :

- total prospects
- appels passés cette semaine
- taux de pénétration : barrages passés / appels
- taux de RDV
- taux de transformation
- CA potentiel pipeline

Graphique hebdomadaire :

- emails envoyés
- appels passés
- RDV obtenus

## Intégrations API

Cette première version sans auth utilisera les clés publiques demandées :

- `VITE_GOOGLE_PLACES_API_KEY`
- `VITE_PAPPERS_API_KEY`
- `VITE_HUNTER_API_KEY`

Les sources gratuites INSEE Sirene et Annuaire Entreprises seront appelées directement.

L’interface prévoira :

- chargement
- aucun résultat
- erreur API
- clé manquante
- quota Pappers atteint

## Structure technique prévue

Routes TanStack Start :

- `/` ou `/session-appels`
- `/prospects`
- `/integration-prospects`
- `/journal`
- `/stats`

Composants :

- navigation principale
- badges catégorie/statut
- fiche appel
- panneau d’action d’appel
- tableaux filtrables
- panneaux latéraux d’édition
- stepper
- résumé d’intégration
- cartes KPI

Utilitaires :

- priorisation des sessions d’appel
- génération Google Calendar
- export CSV
- mapping des résultats Pappers / INSEE / Annuaire / Google Places / Hunter
- constantes scripts et options métier

## Priorités de mise en œuvre

1. Créer le schéma Supabase et les types applicatifs.
2. Installer le design system global.
3. Construire navigation + routes principales.
4. Construire la Base prospects avec ajout/édition.
5. Construire la Session d’appels desktop-first avec raccourcis clavier.
6. Construire Journal et Stats.
7. Construire le wizard d’intégration et ses appels API.
8. Ajouter les états vides, erreurs, responsive mobile et finitions UX.

## Point clé révisé

L’application sera donc desktop-first, car l’usage principal est sur ordinateur. Le mobile sera supporté comme mode secondaire, avec une interface adaptée mais non prioritaire.
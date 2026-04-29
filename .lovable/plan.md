Voici la revue de l’app et le plan d’amélioration proposé. L’objectif n’est pas de tout reconstruire : la base est bonne, mais il faut rendre l’outil plus fiable, plus orienté “session d’appels réelle”, et plus clair pour un usage quotidien sur ordinateur.

## Diagnostic rapide

### Ce qui est déjà solide
- Les 5 grandes zones sont en place : session d’appels, base prospects, intégration, journal, stats.
- Le modèle de données couvre l’essentiel : prospects, contacts, historiques, imports batch.
- Les appels aux API externes ont été déplacés côté serveur, ce qui est la bonne direction pour protéger les clés.
- L’interface est déjà en français et respecte globalement la direction visuelle demandée.
- L’import Excel a bien injecté une première base, ce qui permet de tester avec de vraies données.

### Points qui semblent moins idéaux aujourd’hui

#### 1. Session d’appels : trop fragile pour un usage quotidien
- Le bouton “Suivant” compte un prospect comme traité même si aucune action n’a été enregistrée.
- “NRP” crée un log, mais ne planifie pas forcément la prochaine relance ni ne fait avancer clairement le cycle.
- “Échange” fait changer l’étape, mais ne force pas une prochaine date d’action.
- “Pas dispo” sauvegarde un rappel, mais le résumé de session ne le compte pas vraiment comme catégorie distincte.
- La carte affiche seulement le premier contact, alors qu’un prospect peut avoir plusieurs contacts.
- Il n’y a pas assez d’aide au choix : “qui appeler maintenant ?”, “pourquoi ce prospect est prioritaire ?”, “quelle est la prochaine meilleure action ?”.

#### 2. Données importées : présentes mais pas assez qualifiées
- Beaucoup de prospects importés depuis Excel ont des champs vides : téléphone, site web, SIREN, secteur, commentaires, prochaine action.
- Certains contacts ou historiques peuvent exister, mais l’interface ne rend pas assez visible la qualité de la donnée.
- La priorité de session est donc mécaniquement moins pertinente : beaucoup de prospects se ressemblent.

#### 3. Base prospects : utile, mais encore trop “table + formulaire”
- Les filtres sont limités : pas de recherche globale entreprise/contact/téléphone/email, pas de filtre “à appeler aujourd’hui”, “sans téléphone”, “sans contact”, “chaud sans prochaine action”.
- Le panneau d’édition ne met en avant qu’un contact principal.
- Il manque une lecture rapide de l’historique complet et de la prochaine action.
- Pas d’action rapide depuis la base : appeler, email, LinkedIn, créer log, enrichir, marquer perdu/converti.

#### 4. Intégration prospects : le batch existe mais le workflow reste lourd
- La logique “mots-clés batch” existe, mais elle est encore trop technique : l’utilisateur doit comprendre source, quota, mots-clés, étape suivante.
- Il manque des modèles de recherche prêts à l’emploi : “industrie Ardèche/Drôme”, “logistique vallée du Rhône”, “médico-social 07/26”, etc.
- Il n’y a pas assez de déduplication visible avant sauvegarde.
- Le staging ne montre pas clairement : déjà en base / nouveau / incomplet / enrichi / à qualifier.
- Le workflow devrait permettre d’importer rapidement un lot, puis d’enrichir progressivement, pas forcément tout compléter avant sauvegarde.

#### 5. API externes : intégrées, mais configuration et erreurs pas assez guidées
- L’app signale parfois qu’une clé manque, mais ne donne pas un guide clair de quoi configurer et ce qui reste utilisable sans clé.
- Les fallbacks Pappers → Annuaire / INSEE → Annuaire sont utiles, mais pas assez visibles dans l’interface.
- Les résultats API ne sont pas historisés de façon exploitable côté UI : on voit le run courant, pas une vraie liste des batches passés.

#### 6. Stats : trop générales pour piloter la prospection
- Les stats actuelles sont correctes mais basiques.
- Il manque les indicateurs utiles pour une formatrice SST freelance :
  - prospects à appeler aujourd’hui,
  - prospects sans téléphone,
  - prospects sans contact identifié,
  - taux de contact utile,
  - RDV obtenus par semaine,
  - valeur pipeline par catégorie/offre,
  - lots importés non encore traités.

#### 7. Architecture et sécurité : acceptable pour mono-utilisateur, mais à surveiller
- Le projet est volontairement sans auth pour l’instant, donc les règles d’accès sont ouvertes. C’est cohérent avec “single user app”, mais il faudra absolument verrouiller si l’app est publiée ou utilisée avec des données sensibles.
- Les types backend générés ont été modifiés précédemment alors qu’ils devraient normalement être automatiques. À corriger si nécessaire pour éviter de futures incohérences.
- Les opérations de données sont majoritairement côté client ; pour une app sans auth c’est simple, mais certaines actions métier gagneraient à être centralisées dans des fonctions serveur : session d’appel, import batch, déduplication.

## Plan d’amélioration proposé

### Étape 1 — Stabiliser la session d’appels
Transformer `/session-appels` en vrai cockpit opérationnel.

À faire :
- Ajouter un état “action en cours” pour éviter les doubles clics et doubles logs.
- Ne compter “traité” que lorsqu’une action est réellement enregistrée, ou distinguer “passé” de “traité”.
- Pour chaque action :
  - NRP : créer un log + proposer automatiquement la prochaine relance selon le cycle.
  - Pas dispo : créer un log + date de rappel obligatoire.
  - Échange : notes obligatoires ou recommandées + prochaine étape + prochaine date.
  - RDV : date obligatoire + passage en “Chaud” + lien calendrier.
  - Suivant : passer sans log, mais ne pas gonfler les stats d’actions.
- Afficher tous les contacts du prospect, avec sélection du contact appelé.
- Afficher pourquoi le prospect est dans la session : catégorie, date de relance, statut, absence de contact, import récent, etc.
- Ajouter des messages de confirmation ou d’erreur en français.

### Étape 2 — Améliorer la priorisation métier
Rendre la liste d’appel plus intelligente.

À faire :
- Prioriser d’abord les prospects avec `next_action_date <= aujourd’hui`.
- Ensuite pondérer : catégorie A/B/C, statut Chaud/Tiède, présence d’un téléphone, présence d’un contact, ancienneté du dernier log.
- Exclure ou reléguer les prospects impossibles à appeler : aucun téléphone prospect ni contact.
- Ajouter des vues rapides :
  - “À appeler aujourd’hui”
  - “À enrichir avant appel”
  - “Chauds à relancer”
  - “Nouveaux imports”

### Étape 3 — Revoir la base prospects
Faire de `/prospects` un écran de pilotage, pas seulement une table.

À faire :
- Ajouter une recherche globale : entreprise, ville, contact, email, téléphone, SIREN.
- Ajouter des filtres utiles :
  - à appeler aujourd’hui,
  - sans téléphone,
  - sans contact,
  - sans prochaine action,
  - par source/import,
  - par catégorie/offre/statut.
- Ajouter des compteurs visibles en haut : total, à appeler, incomplets, chauds, convertis.
- Afficher les signaux de qualité de donnée : téléphone manquant, contact manquant, SIREN manquant, historique absent.
- Dans le panneau de droite :
  - liste complète des contacts,
  - historique récent,
  - boutons rapides : appeler, email, LinkedIn, enrichir, ajouter log.

### Étape 4 — Simplifier l’intégration batch
Faire de `/integration-prospects` un flux plus guidé et moins technique.

À faire :
- Ajouter des presets de batch :
  - “Industrie 07/26”
  - “Logistique vallée du Rhône”
  - “Médico-social Ardèche/Drôme”
  - “BTP local”
  - “Recherche personnalisée”
- Expliquer clairement le rôle du mot-clé : un mot-clé = une recherche ; plusieurs lignes = un lot.
- Afficher un statut par résultat :
  - nouveau,
  - déjà en base,
  - doublon probable,
  - incomplet,
  - enrichi.
- Ajouter sélection multiple : tout sélectionner, sélectionner uniquement les nouveaux, exclure doublons.
- Permettre “sauvegarder en brouillon” plus tôt, sans obliger à compléter tous les contacts.
- Ajouter une page ou section “Batches précédents” basée sur `api_search_runs` / `integration_batches`.

### Étape 5 — Mieux guider la configuration API
Rendre la configuration compréhensible sans jargon technique.

À faire :
- Ajouter un encart “Services connectés” dans l’intégration :
  - Pappers : enrichissement légal / dirigeants,
  - INSEE Sirene : données établissement,
  - Annuaire Entreprises : fallback gratuit,
  - Google Places : téléphone, site, horaires,
  - Hunter.io : recherche email.
- Pour chaque service : afficher “configuré / non configuré / fallback disponible”.
- Quand une clé manque : afficher ce que l’app peut quand même faire.
- Améliorer les messages d’erreur API : quota, clé absente, aucun résultat, service indisponible.

### Étape 6 — Nettoyer et enrichir les données existantes
Exploiter la base importée pour donner un aperçu plus réaliste.

À faire :
- Auditer les prospects importés : combien sans téléphone, sans contact, sans historique, sans prochaine action.
- Ajouter si besoin une action de nettoyage : normalisation villes, catégories, statuts, offres, prochaines dates.
- Marquer clairement les prospects issus d’Excel et ceux issus des recherches API.
- Ajouter un filtre “import Excel” / “API batch”.
- Optionnel : créer une vue “À compléter” pour traiter les fiches incomplètes avant session d’appel.

### Étape 7 — Renforcer le tableau de bord stats
Créer des indicateurs plus actionnables.

À faire :
- Ajouter :
  - appels aujourd’hui / semaine,
  - prospects à appeler aujourd’hui,
  - prospects en retard de relance,
  - prospects sans téléphone,
  - prospects sans contact,
  - RDV obtenus sur 7/30 jours,
  - pipeline par offre,
  - pipeline par catégorie,
  - taux NRP / échange / RDV.
- Ajouter une section “Prochaines actions” avec les 10 relances les plus urgentes.

## Priorité recommandée

Je recommande de commencer par :

1. Session d’appels : fiabilité des actions, contact sélectionnable, prochaine relance automatique.
2. Base prospects : recherche globale, filtres “à appeler / à compléter”, signaux de qualité.
3. Intégration batch : presets, déduplication visible, sauvegarde plus simple.
4. Stats : indicateurs actionnables.
5. Nettoyage de données : audit et normalisation des imports existants.

## Détails techniques

- Garder React + TypeScript + Tailwind + Lovable Cloud.
- Ne pas ajouter d’auth maintenant, conformément au besoin mono-utilisateur, mais préparer le code pour pouvoir verrouiller plus tard.
- Centraliser les règles métier dans `src/lib/prm.ts` ou dans des fonctions serveur dédiées : priorisation, prochaine étape, prochaine date, qualité de donnée.
- Éviter les modifications manuelles des fichiers générés liés au backend.
- Ajouter si nécessaire de petits champs de traçabilité, par exemple `last_contacted_at`, `data_quality_score`, ou `last_log_result`, mais uniquement si cela simplifie vraiment l’UI et les performances.

## Résultat attendu après amélioration

L’app devrait devenir moins “prototype fonctionnel” et plus “outil de travail quotidien” :
- tu démarres une session et sais exactement qui appeler ;
- chaque clic crée une trace fiable ;
- les relances se planifient automatiquement ;
- tu vois immédiatement les fiches à compléter ;
- l’intégration batch devient un assistant de sourcing ;
- les stats te disent quoi faire ensuite, pas seulement ce qui s’est passé.
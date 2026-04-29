Voici le plan de modification pour répondre aux 3 points.

## Objectif

Transformer l’intégration prospects en vrai outil de recherche par batch, brancher les API utiles côté backend, puis importer votre fichier Excel dans la base afin que la session d’appels, la base prospects, le journal et les stats affichent vos données réelles.

## 1. Intégration prospects : rendre le batch clair et utilisable

### Ce qui va changer côté interface

La page **Intégration prospects** deviendra un outil de batch avec :

- Un champ **Mots-clés batch** où vous pourrez saisir plusieurs recherches, une par ligne.
  - Exemple :
    ```text
    industrie annonay
    logistique valence
    ehpad ardèche
    responsable qhse drôme
    ```
- Des filtres communs au batch : départements, tranche d’effectif, secteur, statut juridique, nombre max de résultats par mot-clé.
- Une prévisualisation du batch :
  - nombre de mots-clés,
  - source utilisée,
  - résultats par mot-clé,
  - doublons détectés par SIREN ou nom + ville.
- Un tableau de staging plus lisible :
  - mot-clé d’origine,
  - source d’origine,
  - entreprise,
  - ville,
  - effectif,
  - SIREN,
  - NAF,
  - score / pertinence si disponible,
  - bouton sélectionner / ignorer.

### Comportement attendu

Au lieu d’une seule recherche, le bouton deviendra :

- **Lancer le batch** : exécute chaque mot-clé avec les filtres choisis.
- **Ajouter les résultats sélectionnés** : place les sociétés dans l’étape d’enrichissement.
- **Relancer les erreurs** : utile si une API répond mal ou si un quota est atteint.

Le mot-clé servira donc à segmenter le batch : il ne sera pas un simple champ isolé, mais la base d’une série de recherches successives.

## 2. API Pappers, Sirene, Annuaire Entreprises et autres API utiles

### Architecture prévue

Je déplacerai les appels API dans des fonctions backend TanStack Start, pour éviter d’exposer les clés privées dans le navigateur.

Les appels côté navigateur actuels seront remplacés par :

```text
Interface React
  -> fonctions backend sécurisées
    -> API Pappers / INSEE Sirene / Annuaire Entreprises / Google Places / Hunter si configuré
  -> résultats normalisés
  -> staging dans le wizard
```

### Sources entreprises

Je prévois 3 connecteurs logiques :

1. **Annuaire Entreprises**
   - Recherche d’entreprises françaises.
   - Bonne source gratuite pour démarrer.
   - Utilisable sans clé si l’endpoint public suffit.

2. **INSEE Sirene**
   - Recherche officielle par raison sociale, SIREN/SIRET, code NAF, commune, département.
   - Si la version utilisée nécessite un jeton, l’app affichera un message clair et utilisera l’Annuaire en fallback.

3. **Pappers**
   - Recherche entreprise enrichie avec dirigeants / représentants quand disponible.
   - Nécessite une clé API Pappers.
   - La clé sera demandée et stockée en secret backend, pas dans le code frontend.

### Enrichissement après sélection

Je brancherai ensuite les étapes suivantes :

- **Google Places** pour téléphone, adresse, site web, horaires, place ID.
  - Cette API nécessite une clé Google Places.
  - Vu que Google Places peut poser des contraintes CORS, l’appel passera aussi par le backend.
- **Hunter.io** pour enrichissement email, si vous avez une clé Hunter.
  - Sinon l’interface gardera les boutons d’aide manuelle Google / LinkedIn / site web.

### Gestion des clés API

Les clés nécessaires seront :

- `PAPPERS_API_KEY` pour Pappers,
- éventuellement `SIRENE_API_KEY` si l’API Sirene retenue exige un token,
- `GOOGLE_PLACES_API_KEY` pour Google Places,
- `HUNTER_API_KEY` pour Hunter.io.

Je ne les mettrai pas dans le frontend. Si elles ne sont pas déjà disponibles, je prévoirai une étape où Lovable vous demandera de les renseigner de manière sécurisée.

### Si une API n’est pas encore configurée

L’app ne bloquera pas tout le process. Elle affichera :

- source indisponible,
- raison claire : clé absente, quota atteint, erreur API,
- action proposée : basculer vers Annuaire / INSEE, ou continuer en saisie manuelle.

## 3. Import de votre fichier Excel

J’ai commencé à analyser le fichier **Stratégie_de_prospection.xlsx**. Le parseur montre surtout les onglets de stratégie, objectifs et catégories, mais l’extraction textuelle ne révèle pas encore clairement une table complète de contacts et d’historique.

Une fois le plan approuvé, je traiterai le fichier directement avec un script Excel afin de lire les vrais onglets, colonnes et lignes, pas seulement l’aperçu textuel.

### Données à importer

Je vais détecter et importer autant que possible :

- sociétés / prospects,
- contacts associés,
- téléphone,
- email,
- rôle,
- ville,
- catégorie A/B/C/récurrent/exceptionnel,
- offre cible,
- valeur estimée,
- statut / niveau de maturité,
- étape J1 à J21,
- prochaines actions,
- historique d’appels / emails / RDV si présent.

### Correspondance vers l’app

Les données seront insérées dans les tables existantes :

- `prospects` pour les entreprises,
- `contacts` pour les interlocuteurs,
- `prospection_logs` pour l’historique.

Les imports éviteront les doublons autant que possible avec une logique :

- SIREN si présent,
- sinon nom d’entreprise + ville,
- puis rattachement des contacts à l’entreprise trouvée.

### Résultat visible après import

Après import, vous devriez voir :

- vos prospects dans **Base prospects**,
- les contacts dans les fiches entreprise,
- les actions passées dans **Journal de prospection**,
- les prospects prioritaires dans **Session d’appels**,
- les indicateurs actualisés dans **Stats**.

## 4. Ajustements de données nécessaires

Le modèle actuel a déjà les bonnes tables principales. Je prévois seulement d’ajouter quelques champs utiles au batch et à l’import si nécessaire :

- `batch_keyword` ou équivalent pour savoir de quel mot-clé vient une entreprise,
- `external_source_id` pour tracer l’identifiant API,
- `import_source` / `import_batch_id` pour distinguer les données venues du fichier Excel ou d’une recherche API,
- éventuellement une table légère `api_search_runs` pour historiser les recherches batch, erreurs, quotas et résultats.

Ces changements seront faits par migration, avec les règles de sécurité existantes adaptées au mode mono-utilisateur sans auth.

## 5. Points techniques

- Les appels aux API privées seront faits côté backend via server functions, pas directement dans React.
- Les résultats des différentes APIs seront normalisés dans un même format interne `CompanySearchResult`.
- Le batch sera asynchrone côté interface : chaque mot-clé pourra avoir son statut `en attente`, `en cours`, `terminé`, `erreur`.
- Le fichier Excel sera importé via script ponctuel dans la base, puis les données seront visibles dans l’app.
- Je conserverai le style actuel : interface française, desktop-first, cartes blanches, bordures fines, pas d’ombres ni gradients.

## 6. Ce que je ferai après approbation

1. Lire précisément les onglets et colonnes du fichier Excel avec un script dédié.
2. Préparer le mapping Excel → prospects / contacts / historique.
3. Ajouter les champs/tables nécessaires au suivi des batches si besoin.
4. Créer les fonctions backend de recherche API et enrichissement.
5. Remplacer le faux batch actuel par un vrai batch multi-mots-clés.
6. Importer vos données Excel dans la base.
7. Vérifier que les données apparaissent dans Base prospects, Session d’appels et Journal.